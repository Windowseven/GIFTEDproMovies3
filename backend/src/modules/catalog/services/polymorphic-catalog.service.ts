import { Inject, Injectable } from "@nestjs/common";
import { DRIZZLE_DATABASE } from "../../../infrastructure/database/database.tokens.js";
import type { ApplicationDatabase } from "../../../infrastructure/database/database.module.js";
import { CatalogRepository } from "../repositories/catalog.repository.js";
import { AuditService } from "../../audit/audit.service.js";
import {
  InvalidContentTypeException,
  InvalidHierarchyException,
  ContentNotFoundException,
  SlugCollisionException,
} from "../catalog.errors.js";
import type { CreateContentDto } from "../dto/create-content.dto.js";
import type { UpdateContentDto } from "../dto/update-content.dto.js";
import type { CreateMovieEditionDto } from "../dto/create-movie-edition.dto.js";
import type { UpdateMovieEditionDto } from "../dto/update-movie-edition.dto.js";
import type { CreateSeriesMetadataDto } from "../dto/create-series-metadata.dto.js";
import type { CreateSeasonDto } from "../dto/create-season.dto.js";
import type { CreateEpisodeDto } from "../dto/create-episode.dto.js";
import type { UpdateEpisodeDto } from "../dto/update-episode.dto.js";
import type { ContentRecord } from "../../../infrastructure/database/schemas/content.schema.js";
import type { MovieEditionRecord } from "../../../infrastructure/database/schemas/movie-editions.schema.js";
import type { SeriesMetadataRecord } from "../../../infrastructure/database/schemas/series-metadata.schema.js";
import type { SeasonRecord } from "../../../infrastructure/database/schemas/seasons.schema.js";
import type { EpisodeRecord } from "../../../infrastructure/database/schemas/episodes.schema.js";

@Injectable()
export class PolymorphicCatalogService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
    private readonly repository: CatalogRepository,
    private readonly audit: AuditService,
  ) {}

  // =========================================================================
  // CONTENT MANAGEMENT
  // =========================================================================

  async createContent(
    dto: CreateContentDto,
    actorId: string,
  ): Promise<ContentRecord> {
    return await this.db.transaction(async (tx) => {
      const existingSlug = await this.repository.findContentBySlug(tx, dto.slug);
      if (existingSlug) {
        throw new SlugCollisionException("A catalog item with this slug already exists.");
      }

      const codeId = await this.repository.generateUniqueCodeId(tx);

      const content = await this.repository.insertContent(tx, {
        codeId,
        contentType: dto.contentType,
        title: dto.title,
        originalTitle: dto.originalTitle ?? null,
        slug: dto.slug,
        releaseYear: dto.releaseYear ?? null,
        durationMinutes: dto.durationMinutes ?? null,
        description: dto.description ?? null,
        posterUrl: dto.posterUrl ?? null,
        backdropUrl: dto.backdropUrl ?? null,
        trailerUrl: dto.trailerUrl ?? null,
        isFeatured: dto.isFeatured ?? false,
        isTrending: dto.isTrending ?? false,
        status: "draft",
        createdBy: actorId,
      });

      if (dto.categoryIds && dto.categoryIds.length > 0) {
        await this.repository.syncCategories(tx, content.id, dto.categoryIds);
      }

      if (dto.countryIds && dto.countryIds.length > 0) {
        await this.repository.syncCountries(tx, content.id, dto.countryIds);
      }

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "CONTENT_CREATE",
        resourceType: "content",
        resourceId: content.id,
        metadata: {
          contentType: content.contentType,
          slug: content.slug,
          codeId: content.codeId,
        },
        failClosed: true,
      });

      return content;
    });
  }

  async updateContentMetadata(
    contentId: string,
    dto: UpdateContentDto,
    actorId: string,
  ): Promise<ContentRecord> {
    return await this.db.transaction(async (tx) => {
      const locked = await this.repository.lockContentForUpdate(tx, contentId);
      if (!locked) {
        throw new ContentNotFoundException("The requested catalog item was not found.");
      }

      if (dto.slug && dto.slug.toLowerCase() !== locked.slug.toLowerCase()) {
        const slugConflict = await this.repository.findContentBySlug(tx, dto.slug);
        if (slugConflict && slugConflict.id !== contentId) {
          throw new SlugCollisionException("A catalog item with this slug already exists.");
        }
      }

      // NOTE: contentType is strictly excluded from update payload to guarantee immutability
      const updated = await this.repository.updateContent(tx, contentId, {
        title: dto.title ?? locked.title,
        originalTitle: dto.originalTitle !== undefined ? dto.originalTitle : locked.originalTitle,
        slug: dto.slug ?? locked.slug,
        releaseYear: dto.releaseYear !== undefined ? dto.releaseYear : locked.releaseYear,
        durationMinutes: dto.durationMinutes !== undefined ? dto.durationMinutes : locked.durationMinutes,
        description: dto.description !== undefined ? dto.description : locked.description,
        posterUrl: dto.posterUrl !== undefined ? dto.posterUrl : locked.posterUrl,
        backdropUrl: dto.backdropUrl !== undefined ? dto.backdropUrl : locked.backdropUrl,
        trailerUrl: dto.trailerUrl !== undefined ? dto.trailerUrl : locked.trailerUrl,
        isFeatured: dto.isFeatured !== undefined ? dto.isFeatured : locked.isFeatured,
        isTrending: dto.isTrending !== undefined ? dto.isTrending : locked.isTrending,
      });

      if (dto.categoryIds !== undefined) {
        await this.repository.syncCategories(tx, contentId, dto.categoryIds);
      }

      if (dto.countryIds !== undefined) {
        await this.repository.syncCountries(tx, contentId, dto.countryIds);
      }

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "CONTENT_METADATA_UPDATE",
        resourceType: "content",
        resourceId: contentId,
        metadata: {
          title: updated.title,
          slug: updated.slug,
        },
        failClosed: true,
      });

      return updated;
    });
  }

  // =========================================================================
  // MOVIE EDITIONS (Strict Polymorphic Enforcement)
  // =========================================================================

  async attachMovieEdition(
    movieId: string,
    dto: CreateMovieEditionDto,
    actorId: string,
  ): Promise<MovieEditionRecord> {
    return await this.db.transaction(async (tx) => {
      // Canonical lock order: content FOR UPDATE -> movie_editions FOR UPDATE ORDER BY id ASC
      const content = await this.repository.lockContentForUpdate(tx, movieId);
      if (!content) {
        throw new ContentNotFoundException("Movie not found");
      }

      if (content.contentType !== "movie") {
        throw new InvalidContentTypeException("Cannot attach movie edition to series content");
      }

      // If new edition is marked as default, lock all editions for movie and demote existing default
      if (dto.isDefault) {
        const existingEditions = await this.repository.lockMovieEditionsForUpdate(tx, movieId);
        for (const edition of existingEditions) {
          if (edition.isDefault) {
            await this.repository.updateMovieEdition(tx, edition.id, { isDefault: false });
          }
        }
      }

      const edition = await this.repository.insertMovieEdition(tx, {
        movieId,
        djId: dto.djId,
        streamingFileKey: dto.streamingFileKey ?? null,
        downloadFileKey: dto.downloadFileKey ?? null,
        streamingStatus: dto.streamingStatus ?? "pending",
        downloadStatus: dto.downloadStatus ?? "pending",
        isDefault: dto.isDefault ?? false,
        isAvailable: dto.isAvailable ?? true,
      });

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "MOVIE_EDITION_CREATE",
        resourceType: "movie_edition",
        resourceId: edition.id,
        metadata: {
          movieId,
          djId: edition.djId,
          isDefault: edition.isDefault,
        },
        failClosed: true,
      });

      return edition;
    });
  }

  async updateMovieEdition(
    movieId: string,
    editionId: string,
    dto: UpdateMovieEditionDto,
    actorId: string,
  ): Promise<MovieEditionRecord> {
    return await this.db.transaction(async (tx) => {
      // Canonical lock order: content FOR UPDATE -> movie_editions FOR UPDATE
      const content = await this.repository.lockContentForUpdate(tx, movieId);
      if (!content) {
        throw new ContentNotFoundException("Movie not found");
      }

      if (content.contentType !== "movie") {
        throw new InvalidContentTypeException("Target content is not a movie");
      }

      const edition = await this.repository.lockMovieEditionForUpdate(tx, editionId);
      if (!edition || edition.movieId !== movieId) {
        throw new ContentNotFoundException("Movie edition not found on specified movie");
      }

      const updated = await this.repository.updateMovieEdition(tx, editionId, {
        streamingFileKey: dto.streamingFileKey !== undefined ? dto.streamingFileKey : edition.streamingFileKey,
        downloadFileKey: dto.downloadFileKey !== undefined ? dto.downloadFileKey : edition.downloadFileKey,
        streamingStatus: dto.streamingStatus ?? edition.streamingStatus,
        downloadStatus: dto.downloadStatus ?? edition.downloadStatus,
        isAvailable: dto.isAvailable !== undefined ? dto.isAvailable : edition.isAvailable,
      });

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "MOVIE_EDITION_UPDATE",
        resourceType: "movie_edition",
        resourceId: editionId,
        metadata: {
          movieId,
          streamingStatus: updated.streamingStatus,
          downloadStatus: updated.downloadStatus,
          isAvailable: updated.isAvailable,
        },
        failClosed: true,
      });

      return updated;
    });
  }

  async repointDefaultEdition(
    movieId: string,
    targetEditionId: string,
    actorId: string,
  ): Promise<MovieEditionRecord> {
    return await this.db.transaction(async (tx) => {
      // Canonical lock order: content FOR UPDATE -> movie_editions FOR UPDATE ORDER BY id ASC
      const content = await this.repository.lockContentForUpdate(tx, movieId);
      if (!content) {
        throw new ContentNotFoundException("Movie not found");
      }

      if (content.contentType !== "movie") {
        throw new InvalidContentTypeException("Target content is not a movie");
      }

      const editions = await this.repository.lockMovieEditionsForUpdate(tx, movieId);
      const target = editions.find((e) => e.id === targetEditionId);
      if (!target) {
        throw new ContentNotFoundException("Target edition not found for this movie");
      }

      for (const edition of editions) {
        if (edition.isDefault && edition.id !== targetEditionId) {
          await this.repository.updateMovieEdition(tx, edition.id, {
            isDefault: false,
          });
        }
      }

      await this.repository.updateMovieEdition(tx, targetEditionId, {
        isDefault: true,
        isAvailable: true,
      });

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "MOVIE_DEFAULT_EDITION_CHANGE",
        resourceType: "movie_edition",
        resourceId: targetEditionId,
        metadata: {
          movieId,
          previousDefaultId: editions.find((e) => e.isDefault)?.id ?? null,
          newDefaultId: targetEditionId,
        },
        failClosed: true,
      });

      return {
        ...target,
        isDefault: true,
        isAvailable: true,
      };
    });
  }

  // =========================================================================
  // SERIES METADATA, SEASONS & EPISODES (Strict Polymorphic Enforcement)
  // =========================================================================

  async attachSeriesMetadata(
    seriesId: string,
    dto: CreateSeriesMetadataDto,
    actorId: string,
  ): Promise<SeriesMetadataRecord> {
    return await this.db.transaction(async (tx) => {
      const content = await this.repository.lockContentForKeyShare(tx, seriesId);
      if (!content) {
        throw new ContentNotFoundException("Series not found");
      }

      if (content.contentType !== "series") {
        throw new InvalidContentTypeException("Cannot attach series metadata to movie content");
      }

      const meta = await this.repository.upsertSeriesMetadata(tx, seriesId, dto.leadDjId);

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "CONTENT_METADATA_UPDATE",
        resourceType: "series_metadata",
        resourceId: seriesId,
        metadata: {
          leadDjId: meta.leadDjId,
        },
        failClosed: true,
      });

      return meta;
    });
  }

  async createSeason(
    seriesId: string,
    dto: CreateSeasonDto,
    actorId: string,
  ): Promise<SeasonRecord> {
    return await this.db.transaction(async (tx) => {
      const content = await this.repository.lockContentForKeyShare(tx, seriesId);
      if (!content) {
        throw new ContentNotFoundException("Series not found");
      }

      if (content.contentType !== "series") {
        throw new InvalidContentTypeException("Cannot create season for movie content");
      }

      const season = await this.repository.insertSeason(tx, {
        seriesId,
        seasonNumber: dto.seasonNumber,
        title: dto.title ?? `Season ${dto.seasonNumber}`,
        isActive: dto.isActive ?? true,
      });

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "SEASON_CREATE",
        resourceType: "season",
        resourceId: season.id,
        metadata: {
          seriesId,
          seasonNumber: season.seasonNumber,
        },
        failClosed: true,
      });

      return season;
    });
  }

  async attachEpisode(
    seasonId: string,
    dto: CreateEpisodeDto,
    actorId: string,
  ): Promise<EpisodeRecord> {
    return await this.db.transaction(async (tx) => {
      // Step 1: Non-locking discovery probe to identify candidate series
      const candidateSeriesId = await this.repository.probeSeasonSeriesId(seasonId);
      if (!candidateSeriesId) {
        throw new ContentNotFoundException("Season not found");
      }

      // Step 2: Acquire Level 1 lock on parent content (Series)
      const content = await this.repository.lockContentForKeyShare(tx, candidateSeriesId);
      if (!content) {
        throw new ContentNotFoundException("Series not found");
      }

      // Step 3: Acquire Level 2 lock on parent season
      const season = await this.repository.lockSeasonForKeyShare(tx, seasonId);
      if (!season) {
        throw new ContentNotFoundException("Season not found");
      }

      // Step 4: Authoritative Post-Lock Validation on locked rows
      if (content.contentType !== "series") {
        throw new InvalidContentTypeException("Cannot attach episode to non-series content");
      }

      if (season.seriesId !== content.id) {
        throw new InvalidHierarchyException("Season does not belong to the locked series");
      }

      // Step 5: Insert episode (Level 3)
      const episode = await this.repository.insertEpisode(tx, {
        seasonId,
        episodeNumber: dto.episodeNumber,
        title: dto.title,
        durationMinutes: dto.durationMinutes ?? null,
        description: dto.description ?? null,
        thumbnailUrl: dto.thumbnailUrl ?? null,
        djId: dto.djId ?? null,
        streamingFileKey: dto.streamingFileKey ?? null,
        downloadFileKey: dto.downloadFileKey ?? null,
        streamingStatus: dto.streamingStatus ?? "pending",
        downloadStatus: dto.downloadStatus ?? "pending",
        isAvailable: dto.isAvailable ?? true,
        status: dto.status ?? "draft",
      });

      // Step 6: In-transaction mandatory audit record
      await this.audit.recordEvent({
        tx,
        actorId,
        action: "EPISODE_ATTACH",
        resourceType: "episode",
        resourceId: episode.id,
        metadata: {
          seasonId,
          seriesId: content.id,
          episodeNumber: episode.episodeNumber,
        },
        failClosed: true,
      });

      return episode;
    });
  }

  async updateEpisode(
    seasonId: string,
    episodeId: string,
    dto: UpdateEpisodeDto,
    actorId: string,
  ): Promise<EpisodeRecord> {
    return await this.db.transaction(async (tx) => {
      const candidateSeriesId = await this.repository.probeSeasonSeriesId(seasonId);
      if (!candidateSeriesId) {
        throw new ContentNotFoundException("Season not found");
      }

      const content = await this.repository.lockContentForKeyShare(tx, candidateSeriesId);
      if (!content || content.contentType !== "series") {
        throw new InvalidContentTypeException("Invalid series hierarchy");
      }

      const season = await this.repository.lockSeasonForKeyShare(tx, seasonId);
      if (!season || season.seriesId !== content.id) {
        throw new InvalidHierarchyException("Season does not belong to the series");
      }

      const episode = await this.repository.lockEpisodeForUpdate(tx, episodeId);
      if (!episode || episode.seasonId !== seasonId) {
        throw new ContentNotFoundException("Episode not found in season");
      }

      const updated = await this.repository.updateEpisode(tx, episodeId, {
        title: dto.title ?? episode.title,
        durationMinutes: dto.durationMinutes !== undefined ? dto.durationMinutes : episode.durationMinutes,
        description: dto.description !== undefined ? dto.description : episode.description,
        thumbnailUrl: dto.thumbnailUrl !== undefined ? dto.thumbnailUrl : episode.thumbnailUrl,
        djId: dto.djId !== undefined ? dto.djId : episode.djId,
        streamingFileKey: dto.streamingFileKey !== undefined ? dto.streamingFileKey : episode.streamingFileKey,
        downloadFileKey: dto.downloadFileKey !== undefined ? dto.downloadFileKey : episode.downloadFileKey,
        streamingStatus: dto.streamingStatus ?? episode.streamingStatus,
        downloadStatus: dto.downloadStatus ?? episode.downloadStatus,
        isAvailable: dto.isAvailable !== undefined ? dto.isAvailable : episode.isAvailable,
        status: dto.status ?? episode.status,
      });

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "EPISODE_AVAILABILITY_CHANGE",
        resourceType: "episode",
        resourceId: episodeId,
        metadata: {
          seasonId,
          seriesId: content.id,
          isAvailable: updated.isAvailable,
          status: updated.status,
        },
        failClosed: true,
      });

      return updated;
    });
  }
}
