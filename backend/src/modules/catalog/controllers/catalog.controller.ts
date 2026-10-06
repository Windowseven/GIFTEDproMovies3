import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { SessionAuthGuard } from "../../identity/guards/session-auth.guard.js";
import { RolesGuard } from "../../identity/guards/roles.guard.js";
import { CapabilitiesGuard } from "../../identity/guards/capabilities.guard.js";
import {
  Roles,
  RequireCapability,
  CurrentUser,
} from "../../identity/decorators/index.js";
import { PolymorphicCatalogService } from "../services/polymorphic-catalog.service.js";
import { ContentLifecycleService } from "../services/content-lifecycle.service.js";
import { SystemSettingsService } from "../services/system-settings.service.js";
import { CreateContentDto } from "../dto/create-content.dto.js";
import { UpdateContentDto } from "../dto/update-content.dto.js";
import { CreateMovieEditionDto } from "../dto/create-movie-edition.dto.js";
import { UpdateMovieEditionDto } from "../dto/update-movie-edition.dto.js";
import { CreateSeriesMetadataDto } from "../dto/create-series-metadata.dto.js";
import { CreateSeasonDto } from "../dto/create-season.dto.js";
import { CreateEpisodeDto } from "../dto/create-episode.dto.js";
import { UpdateEpisodeDto } from "../dto/update-episode.dto.js";
import { RejectContentDto } from "../dto/reject-content.dto.js";
import type { ContentRecord } from "../../../infrastructure/database/schemas/content.schema.js";
import type { MovieEditionRecord } from "../../../infrastructure/database/schemas/movie-editions.schema.js";
import type { SeriesMetadataRecord } from "../../../infrastructure/database/schemas/series-metadata.schema.js";
import type { SeasonRecord } from "../../../infrastructure/database/schemas/seasons.schema.js";
import type { EpisodeRecord } from "../../../infrastructure/database/schemas/episodes.schema.js";

@Controller("staff/catalog")
@UseGuards(SessionAuthGuard, RolesGuard, CapabilitiesGuard)
@Roles("media_team", "admin")
export class CatalogController {
  constructor(
    private readonly polymorphicCatalog: PolymorphicCatalogService,
    private readonly lifecycle: ContentLifecycleService,
    private readonly settings: SystemSettingsService,
  ) {}

  // =========================================================================
  // CONTENT MANAGEMENT
  // =========================================================================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("CONTENT_CREATE")
  async createContent(
    @Body() dto: CreateContentDto,
    @CurrentUser("id") actorId: string,
  ): Promise<ContentRecord> {
    return await this.polymorphicCatalog.createContent(dto, actorId);
  }

  @Patch(":id")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("CONTENT_EDIT")
  async updateContent(
    @Param("id") id: string,
    @Body() dto: UpdateContentDto,
    @CurrentUser("id") actorId: string,
  ): Promise<ContentRecord> {
    return await this.polymorphicCatalog.updateContentMetadata(id, dto, actorId);
  }

  // =========================================================================
  // LIFECYCLE & WORKFLOW
  // =========================================================================

  @Post(":id/submit")
  @HttpCode(HttpStatus.OK)
  async submitForReview(
    @Param("id") id: string,
    @CurrentUser("id") actorId: string,
  ): Promise<ContentRecord> {
    return await this.lifecycle.submitForReview(id, actorId);
  }

  @Post(":id/publish")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("CONTENT_PUBLISH")
  async publishContent(
    @Param("id") id: string,
    @CurrentUser("id") actorId: string,
  ): Promise<ContentRecord> {
    return await this.lifecycle.publishContent(id, actorId);
  }

  @Post(":id/unpublish")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("CONTENT_PUBLISH")
  async unpublishContent(
    @Param("id") id: string,
    @CurrentUser("id") actorId: string,
  ): Promise<ContentRecord> {
    return await this.lifecycle.unpublishContent(id, actorId);
  }

  @Post(":id/archive")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("CONTENT_ARCHIVE")
  async archiveContent(
    @Param("id") id: string,
    @CurrentUser("id") actorId: string,
  ): Promise<ContentRecord> {
    return await this.lifecycle.archiveContent(id, actorId);
  }

  @Post(":id/restore-to-draft")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("CONTENT_ARCHIVE")
  async restoreArchivedContent(
    @Param("id") id: string,
    @CurrentUser("id") actorId: string,
  ): Promise<ContentRecord> {
    return await this.lifecycle.restoreArchivedContent(id, actorId);
  }

  @Post(":id/reject")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("CONTENT_PUBLISH")
  async rejectContent(
    @Param("id") id: string,
    @Body() dto: RejectContentDto,
    @CurrentUser("id") actorId: string,
  ): Promise<ContentRecord> {
    return await this.lifecycle.rejectContent(id, dto.rejectionReason, actorId);
  }

  // =========================================================================
  // MOVIE EDITIONS
  // =========================================================================

  @Post("movies/:id/editions")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("CONTENT_CREATE")
  async attachMovieEdition(
    @Param("id") movieId: string,
    @Body() dto: CreateMovieEditionDto,
    @CurrentUser("id") actorId: string,
  ): Promise<MovieEditionRecord> {
    return await this.polymorphicCatalog.attachMovieEdition(movieId, dto, actorId);
  }

  @Patch("movies/:movieId/editions/:editionId")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("CONTENT_EDIT")
  async updateMovieEdition(
    @Param("movieId") movieId: string,
    @Param("editionId") editionId: string,
    @Body() dto: UpdateMovieEditionDto,
    @CurrentUser("id") actorId: string,
  ): Promise<MovieEditionRecord> {
    return await this.polymorphicCatalog.updateMovieEdition(
      movieId,
      editionId,
      dto,
      actorId,
    );
  }

  @Post("movies/:movieId/editions/:editionId/set-default")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("CONTENT_EDIT")
  async repointDefaultEdition(
    @Param("movieId") movieId: string,
    @Param("editionId") editionId: string,
    @CurrentUser("id") actorId: string,
  ): Promise<MovieEditionRecord> {
    return await this.polymorphicCatalog.repointDefaultEdition(
      movieId,
      editionId,
      actorId,
    );
  }

  @Post("movies/:movieId/editions/:editionId/outage")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("CONTENT_EDIT")
  async handleMovieEditionFailure(
    @Param("movieId") movieId: string,
    @Param("editionId") editionId: string,
    @CurrentUser("id") actorId: string,
  ): Promise<{ content: ContentRecord; editions: MovieEditionRecord[] }> {
    return await this.lifecycle.handleMovieEditionFailure(
      movieId,
      editionId,
      actorId,
    );
  }

  // =========================================================================
  // SERIES METADATA, SEASONS & EPISODES
  // =========================================================================

  @Post("series/:id/metadata")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("CONTENT_CREATE")
  async attachSeriesMetadata(
    @Param("id") seriesId: string,
    @Body() dto: CreateSeriesMetadataDto,
    @CurrentUser("id") actorId: string,
  ): Promise<SeriesMetadataRecord> {
    return await this.polymorphicCatalog.attachSeriesMetadata(seriesId, dto, actorId);
  }

  @Post("series/:id/seasons")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("CONTENT_CREATE")
  async createSeason(
    @Param("id") seriesId: string,
    @Body() dto: CreateSeasonDto,
    @CurrentUser("id") actorId: string,
  ): Promise<SeasonRecord> {
    return await this.polymorphicCatalog.createSeason(seriesId, dto, actorId);
  }

  @Post("seasons/:seasonId/episodes")
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability("CONTENT_CREATE")
  async attachEpisode(
    @Param("seasonId") seasonId: string,
    @Body() dto: CreateEpisodeDto,
    @CurrentUser("id") actorId: string,
  ): Promise<EpisodeRecord> {
    return await this.polymorphicCatalog.attachEpisode(seasonId, dto, actorId);
  }

  @Patch("seasons/:seasonId/episodes/:episodeId")
  @HttpCode(HttpStatus.OK)
  @RequireCapability("CONTENT_EDIT")
  async updateEpisode(
    @Param("seasonId") seasonId: string,
    @Param("episodeId") episodeId: string,
    @Body() dto: UpdateEpisodeDto,
    @CurrentUser("id") actorId: string,
  ): Promise<EpisodeRecord> {
    return await this.polymorphicCatalog.updateEpisode(
      seasonId,
      episodeId,
      dto,
      actorId,
    );
  }

  // =========================================================================
  // SYSTEM SETTINGS
  // =========================================================================

  @Post("settings/publishing-requires-approval")
  @HttpCode(HttpStatus.OK)
  @Roles("admin")
  async setPublishingRequiresApproval(
    @Body("enabled") enabled: boolean,
    @CurrentUser("id") actorId: string,
  ): Promise<{ success: boolean; enabled: boolean }> {
    await this.settings.setSetting("publishingRequiresApproval", enabled, actorId);
    return { success: true, enabled };
  }
}
