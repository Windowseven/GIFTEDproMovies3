import { Inject, Injectable } from "@nestjs/common";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { randomInt } from "node:crypto";
import { DRIZZLE_DATABASE } from "../../../infrastructure/database/database.tokens.js";
import type {
  ApplicationDatabase,
  DatabaseClient,
} from "../../../infrastructure/database/database.module.js";
import {
  contentTable,
  type ContentRecord,
  type NewContentRecord,
} from "../../../infrastructure/database/schemas/content.schema.js";
import {
  movieEditionsTable,
  type MovieEditionRecord,
  type NewMovieEditionRecord,
} from "../../../infrastructure/database/schemas/movie-editions.schema.js";
import {
  seriesMetadataTable,
  type SeriesMetadataRecord,
} from "../../../infrastructure/database/schemas/series-metadata.schema.js";
import {
  seasonsTable,
  type SeasonRecord,
  type NewSeasonRecord,
} from "../../../infrastructure/database/schemas/seasons.schema.js";
import {
  episodesTable,
  type EpisodeRecord,
  type NewEpisodeRecord,
} from "../../../infrastructure/database/schemas/episodes.schema.js";
import {
  contentCategoriesTable,
  contentCountriesTable,
} from "../../../infrastructure/database/schemas/content-taxonomies.schema.js";
import {
  contentReviewNotesTable,
  type ContentReviewNoteRecord,
} from "../../../infrastructure/database/schemas/content-review-notes.schema.js";

@Injectable()
export class CatalogRepository {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
  ) {}

  // =========================================================================
  // CANONICAL LOCKING PRIMITIVES (PostgreSQL Row-Level Locks)
  // =========================================================================

  /**
   * Locks parent content row FOR UPDATE.
   * Serializes lifecycle transitions, status updates, and edition state mutations.
   */
  async lockContentForUpdate(
    tx: DatabaseClient,
    contentId: string,
  ): Promise<ContentRecord | null> {
    const rows = await tx
      .select()
      .from(contentTable)
      .where(eq(contentTable.id, contentId))
      .for("update");

    return rows[0] ?? null;
  }

  /**
   * Locks parent content row FOR KEY SHARE.
   * Protects parent against deletion or PK mutation while permitting concurrent child insertions.
   */
  async lockContentForKeyShare(
    tx: DatabaseClient,
    contentId: string,
  ): Promise<ContentRecord | null> {
    const rows = await tx
      .select()
      .from(contentTable)
      .where(eq(contentTable.id, contentId))
      .for("key share");

    return rows[0] ?? null;
  }

  /**
   * Locks all movie editions for a movie row FOR UPDATE ordered deterministically by primary key.
   * Enforces canonical order: content FOR UPDATE -> movie_editions FOR UPDATE ORDER BY id ASC.
   */
  async lockMovieEditionsForUpdate(
    tx: DatabaseClient,
    movieId: string,
  ): Promise<MovieEditionRecord[]> {
    return await tx
      .select()
      .from(movieEditionsTable)
      .where(eq(movieEditionsTable.movieId, movieId))
      .orderBy(asc(movieEditionsTable.id))
      .for("update");
  }

  /**
   * Locks a specific movie edition FOR UPDATE.
   */
  async lockMovieEditionForUpdate(
    tx: DatabaseClient,
    editionId: string,
  ): Promise<MovieEditionRecord | null> {
    const rows = await tx
      .select()
      .from(movieEditionsTable)
      .where(eq(movieEditionsTable.id, editionId))
      .for("update");

    return rows[0] ?? null;
  }

  /**
   * Locks default movie edition FOR KEY SHARE.
   * Used during publication readiness check to verify media readiness without blocking concurrent reads.
   */
  async lockDefaultEditionForKeyShare(
    tx: DatabaseClient,
    movieId: string,
  ): Promise<MovieEditionRecord | null> {
    const rows = await tx
      .select()
      .from(movieEditionsTable)
      .where(
        and(
          eq(movieEditionsTable.movieId, movieId),
          eq(movieEditionsTable.isDefault, true),
        ),
      )
      .for("key share");

    return rows[0] ?? null;
  }

  /**
   * Locks season row FOR KEY SHARE.
   * Protects season from deletion while child episode is being attached.
   */
  async lockSeasonForKeyShare(
    tx: DatabaseClient,
    seasonId: string,
  ): Promise<SeasonRecord | null> {
    const rows = await tx
      .select()
      .from(seasonsTable)
      .where(eq(seasonsTable.id, seasonId))
      .for("key share");

    return rows[0] ?? null;
  }

  /**
   * Locks season row FOR UPDATE.
   */
  async lockSeasonForUpdate(
    tx: DatabaseClient,
    seasonId: string,
  ): Promise<SeasonRecord | null> {
    const rows = await tx
      .select()
      .from(seasonsTable)
      .where(eq(seasonsTable.id, seasonId))
      .for("update");

    return rows[0] ?? null;
  }

  /**
   * Locks episode row FOR UPDATE.
   */
  async lockEpisodeForUpdate(
    tx: DatabaseClient,
    episodeId: string,
  ): Promise<EpisodeRecord | null> {
    const rows = await tx
      .select()
      .from(episodesTable)
      .where(eq(episodesTable.id, episodeId))
      .for("update");

    return rows[0] ?? null;
  }

  /**
   * Non-locking probe to discover parent series ID from season ID.
   * NOTE: This probe is NEVER authoritative. The locked row must be authoritatively re-read.
   */
  async probeSeasonSeriesId(seasonId: string): Promise<string | null> {
    const rows = await this.db
      .select({ seriesId: seasonsTable.seriesId })
      .from(seasonsTable)
      .where(eq(seasonsTable.id, seasonId))
      .limit(1);

    return rows[0]?.seriesId ?? null;
  }

  // =========================================================================
  // CONTENT CRUD & QUERIES
  // =========================================================================

  async findContentById(
    client: DatabaseClient,
    id: string,
  ): Promise<ContentRecord | null> {
    const rows = await client
      .select()
      .from(contentTable)
      .where(eq(contentTable.id, id))
      .limit(1);

    return rows[0] ?? null;
  }

  async findContentBySlug(
    client: DatabaseClient,
    slug: string,
  ): Promise<ContentRecord | null> {
    const rows = await client
      .select()
      .from(contentTable)
      .where(sql`lower(${contentTable.slug}) = lower(${slug})`)
      .limit(1);

    return rows[0] ?? null;
  }

  async generateUniqueCodeId(client: DatabaseClient): Promise<string> {
    for (let attempts = 0; attempts < 10; attempts++) {
      const codeId = `#GF-${randomInt(1000, 99999)}`;
      const existing = await client
        .select({ id: contentTable.id })
        .from(contentTable)
        .where(eq(contentTable.codeId, codeId))
        .limit(1);

      if (existing.length === 0) {
        return codeId;
      }
    }
    return `#GF-${Date.now().toString().slice(-6)}`;
  }

  async insertContent(
    client: DatabaseClient,
    data: NewContentRecord,
  ): Promise<ContentRecord> {
    const rows = await client.insert(contentTable).values(data).returning();
    return rows[0]!;
  }

  async updateContent(
    client: DatabaseClient,
    id: string,
    data: Partial<NewContentRecord>,
  ): Promise<ContentRecord> {
    const rows = await client
      .update(contentTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(contentTable.id, id))
      .returning();

    return rows[0]!;
  }

  async deleteContent(client: DatabaseClient, id: string): Promise<void> {
    await client.delete(contentTable).where(eq(contentTable.id, id));
  }

  // =========================================================================
  // CONTENT TAXONOMY JUNCTIONS
  // =========================================================================

  async syncCategories(
    client: DatabaseClient,
    contentId: string,
    categoryIds: string[],
  ): Promise<void> {
    await client
      .delete(contentCategoriesTable)
      .where(eq(contentCategoriesTable.contentId, contentId));

    if (categoryIds.length > 0) {
      await client.insert(contentCategoriesTable).values(
        categoryIds.map((categoryId) => ({
          contentId,
          categoryId,
        })),
      );
    }
  }

  async syncCountries(
    client: DatabaseClient,
    contentId: string,
    countryIds: string[],
  ): Promise<void> {
    await client
      .delete(contentCountriesTable)
      .where(eq(contentCountriesTable.contentId, contentId));

    if (countryIds.length > 0) {
      await client.insert(contentCountriesTable).values(
        countryIds.map((countryId) => ({
          contentId,
          countryId,
        })),
      );
    }
  }

  async countCategories(client: DatabaseClient, contentId: string): Promise<number> {
    const rows = await client
      .select({ count: count() })
      .from(contentCategoriesTable)
      .where(eq(contentCategoriesTable.contentId, contentId));

    return Number(rows[0]?.count ?? 0);
  }

  async countCountries(client: DatabaseClient, contentId: string): Promise<number> {
    const rows = await client
      .select({ count: count() })
      .from(contentCountriesTable)
      .where(eq(contentCountriesTable.contentId, contentId));

    return Number(rows[0]?.count ?? 0);
  }

  // =========================================================================
  // MOVIE EDITIONS
  // =========================================================================

  async insertMovieEdition(
    client: DatabaseClient,
    data: NewMovieEditionRecord,
  ): Promise<MovieEditionRecord> {
    const rows = await client.insert(movieEditionsTable).values(data).returning();
    return rows[0]!;
  }

  async updateMovieEdition(
    client: DatabaseClient,
    id: string,
    data: Partial<NewMovieEditionRecord>,
  ): Promise<MovieEditionRecord> {
    const rows = await client
      .update(movieEditionsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(movieEditionsTable.id, id))
      .returning();

    return rows[0]!;
  }

  async findMovieEditions(
    client: DatabaseClient,
    movieId: string,
  ): Promise<MovieEditionRecord[]> {
    return await client
      .select()
      .from(movieEditionsTable)
      .where(eq(movieEditionsTable.movieId, movieId))
      .orderBy(asc(movieEditionsTable.createdAt));
  }

  async findDefaultEdition(
    client: DatabaseClient,
    movieId: string,
  ): Promise<MovieEditionRecord | null> {
    const rows = await client
      .select()
      .from(movieEditionsTable)
      .where(
        and(
          eq(movieEditionsTable.movieId, movieId),
          eq(movieEditionsTable.isDefault, true),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  // =========================================================================
  // SERIES METADATA, SEASONS & EPISODES
  // =========================================================================

  async findSeriesMetadata(
    client: DatabaseClient,
    seriesId: string,
  ): Promise<SeriesMetadataRecord | null> {
    const rows = await client
      .select()
      .from(seriesMetadataTable)
      .where(eq(seriesMetadataTable.contentId, seriesId))
      .limit(1);

    return rows[0] ?? null;
  }

  async upsertSeriesMetadata(
    client: DatabaseClient,
    seriesId: string,
    leadDjId: string,
  ): Promise<SeriesMetadataRecord> {
    const existing = await this.findSeriesMetadata(client, seriesId);
    if (existing) {
      const rows = await client
        .update(seriesMetadataTable)
        .set({ leadDjId, updatedAt: new Date() })
        .where(eq(seriesMetadataTable.contentId, seriesId))
        .returning();
      return rows[0]!;
    }

    const rows = await client
      .insert(seriesMetadataTable)
      .values({ contentId: seriesId, leadDjId })
      .returning();
    return rows[0]!;
  }

  async insertSeason(
    client: DatabaseClient,
    data: NewSeasonRecord,
  ): Promise<SeasonRecord> {
    const rows = await client.insert(seasonsTable).values(data).returning();
    return rows[0]!;
  }

  async findSeasonByNumber(
    client: DatabaseClient,
    seriesId: string,
    seasonNumber: number,
  ): Promise<SeasonRecord | null> {
    const rows = await client
      .select()
      .from(seasonsTable)
      .where(
        and(
          eq(seasonsTable.seriesId, seriesId),
          eq(seasonsTable.seasonNumber, seasonNumber),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async findSeasons(
    client: DatabaseClient,
    seriesId: string,
  ): Promise<SeasonRecord[]> {
    return await client
      .select()
      .from(seasonsTable)
      .where(eq(seasonsTable.seriesId, seriesId))
      .orderBy(asc(seasonsTable.seasonNumber));
  }

  async insertEpisode(
    client: DatabaseClient,
    data: NewEpisodeRecord,
  ): Promise<EpisodeRecord> {
    const rows = await client.insert(episodesTable).values(data).returning();
    return rows[0]!;
  }

  async updateEpisode(
    client: DatabaseClient,
    id: string,
    data: Partial<NewEpisodeRecord>,
  ): Promise<EpisodeRecord> {
    const rows = await client
      .update(episodesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(episodesTable.id, id))
      .returning();

    return rows[0]!;
  }

  async findEpisodeByNumber(
    client: DatabaseClient,
    seasonId: string,
    episodeNumber: number,
  ): Promise<EpisodeRecord | null> {
    const rows = await client
      .select()
      .from(episodesTable)
      .where(
        and(
          eq(episodesTable.seasonId, seasonId),
          eq(episodesTable.episodeNumber, episodeNumber),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async findEpisodes(
    client: DatabaseClient,
    seasonId: string,
  ): Promise<EpisodeRecord[]> {
    return await client
      .select()
      .from(episodesTable)
      .where(eq(episodesTable.seasonId, seasonId))
      .orderBy(asc(episodesTable.episodeNumber));
  }

  // =========================================================================
  // REVIEW NOTES
  // =========================================================================

  async insertReviewNote(
    client: DatabaseClient,
    contentId: string,
    reviewerId: string,
    rejectionReason: string,
  ): Promise<ContentReviewNoteRecord> {
    const rows = await client
      .insert(contentReviewNotesTable)
      .values({
        contentId,
        reviewerId,
        rejectionReason,
      })
      .returning();

    return rows[0]!;
  }

  async findReviewNotes(
    client: DatabaseClient,
    contentId: string,
  ): Promise<ContentReviewNoteRecord[]> {
    return await client
      .select()
      .from(contentReviewNotesTable)
      .where(eq(contentReviewNotesTable.contentId, contentId))
      .orderBy(asc(contentReviewNotesTable.createdAt));
  }
}
