import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { DRIZZLE_DATABASE } from "../../infrastructure/database/database.tokens.js";
import type { ApplicationDatabase } from "../../infrastructure/database/database.module.js";
import { contentTable } from "../../infrastructure/database/schemas/content.schema.js";
import { movieEditionsTable } from "../../infrastructure/database/schemas/movie-editions.schema.js";
import { seasonsTable } from "../../infrastructure/database/schemas/seasons.schema.js";
import { episodesTable } from "../../infrastructure/database/schemas/episodes.schema.js";
import {
  entitlementsTable,
  entitlementOrderEffectsTable,
  ordersTable,
  planVersionsTable,
} from "../../infrastructure/database/schemas/commercial.schema.js";
import { mediaAssetSupersessionsTable } from "../../infrastructure/database/schemas/media-supersessions.schema.js";
import { downloadAttemptsTable } from "../../infrastructure/database/schemas/download-attempts.schema.js";
import { djVoiceArtistsTable } from "../../infrastructure/database/schemas/dj-voice-artists.schema.js";
import { CommercialAccessService } from "../commercial/commercial-access.service.js";
import { AuditService } from "../audit/audit.service.js";
import { ENVIRONMENT_CONFIG } from "../../config/tokens.js";
import type { EnvironmentConfig } from "../../config/environment.js";
import { MEDIA_STORAGE_PORT, PLAYBACK_SIGNER_PORT } from "./media.tokens.js";
import type { MediaStoragePort } from "./ports/media-storage.port.js";
import type { PlaybackSignerPort } from "./ports/playback-signer.port.js";
import type { CreateUploadIntentDto, UploadIntentResult } from "./dto/upload-intent.dto.js";
import type { UploadCompleteDto } from "./dto/upload-complete.dto.js";
import type { TranscodeWebhookDto } from "./dto/transcode-webhook.dto.js";
import type { PlaybackAuthorizeDto, PlaybackAuthorizeResult } from "./dto/playback-authorize.dto.js";
import type { StaffPreviewTokenResult } from "./dto/staff-preview-token.dto.js";
import type { DownloadAuthorizeDto, DownloadAuthorizeResult } from "./dto/download-authorize.dto.js";
import type { MediaSupersedeDto, MediaSupersedeResult } from "./dto/media-supersede.dto.js";
import type { ReportDownloadDeliveryDto, ReportDownloadDeliveryResult } from "./dto/report-download-delivery.dto.js";
import type {
  DownloadHistoryQueryDto,
  DownloadHistoryResponse,
  DownloadLicensesResponse,
  DownloadHistoryItem,
  DownloadLicenseItem,
} from "./dto/download-history-query.dto.js";

function getFileExtension(contentType: string): string {
  const map: Record<string, string> = {
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/x-matroska": "mkv",
    "application/x-mpegurl": "m3u8",
    "application/vnd.apple.mpegurl": "m3u8",
  };
  return map[contentType.toLowerCase()] ?? "bin";
}

@Injectable()
export class MediaService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
    private readonly commercialAccessService: CommercialAccessService,
    private readonly auditService: AuditService,
    @Inject(MEDIA_STORAGE_PORT)
    private readonly storage: MediaStoragePort,
    @Inject(PLAYBACK_SIGNER_PORT)
    private readonly playbackSigner: PlaybackSignerPort,
    @Inject(ENVIRONMENT_CONFIG)
    private readonly environment: EnvironmentConfig,
  ) {}

  async createUploadIntent(
    actorId: string,
    dto: CreateUploadIntentDto,
  ): Promise<UploadIntentResult> {
    if (dto.contentKind === "movie") {
      const [content] = await this.db
        .select()
        .from(contentTable)
        .where(and(eq(contentTable.id, dto.contentId), eq(contentTable.contentType, "movie")))
        .limit(1);

      if (!content) {
        throw new NotFoundException("Movie content record not found.");
      }

      // Verify edition belongs strictly to this movie (prevent cross-content IDOR)
      if (dto.editionId) {
        const [edition] = await this.db
          .select()
          .from(movieEditionsTable)
          .where(
            and(
              eq(movieEditionsTable.id, dto.editionId),
              eq(movieEditionsTable.movieId, dto.contentId),
            ),
          )
          .limit(1);

        if (!edition) {
          throw new NotFoundException("Specified movie edition does not belong to this movie.");
        }

        await this.assertMediaCanBeModified("movie", dto.editionId);
      }
    } else {
      const [episode] = await this.db
        .select()
        .from(episodesTable)
        .where(eq(episodesTable.id, dto.contentId))
        .limit(1);

      if (!episode) {
        throw new NotFoundException("Episode record not found.");
      }

      // Verify parent season and series hierarchy
      const [season] = await this.db
        .select()
        .from(seasonsTable)
        .where(eq(seasonsTable.id, episode.seasonId))
        .limit(1);

      if (!season) {
        throw new NotFoundException("Episode parent season record not found.");
      }

      const [series] = await this.db
        .select()
        .from(contentTable)
        .where(and(eq(contentTable.id, season.seriesId), eq(contentTable.contentType, "series")))
        .limit(1);

      if (!series) {
        throw new NotFoundException("Episode parent series record not found.");
      }

      await this.assertMediaCanBeModified("episode", dto.contentId);
    }

    const ext = getFileExtension(dto.contentType);
    const nonce = randomBytes(8).toString("hex");
    const subTarget = dto.editionId ?? dto.djId ?? "master";
    const storageKey = `raw/${dto.contentKind}s/${dto.contentId}/${subTarget}/${dto.fileType}/${nonce}.${ext}`;

    const presigned = await this.storage.generatePresignedUploadUrl({
      storageKey,
      contentType: dto.contentType,
      expiresInSeconds: 3600,
    });

    await this.auditService.recordEvent({
      action: "MEDIA_UPLOAD_INTENT",
      resourceType: dto.contentKind,
      resourceId: dto.contentId,
      actorId,
      metadata: {
        contentKind: dto.contentKind,
        fileType: dto.fileType,
        storageKey,
        contentLengthBytes: dto.contentLengthBytes,
      },
      failClosed: true,
    });

    return presigned;
  }

  async completeUpload(
    actorId: string,
    dto: UploadCompleteDto,
  ): Promise<{ success: boolean; targetId: string; status: string }> {
    const exists = await this.storage.verifyObjectExists(dto.storageKey);
    if (!exists) {
      throw new BadRequestException("Uploaded media object not verified in storage.");
    }

    if (dto.contentKind === "movie") {
      const [edition] = await this.db
        .select()
        .from(movieEditionsTable)
        .where(eq(movieEditionsTable.id, dto.targetId))
        .limit(1);

      if (!edition) {
        throw new NotFoundException("Movie edition record not found.");
      }

      await this.assertMediaCanBeModified("movie", dto.targetId);

      const [movie] = await this.db
        .select()
        .from(contentTable)
        .where(and(eq(contentTable.id, edition.movieId), eq(contentTable.contentType, "movie")))
        .limit(1);

      if (!movie) {
        throw new NotFoundException("Parent movie record not found for edition.");
      }

      await this.db
        .update(movieEditionsTable)
        .set({
          streamingStatus: "processing",
          updatedAt: new Date(),
        })
        .where(eq(movieEditionsTable.id, dto.targetId));
    } else {
      const [episode] = await this.db
        .select()
        .from(episodesTable)
        .where(eq(episodesTable.id, dto.targetId))
        .limit(1);

      if (!episode) {
        throw new NotFoundException("Episode record not found.");
      }

      await this.assertMediaCanBeModified("episode", dto.targetId);

      const [season] = await this.db
        .select()
        .from(seasonsTable)
        .where(eq(seasonsTable.id, episode.seasonId))
        .limit(1);

      if (!season) {
        throw new NotFoundException("Episode parent season not found.");
      }

      const [series] = await this.db
        .select()
        .from(contentTable)
        .where(and(eq(contentTable.id, season.seriesId), eq(contentTable.contentType, "series")))
        .limit(1);

      if (!series) {
        throw new NotFoundException("Episode parent series not found.");
      }

      await this.db
        .update(episodesTable)
        .set({
          streamingStatus: "processing",
          updatedAt: new Date(),
        })
        .where(eq(episodesTable.id, dto.targetId));
    }

    await this.auditService.recordEvent({
      action: "MEDIA_UPLOAD_COMPLETE",
      resourceType: dto.contentKind,
      resourceId: dto.targetId,
      actorId,
      metadata: {
        contentKind: dto.contentKind,
        fileType: dto.fileType,
        storageKey: dto.storageKey,
      },
      failClosed: true,
    });

    return { success: true, targetId: dto.targetId, status: "processing" };
  }

  async processTranscodeWebhook(
    dto: TranscodeWebhookDto,
    signatureHeader?: string,
    secretHeader?: string,
  ): Promise<{ success: boolean; status: string }> {
    // 1. Authenticate transcode webhook
    const secret =
      this.environment.transcodeWebhookSecret ||
      (this.environment.appEnvironment !== "production"
        ? "test-transcode-webhook-secret-32-chars-min"
        : undefined);

    if (!secret) {
      throw new UnauthorizedException("Transcode webhook secret is not configured.");
    }

    let authenticated = false;

    if (secretHeader) {
      const expectedBuf = Buffer.from(secret, "utf8");
      const candidateBuf = Buffer.from(secretHeader, "utf8");
      if (
        expectedBuf.length === candidateBuf.length &&
        timingSafeEqual(expectedBuf, candidateBuf)
      ) {
        authenticated = true;
      }
    }

    if (!authenticated && signatureHeader) {
      const expectedSig = createHmac("sha256", secret)
        .update(JSON.stringify(dto))
        .digest("hex");
      const expectedBuf = Buffer.from(expectedSig.toLowerCase(), "utf8");
      const candidateBuf = Buffer.from(signatureHeader.toLowerCase(), "utf8");
      if (
        expectedBuf.length === candidateBuf.length &&
        timingSafeEqual(expectedBuf, candidateBuf)
      ) {
        authenticated = true;
      }
    }

    if (!authenticated) {
      throw new UnauthorizedException("Invalid or missing transcode webhook authentication.");
    }

    // 2. Monotonic status transitions & updates
    if (dto.contentKind === "movie") {
      const [edition] = await this.db
        .select()
        .from(movieEditionsTable)
        .where(eq(movieEditionsTable.id, dto.targetId))
        .limit(1);

      if (!edition) {
        throw new NotFoundException("Movie edition not found.");
      }

      // Monotonic guard: once ready, cannot regress to processing or failed
      if (edition.streamingStatus === "ready") {
        return { success: true, status: "ready" };
      }

      if (edition.streamingStatus === "failed" && dto.status === "processing") {
        return { success: true, status: "failed" };
      }

      if (dto.status === "ready") {
        await this.db
          .update(movieEditionsTable)
          .set({
            streamingFileKey: dto.streamingFileKey ?? edition.streamingFileKey,
            streamingStatus: "ready",
            isAvailable: true,
            updatedAt: new Date(),
          })
          .where(eq(movieEditionsTable.id, dto.targetId));
      } else if (dto.status === "failed") {
        await this.db
          .update(movieEditionsTable)
          .set({
            streamingStatus: "failed",
            isAvailable: false,
            updatedAt: new Date(),
          })
          .where(eq(movieEditionsTable.id, dto.targetId));
      }
    } else {
      const [episode] = await this.db
        .select()
        .from(episodesTable)
        .where(eq(episodesTable.id, dto.targetId))
        .limit(1);

      if (!episode) {
        throw new NotFoundException("Episode not found.");
      }

      // Monotonic guard: once ready, cannot regress to processing or failed
      if (episode.streamingStatus === "ready") {
        return { success: true, status: "ready" };
      }

      if (episode.streamingStatus === "failed" && dto.status === "processing") {
        return { success: true, status: "failed" };
      }

      if (dto.status === "ready") {
        await this.db
          .update(episodesTable)
          .set({
            streamingFileKey: dto.streamingFileKey ?? episode.streamingFileKey,
            streamingStatus: "ready",
            isAvailable: true,
            updatedAt: new Date(),
          })
          .where(eq(episodesTable.id, dto.targetId));
      } else if (dto.status === "failed") {
        await this.db
          .update(episodesTable)
          .set({
            streamingStatus: "failed",
            isAvailable: false,
            updatedAt: new Date(),
          })
          .where(eq(episodesTable.id, dto.targetId));
      }
    }

    await this.auditService.recordEvent({
      action: "MEDIA_TRANSCODE_WEBHOOK",
      resourceType: dto.contentKind,
      resourceId: dto.targetId,
      actorId: null,
      metadata: {
        jobId: dto.jobId,
        contentKind: dto.contentKind,
        status: dto.status,
        streamingFileKey: dto.streamingFileKey,
        error: dto.error,
        executionSource: "SYSTEM_TRANSCODE_WORKER",
      },
      failClosed: true,
    });

    return { success: true, status: dto.status };
  }

  async authorizePlayback(
    customerId: string,
    dto: PlaybackAuthorizeDto,
  ): Promise<PlaybackAuthorizeResult> {
    if (!this.environment.customerStreamingEnabled) {
      throw new ServiceUnavailableException({
        statusCode: 503,
        error: "Service Unavailable",
        message: "STREAMING_COMING_SOON: Customer streaming playback is currently unavailable.",
        code: "STREAMING_COMING_SOON",
      });
    }

    if (!dto.contentId && !dto.episodeId) {
      throw new BadRequestException("Either contentId or episodeId must be provided.");
    }

    // 1. Authoritative entitlement check via CommercialAccessService
    const decision = await this.commercialAccessService.canAccess(customerId, {
      contentId: dto.contentId,
      episodeId: dto.episodeId,
    });

    if (!decision.granted) {
      throw new ForbiddenException(
        `Playback access denied: ${decision.reason ?? "NO_ACTIVE_ENTITLEMENT"}`,
      );
    }

    // 2. Resolve media asset
    if (dto.episodeId) {
      const [episode] = await this.db
        .select()
        .from(episodesTable)
        .where(eq(episodesTable.id, dto.episodeId))
        .limit(1);

      if (!episode || !episode.isAvailable || episode.streamingStatus !== "ready" || !episode.streamingFileKey) {
        throw new NotFoundException("Episode media streaming is not currently available or ready.");
      }

      const token = await this.playbackSigner.generatePlaybackToken({
        customerId,
        contentId: episode.id,
        djId: episode.djId ?? undefined,
        ttlSeconds: 900,
      });

      const basePlaybackUrl = this.storage.getPlaybackUrl(episode.streamingFileKey);
      const streamUrl = `${basePlaybackUrl}?token=${token}`;

      return {
        authorized: true,
        streamUrl,
        playbackToken: token,
        expiresAt: new Date(Date.now() + 900 * 1000).toISOString(),
        targetKind: "episode",
        contentId: episode.id,
        djId: episode.djId ?? undefined,
      };
    }

    // Movie branch: resolve specific edition, DJ edition, or default edition
    const editionQuery = this.db
      .select()
      .from(movieEditionsTable)
      .where(eq(movieEditionsTable.movieId, dto.contentId!));

    const editions = await editionQuery;
    if (editions.length === 0) {
      throw new NotFoundException("No editions found for specified movie.");
    }

    const selectedEdition = dto.editionId
      ? editions.find((e) => e.id === dto.editionId)
      : dto.djId
      ? editions.find((e) => e.djId === dto.djId)
      : editions.find((e) => e.isDefault) ?? editions[0];

    if (!selectedEdition || !selectedEdition.isAvailable || selectedEdition.streamingStatus !== "ready" || !selectedEdition.streamingFileKey) {
      throw new NotFoundException("Requested movie edition streaming is not currently available or ready.");
    }

    const token = await this.playbackSigner.generatePlaybackToken({
      customerId,
      contentId: selectedEdition.movieId,
      editionId: selectedEdition.id,
      djId: selectedEdition.djId,
      ttlSeconds: 900,
    });

    const basePlaybackUrl = this.storage.getPlaybackUrl(selectedEdition.streamingFileKey);
    const streamUrl = `${basePlaybackUrl}?token=${token}`;

    return {
      authorized: true,
      streamUrl,
      playbackToken: token,
      expiresAt: new Date(Date.now() + 900 * 1000).toISOString(),
      targetKind: "movie",
      contentId: selectedEdition.movieId,
      editionId: selectedEdition.id,
      djId: selectedEdition.djId,
    };
  }

  async createStaffPreviewToken(
    staffUserId: string,
    editionId: string,
  ): Promise<StaffPreviewTokenResult> {
    // 1. Check movie editions first
    const [movieEdition] = await this.db
      .select()
      .from(movieEditionsTable)
      .where(eq(movieEditionsTable.id, editionId))
      .limit(1);

    let contentId: string;
    let actualEditionId: string | null = null;
    let djId: string | null = null;
    let streamingFileKey: string | null = null;
    let streamingStatus: string;
    let targetKind: "movie" | "episode";
    let resourceType: string;

    if (movieEdition) {
      contentId = movieEdition.movieId;
      actualEditionId = movieEdition.id;
      djId = movieEdition.djId;
      streamingFileKey = movieEdition.streamingFileKey;
      streamingStatus = movieEdition.streamingStatus;
      targetKind = "movie";
      resourceType = "movie_edition";
    } else {
      // 2. Fallback to check episodes
      const [episode] = await this.db
        .select()
        .from(episodesTable)
        .where(eq(episodesTable.id, editionId))
        .limit(1);

      if (!episode) {
        throw new NotFoundException("Specified media edition or episode not found.");
      }

      contentId = episode.id;
      actualEditionId = null;
      djId = episode.djId ?? null;
      streamingFileKey = episode.streamingFileKey;
      streamingStatus = episode.streamingStatus;
      targetKind = "episode";
      resourceType = "episode";
    }

    if (!streamingFileKey || streamingStatus !== "ready") {
      throw new BadRequestException("Media transcoding is not complete or streaming asset is not ready.");
    }

    const ttlSeconds = 300; // 5 minutes TTL per ARCH-003 / POD-04
    const token = await this.playbackSigner.generatePlaybackToken({
      customerId: staffUserId,
      contentId,
      editionId: actualEditionId ?? undefined,
      djId: djId ?? undefined,
      ttlSeconds,
    });

    const basePlaybackUrl = this.storage.getPlaybackUrl(streamingFileKey);
    const streamUrl = `${basePlaybackUrl}?token=${token}`;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    await this.auditService.recordEvent({
      action: "STAFF_MEDIA_PREVIEW_GENERATED",
      actorId: staffUserId,
      resourceType,
      resourceId: editionId,
      metadata: {
        editionId,
        contentId,
        djId,
        targetKind,
        ttlSeconds,
      },
      failClosed: true,
    });

    return {
      authorized: true,
      streamUrl,
      previewToken: token,
      expiresAt,
      targetKind,
      contentId,
      editionId: actualEditionId,
      djId,
    };
  }

  /**
   * Asserts that a media asset can be superseded, overwritten, or modified.
   * If the asset is currently in 'ready' status and active commercial entitlements reference it,
   * mutation is blocked with HTTP 409 Conflict until versioned supersession is authorized (GPM-AUDIT-017).
   */
  async assertMediaCanBeModified(
    contentKind: "movie" | "episode",
    targetId: string,
  ): Promise<void> {
    if (contentKind === "movie") {
      const [edition] = await this.db
        .select()
        .from(movieEditionsTable)
        .where(eq(movieEditionsTable.id, targetId))
        .limit(1);

      if (!edition) return;

      // Only ready assets with active commercial history are protected against destructive overwrite
      if (edition.streamingStatus === "ready" || edition.downloadStatus === "ready") {
        const [activeEntitlement] = await this.db
          .select({ id: entitlementsTable.id })
          .from(entitlementsTable)
          .where(
            and(
              eq(entitlementsTable.targetMovieContentId, edition.movieId),
              eq(entitlementsTable.status, "ACTIVE"),
            ),
          )
          .limit(1);

        if (activeEntitlement) {
          throw new ConflictException(
            "ACTIVE_COMMERCIAL_ENTITLEMENT_EXISTS: Cannot overwrite or mutate ready media asset with active commercial customer entitlements without versioned supersession.",
          );
        }
      }
    } else {
      const [episode] = await this.db
        .select()
        .from(episodesTable)
        .where(eq(episodesTable.id, targetId))
        .limit(1);

      if (!episode) return;

      if (episode.streamingStatus === "ready" || episode.downloadStatus === "ready") {
        const [season] = await this.db
          .select()
          .from(seasonsTable)
          .where(eq(seasonsTable.id, episode.seasonId))
          .limit(1);

        const seriesId = season?.seriesId;

        const [activeEntitlement] = await this.db
          .select({ id: entitlementsTable.id })
          .from(entitlementsTable)
          .where(
            and(
              or(
                eq(entitlementsTable.targetEpisodeId, episode.id),
                eq(entitlementsTable.targetSeasonId, episode.seasonId),
                seriesId ? eq(entitlementsTable.targetSeriesContentId, seriesId) : sql`FALSE`,
              ),
              eq(entitlementsTable.status, "ACTIVE"),
            ),
          )
          .limit(1);

        if (activeEntitlement) {
          throw new ConflictException(
            "ACTIVE_COMMERCIAL_ENTITLEMENT_EXISTS: Cannot overwrite or mutate ready media asset with active commercial customer entitlements without versioned supersession.",
          );
        }
      }
    }
  }

  /**
   * Authorized workflow to supersede an existing media asset (Model B, GPM-AUDIT-017, POD-03).
   * Records an auditable historical supersession record in media_asset_supersessions,
   * updates the target movie_editions or episodes record, and satisfies database triggers.
   */
  async supersedeMediaAsset(
    actorId: string,
    dto: MediaSupersedeDto,
  ): Promise<MediaSupersedeResult> {
    const supersessionId = randomUUID();
    const now = new Date();

    if (dto.contentKind === "movie") {
      const [edition] = await this.db
        .select()
        .from(movieEditionsTable)
        .where(eq(movieEditionsTable.id, dto.targetId))
        .limit(1);

      if (!edition) {
        throw new NotFoundException("Movie edition record not found.");
      }

      const prevStreaming = edition.streamingFileKey;
      const prevDownload = edition.downloadFileKey;

      await this.db.transaction(async (tx) => {
        await tx.execute(sql`SELECT id FROM movie_editions WHERE id = ${dto.targetId} FOR UPDATE`);

        await tx.insert(mediaAssetSupersessionsTable).values({
          id: supersessionId,
          contentKind: "movie",
          targetId: dto.targetId,
          supersededByActorId: actorId,
          reason: dto.reason,
          fileType: dto.fileType,
          previousStreamingFileKey: prevStreaming,
          previousDownloadFileKey: prevDownload,
          newStreamingFileKey: dto.fileType === "streaming" ? dto.newStorageKey : prevStreaming,
          newDownloadFileKey: dto.fileType === "download" ? dto.newStorageKey : prevDownload,
          supersededAt: now,
          createdAt: now,
        });

        const updateData: Partial<typeof movieEditionsTable.$inferInsert> = {
          updatedAt: now,
        };
        if (dto.fileType === "streaming") {
          updateData.streamingFileKey = dto.newStorageKey;
          updateData.streamingStatus = "ready";
        } else {
          updateData.downloadFileKey = dto.newStorageKey;
          updateData.downloadStatus = "ready";
        }

        await tx
          .update(movieEditionsTable)
          .set(updateData)
          .where(eq(movieEditionsTable.id, dto.targetId));
      });

      await this.auditService.recordEvent({
        action: "MEDIA_ASSET_SUPERSEDED",
        resourceType: "movie",
        resourceId: dto.targetId,
        actorId,
        metadata: {
          supersessionId,
          fileType: dto.fileType,
          reason: dto.reason,
          previousFileKey: dto.fileType === "streaming" ? prevStreaming : prevDownload,
          newFileKey: dto.newStorageKey,
        },
        failClosed: true,
      });

      return {
        supersessionId,
        contentKind: "movie",
        targetId: dto.targetId,
        fileType: dto.fileType,
        previousFileKey: dto.fileType === "streaming" ? prevStreaming : prevDownload,
        newFileKey: dto.newStorageKey,
        supersededAt: now.toISOString(),
      };
    } else {
      const [episode] = await this.db
        .select()
        .from(episodesTable)
        .where(eq(episodesTable.id, dto.targetId))
        .limit(1);

      if (!episode) {
        throw new NotFoundException("Episode record not found.");
      }

      const prevStreaming = episode.streamingFileKey;
      const prevDownload = episode.downloadFileKey;

      await this.db.transaction(async (tx) => {
        await tx.execute(sql`SELECT id FROM episodes WHERE id = ${dto.targetId} FOR UPDATE`);

        await tx.insert(mediaAssetSupersessionsTable).values({
          id: supersessionId,
          contentKind: "episode",
          targetId: dto.targetId,
          supersededByActorId: actorId,
          reason: dto.reason,
          fileType: dto.fileType,
          previousStreamingFileKey: prevStreaming,
          previousDownloadFileKey: prevDownload,
          newStreamingFileKey: dto.fileType === "streaming" ? dto.newStorageKey : prevStreaming,
          newDownloadFileKey: dto.fileType === "download" ? dto.newStorageKey : prevDownload,
          supersededAt: now,
          createdAt: now,
        });

        const updateData: Partial<typeof episodesTable.$inferInsert> = {
          updatedAt: now,
        };
        if (dto.fileType === "streaming") {
          updateData.streamingFileKey = dto.newStorageKey;
          updateData.streamingStatus = "ready";
        } else {
          updateData.downloadFileKey = dto.newStorageKey;
          updateData.downloadStatus = "ready";
        }

        await tx
          .update(episodesTable)
          .set(updateData)
          .where(eq(episodesTable.id, dto.targetId));
      });

      await this.auditService.recordEvent({
        action: "MEDIA_ASSET_SUPERSEDED",
        resourceType: "episode",
        resourceId: dto.targetId,
        actorId,
        metadata: {
          supersessionId,
          fileType: dto.fileType,
          reason: dto.reason,
          previousFileKey: dto.fileType === "streaming" ? prevStreaming : prevDownload,
          newFileKey: dto.newStorageKey,
        },
        failClosed: true,
      });

      return {
        supersessionId,
        contentKind: "episode",
        targetId: dto.targetId,
        fileType: dto.fileType,
        previousFileKey: dto.fileType === "streaming" ? prevStreaming : prevDownload,
        newFileKey: dto.newStorageKey,
        supersededAt: now.toISOString(),
      };
    }
  }

  /**
   * Authorizes customer media download access, enforces commercial entitlement and plan limits,
   * performs atomic quota accounting and 24-hour retry grace (Model B, GPM-AUDIT-013, POD-05).
   */
  async authorizeDownload(
    customerId: string,
    dto: DownloadAuthorizeDto,
  ): Promise<DownloadAuthorizeResult> {
    if (!dto.contentId && !dto.episodeId) {
      throw new BadRequestException("Either contentId or episodeId must be provided.");
    }

    // 1. Authoritative entitlement check via CommercialAccessService
    const decision = await this.commercialAccessService.canAccess(customerId, {
      contentId: dto.contentId,
      episodeId: dto.episodeId,
    });

    if (!decision.granted) {
      throw new ForbiddenException(
        `Download access denied: ${decision.reason ?? "NO_ACTIVE_ENTITLEMENT"}`,
      );
    }

    // 2. Validate plan download capabilities
    let planVersionId: string | null = null;
    let resolvedOrderId: string | null = decision.orderId ?? null;

    if (decision.orderId) {
      const [order] = await this.db
        .select({ planVersionId: ordersTable.planVersionId })
        .from(ordersTable)
        .where(eq(ordersTable.id, decision.orderId))
        .limit(1);
      planVersionId = order?.planVersionId ?? null;
    } else if (decision.entitlementId) {
      const [effect] = await this.db
        .select({ orderId: entitlementOrderEffectsTable.orderId })
        .from(entitlementOrderEffectsTable)
        .where(eq(entitlementOrderEffectsTable.entitlementId, decision.entitlementId))
        .limit(1);
      if (effect) {
        resolvedOrderId = effect.orderId;
        const [order] = await this.db
          .select({ planVersionId: ordersTable.planVersionId })
          .from(ordersTable)
          .where(eq(ordersTable.id, effect.orderId))
          .limit(1);
        planVersionId = order?.planVersionId ?? null;
      }
    }

    let downloadLimit: number | null = null;
    let downloadLimitType: string | null = null;

    if (planVersionId) {
      const [planVersion] = await this.db
        .select({
          downloadLimit: planVersionsTable.downloadLimit,
          downloadLimitType: planVersionsTable.downloadLimitType,
        })
        .from(planVersionsTable)
        .where(eq(planVersionsTable.id, planVersionId))
        .limit(1);

      if (planVersion) {
        downloadLimit = planVersion.downloadLimit;
        downloadLimitType = planVersion.downloadLimitType;

        if (downloadLimit !== null && downloadLimit === 0) {
          throw new ForbiddenException(
            "DOWNLOAD_NOT_PERMITTED: The active plan does not permit offline downloads.",
          );
        }
      }
    }

    // 3. Resolve media asset and verify download readiness
    let targetKind: "movie" | "episode";
    let targetContentId: string;
    let editionId: string | undefined;
    let episodeId: string | undefined;
    let downloadFileKey: string;
    let djId: string | undefined;

    if (dto.episodeId) {
      const [episode] = await this.db
        .select()
        .from(episodesTable)
        .where(eq(episodesTable.id, dto.episodeId))
        .limit(1);

      if (
        !episode ||
        !episode.isAvailable ||
        episode.downloadStatus !== "ready" ||
        !episode.downloadFileKey
      ) {
        throw new NotFoundException("Episode media download is not currently available or ready.");
      }

      targetKind = "episode";
      targetContentId = episode.id;
      episodeId = episode.id;
      downloadFileKey = episode.downloadFileKey;
      djId = episode.djId ?? undefined;
    } else {
      const editions = await this.db
        .select()
        .from(movieEditionsTable)
        .where(eq(movieEditionsTable.movieId, dto.contentId!));

      if (editions.length === 0) {
        throw new NotFoundException("No editions found for specified movie.");
      }

      const selectedEdition = dto.editionId
        ? editions.find((e) => e.id === dto.editionId)
        : dto.djId
        ? editions.find((e) => e.djId === dto.djId)
        : editions.find((e) => e.isDefault) ?? editions[0];

      if (
        !selectedEdition ||
        !selectedEdition.isAvailable ||
        selectedEdition.downloadStatus !== "ready" ||
        !selectedEdition.downloadFileKey
      ) {
        throw new NotFoundException(
          "Requested movie edition download is not currently available or ready.",
        );
      }

      targetKind = "movie";
      targetContentId = selectedEdition.movieId;
      editionId = selectedEdition.id;
      downloadFileKey = selectedEdition.downloadFileKey;
      djId = selectedEdition.djId ?? undefined;
    }

    // 4. Atomic Quota Enforcement & 24h Retry Grace (Model B via download_attempts)
    return await this.db.transaction(async (tx) => {
      // Row lock the order to prevent concurrent race conditions on quota
      if (resolvedOrderId) {
        await tx.execute(sql`SELECT id FROM orders WHERE id = ${resolvedOrderId} FOR UPDATE`);
      }

      const now = new Date();
      const tokenExpiresAt = new Date(now.getTime() + 900 * 1000);
      const retryGraceExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Check for a qualifying retry within the 24-hour grace window
      const [existingFailedAttempt] = await tx
        .select()
        .from(downloadAttemptsTable)
        .where(
          and(
            eq(downloadAttemptsTable.customerId, customerId),
            eq(downloadAttemptsTable.contentId, targetContentId),
            eq(downloadAttemptsTable.status, "FAILED"),
            sql`${downloadAttemptsTable.retryGraceExpiresAt} > ${now}`,
          ),
        )
        .orderBy(desc(downloadAttemptsTable.createdAt))
        .limit(1);

      if (existingFailedAttempt) {
        // Qualifying retry! Does NOT consume additional quota
        const token = await this.playbackSigner.generatePlaybackToken({
          customerId,
          contentId: targetContentId,
          editionId,
          djId,
          ttlSeconds: 900,
        });

        await tx
          .update(downloadAttemptsTable)
          .set({
            status: "PENDING",
            downloadToken: token,
            tokenExpiresAt,
            attemptNumber: sql`${downloadAttemptsTable.attemptNumber} + 1`,
            updatedAt: now,
          })
          .where(eq(downloadAttemptsTable.id, existingFailedAttempt.id));

        const downloadUrl = await this.storage.generatePresignedDownloadUrl({
          storageKey: downloadFileKey,
          expiresInSeconds: 900,
        });

        await this.auditService.recordEvent({
          action: "CUSTOMER_MEDIA_DOWNLOAD_RETRY_AUTHORIZED",
          resourceType: targetKind,
          resourceId: editionId ?? episodeId!,
          actorId: customerId,
          metadata: {
            attemptId: existingFailedAttempt.id,
            contentId: targetContentId,
            isRetry: true,
            planVersionId,
            downloadLimit,
            downloadLimitType,
          },
          failClosed: true,
        });

        return {
          authorized: true,
          downloadUrl,
          downloadToken: token,
          expiresAt: tokenExpiresAt.toISOString(),
          targetKind,
          contentId: targetContentId,
          editionId,
          djId,
          downloadLimit,
          downloadLimitType,
          attemptId: existingFailedAttempt.id,
          isRetry: true,
        };
      }

      // Check quota limits if not a retry
      if (downloadLimit !== null && resolvedOrderId) {
        if (downloadLimitType === "UNIQUE_TITLES") {
          // Check if this title has already been attempted/downloaded under this order
          const [existingTitleAttempt] = await tx
            .select({ id: downloadAttemptsTable.id })
            .from(downloadAttemptsTable)
            .where(
              and(
                eq(downloadAttemptsTable.orderId, resolvedOrderId),
                eq(downloadAttemptsTable.contentId, targetContentId),
                or(
                  eq(downloadAttemptsTable.status, "PENDING"),
                  eq(downloadAttemptsTable.status, "COMPLETED"),
                  eq(downloadAttemptsTable.status, "FAILED"),
                ),
              ),
            )
            .limit(1);

          if (!existingTitleAttempt) {
            // Count distinct titles attempted under this order
            const distinctTitlesResult = await tx.execute(
              sql`SELECT COUNT(DISTINCT content_id)::int as cnt FROM download_attempts WHERE order_id = ${resolvedOrderId} AND status IN ('PENDING', 'COMPLETED', 'FAILED')`,
            );
            const distinctCount = (distinctTitlesResult.rows[0] as { cnt: number })?.cnt ?? 0;

            if (distinctCount >= downloadLimit) {
              throw new ForbiddenException(
                `DOWNLOAD_QUOTA_EXHAUSTED: Download limit of ${downloadLimit} unique titles has been reached.`,
              );
            }
          }
        } else {
          // Total download actions quota
          const countResult = await tx.execute(
            sql`SELECT COUNT(*)::int as cnt FROM download_attempts WHERE order_id = ${resolvedOrderId} AND status IN ('PENDING', 'COMPLETED', 'FAILED')`,
          );
          const totalCount = (countResult.rows[0] as { cnt: number })?.cnt ?? 0;

          if (totalCount >= downloadLimit) {
            throw new ForbiddenException(
              `DOWNLOAD_QUOTA_EXHAUSTED: Download limit of ${downloadLimit} downloads has been reached.`,
            );
          }
        }
      }

      // Issue signed token
      const token = await this.playbackSigner.generatePlaybackToken({
        customerId,
        contentId: targetContentId,
        editionId,
        djId,
        ttlSeconds: 900,
      });

      const attemptId = randomUUID();

      if (resolvedOrderId && planVersionId && decision.entitlementId) {
        await tx.insert(downloadAttemptsTable).values({
          id: attemptId,
          customerId,
          orderId: resolvedOrderId,
          entitlementId: decision.entitlementId,
          planVersionId,
          contentKind: targetKind,
          contentId: targetContentId,
          editionId: editionId ?? null,
          episodeId: episodeId ?? null,
          status: "PENDING",
          downloadToken: token,
          tokenExpiresAt,
          retryGraceExpiresAt,
          attemptNumber: 1,
          createdAt: now,
          updatedAt: now,
        });
      }

      const downloadUrl = await this.storage.generatePresignedDownloadUrl({
        storageKey: downloadFileKey,
        expiresInSeconds: 900,
      });

      await this.auditService.recordEvent({
        action: "CUSTOMER_MEDIA_DOWNLOAD_AUTHORIZED",
        resourceType: targetKind,
        resourceId: editionId ?? episodeId!,
        actorId: customerId,
        metadata: {
          attemptId,
          contentId: targetContentId,
          editionId,
          djId,
          grantType: decision.grantType,
          orderId: decision.orderId,
          planVersionId,
          downloadLimit,
          downloadLimitType,
          isRetry: false,
        },
        failClosed: true,
      });

      return {
        authorized: true,
        downloadUrl,
        downloadToken: token,
        expiresAt: tokenExpiresAt.toISOString(),
        targetKind,
        contentId: targetContentId,
        editionId,
        djId,
        downloadLimit,
        downloadLimitType,
        attemptId,
        isRetry: false,
      };
    });
  }

  /**
   * Reports download delivery outcome (COMPLETED or FAILED) for an authorized attempt (POD-05).
   * Distinguishes delivery failure to activate the 24-hour retry grace window.
   */
  async reportDownloadDelivery(
    customerId: string,
    dto: ReportDownloadDeliveryDto,
  ): Promise<ReportDownloadDeliveryResult> {
    const [attempt] = await this.db
      .select()
      .from(downloadAttemptsTable)
      .where(
        and(
          eq(downloadAttemptsTable.id, dto.attemptId),
          eq(downloadAttemptsTable.customerId, customerId),
        ),
      )
      .limit(1);

    if (!attempt) {
      throw new NotFoundException("Download attempt record not found.");
    }

    const now = new Date();

    if (dto.status === "COMPLETED") {
      await this.db
        .update(downloadAttemptsTable)
        .set({
          status: "COMPLETED",
          completedAt: now,
          updatedAt: now,
        })
        .where(eq(downloadAttemptsTable.id, dto.attemptId));

      await this.auditService.recordEvent({
        action: "CUSTOMER_MEDIA_DOWNLOAD_DELIVERY_CONFIRMED",
        resourceType: attempt.contentKind,
        resourceId: attempt.editionId ?? attempt.episodeId ?? attempt.contentId,
        actorId: customerId,
        metadata: {
          attemptId: dto.attemptId,
          completedAt: now.toISOString(),
        },
        failClosed: true,
      });

      return {
        attemptId: dto.attemptId,
        status: "COMPLETED",
        retryEligible: false,
        updatedAt: now.toISOString(),
      };
    } else {
      await this.db
        .update(downloadAttemptsTable)
        .set({
          status: "FAILED",
          failureReason: dto.failureReason ?? "DELIVERY_FAILED",
          updatedAt: now,
        })
        .where(eq(downloadAttemptsTable.id, dto.attemptId));

      await this.auditService.recordEvent({
        action: "CUSTOMER_MEDIA_DOWNLOAD_DELIVERY_FAILED",
        resourceType: attempt.contentKind,
        resourceId: attempt.editionId ?? attempt.episodeId ?? attempt.contentId,
        actorId: customerId,
        metadata: {
          attemptId: dto.attemptId,
          failureReason: dto.failureReason ?? "DELIVERY_FAILED",
          retryGraceExpiresAt: attempt.retryGraceExpiresAt.toISOString(),
        },
        failClosed: true,
      });

      return {
        attemptId: dto.attemptId,
        status: "FAILED",
        retryEligible: true,
        retryGraceExpiresAt: attempt.retryGraceExpiresAt.toISOString(),
        updatedAt: now.toISOString(),
      };
    }
  }

  /**
   * Calculates remaining download quota for a given order and plan limit configuration.
   * Returns null if the plan has no download quota limit (unlimited).
   */
  async calculateQuotaRemaining(
    orderId: string,
    downloadLimit: number | null,
    downloadLimitType: string | null,
  ): Promise<number | null> {
    if (downloadLimit === null || downloadLimit === undefined) {
      return null;
    }

    if (downloadLimitType === "UNIQUE_TITLES") {
      const distinctTitlesResult = await this.db.execute(
        sql`SELECT COUNT(DISTINCT content_id)::int as cnt FROM download_attempts WHERE order_id = ${orderId} AND status IN ('PENDING', 'COMPLETED', 'FAILED')`,
      );
      const distinctCount = (distinctTitlesResult.rows[0] as { cnt: number })?.cnt ?? 0;
      return Math.max(0, downloadLimit - distinctCount);
    } else {
      const countResult = await this.db.execute(
        sql`SELECT COUNT(*)::int as cnt FROM download_attempts WHERE order_id = ${orderId} AND status IN ('PENDING', 'COMPLETED', 'FAILED')`,
      );
      const totalCount = (countResult.rows[0] as { cnt: number })?.cnt ?? 0;
      return Math.max(0, downloadLimit - totalCount);
    }
  }

  /**
   * Retrieves download attempt history for a customer with optional status filtering and pagination.
   */
  async getDownloadHistory(
    customerId: string,
    query: DownloadHistoryQueryDto,
  ): Promise<DownloadHistoryResponse> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const whereConditions = [eq(downloadAttemptsTable.customerId, customerId)];
    if (query.status) {
      whereConditions.push(eq(downloadAttemptsTable.status, query.status));
    }

    const [countRow] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(downloadAttemptsTable)
      .where(and(...whereConditions));
    const total = countRow?.count ?? 0;

    const attempts = await this.db
      .select({
        attempt: downloadAttemptsTable,
        planDownloadLimit: planVersionsTable.downloadLimit,
        planDownloadLimitType: planVersionsTable.downloadLimitType,
      })
      .from(downloadAttemptsTable)
      .innerJoin(
        planVersionsTable,
        eq(downloadAttemptsTable.planVersionId, planVersionsTable.id),
      )
      .where(and(...whereConditions))
      .orderBy(desc(downloadAttemptsTable.createdAt))
      .limit(limit)
      .offset(offset);

    if (attempts.length === 0) {
      return {
        downloads: [],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    }

    // Collect IDs for batch resolution
    const movieContentIds = new Set<string>();
    const editionIds = new Set<string>();
    const episodeIds = new Set<string>();

    for (const { attempt } of attempts) {
      if (attempt.contentKind === "movie") {
        movieContentIds.add(attempt.contentId);
      }
      if (attempt.editionId) {
        editionIds.add(attempt.editionId);
      }
      if (attempt.episodeId) {
        episodeIds.add(attempt.episodeId);
      }
    }

    // Batch query movies
    const moviesMap = new Map<
      string,
      { title: string; slug: string; posterUrl: string | null; backdropUrl: string | null }
    >();
    if (movieContentIds.size > 0) {
      const movies = await this.db
        .select({
          id: contentTable.id,
          title: contentTable.title,
          slug: contentTable.slug,
          posterUrl: contentTable.posterUrl,
          backdropUrl: contentTable.backdropUrl,
        })
        .from(contentTable)
        .where(inArray(contentTable.id, Array.from(movieContentIds)));
      for (const m of movies) {
        moviesMap.set(m.id, m);
      }
    }

    // Batch query editions with DJ names
    const editionsMap = new Map<string, { djName: string | null }>();
    if (editionIds.size > 0) {
      const editions = await this.db
        .select({
          id: movieEditionsTable.id,
          djName: djVoiceArtistsTable.stageName,
        })
        .from(movieEditionsTable)
        .leftJoin(djVoiceArtistsTable, eq(movieEditionsTable.djId, djVoiceArtistsTable.id))
        .where(inArray(movieEditionsTable.id, Array.from(editionIds)));
      for (const ed of editions) {
        editionsMap.set(ed.id, { djName: ed.djName ?? null });
      }
    }

    // Batch query episodes with DJ names
    const episodesMap = new Map<
      string,
      { title: string; thumbnailUrl: string | null; djName: string | null }
    >();
    if (episodeIds.size > 0) {
      const episodes = await this.db
        .select({
          id: episodesTable.id,
          title: episodesTable.title,
          thumbnailUrl: episodesTable.thumbnailUrl,
          djName: djVoiceArtistsTable.stageName,
        })
        .from(episodesTable)
        .leftJoin(djVoiceArtistsTable, eq(episodesTable.djId, djVoiceArtistsTable.id))
        .where(inArray(episodesTable.id, Array.from(episodeIds)));
      for (const ep of episodes) {
        episodesMap.set(ep.id, {
          title: ep.title,
          thumbnailUrl: ep.thumbnailUrl ?? null,
          djName: ep.djName ?? null,
        });
      }
    }

    // Memoize quota calculations per orderId
    const quotaMap = new Map<string, number | null>();
    const now = new Date();

    const downloads: DownloadHistoryItem[] = [];

    for (const { attempt, planDownloadLimit, planDownloadLimitType } of attempts) {
      let quotaRemaining: number | null = null;
      if (quotaMap.has(attempt.orderId)) {
        quotaRemaining = quotaMap.get(attempt.orderId)!;
      } else {
        quotaRemaining = await this.calculateQuotaRemaining(
          attempt.orderId,
          planDownloadLimit,
          planDownloadLimitType,
        );
        quotaMap.set(attempt.orderId, quotaRemaining);
      }

      let title = "Unknown Title";
      let slug = "";
      let posterUrl: string | null = null;
      let backdropUrl: string | null = null;
      let djName: string | null = null;

      if (attempt.contentKind === "movie") {
        const movie = moviesMap.get(attempt.contentId);
        if (movie) {
          title = movie.title;
          slug = movie.slug;
          posterUrl = movie.posterUrl;
          backdropUrl = movie.backdropUrl;
        }
        if (attempt.editionId) {
          djName = editionsMap.get(attempt.editionId)?.djName ?? null;
        }
      } else if (attempt.contentKind === "episode") {
        const episode = attempt.episodeId ? episodesMap.get(attempt.episodeId) : null;
        if (episode) {
          title = episode.title;
          slug = attempt.episodeId ?? attempt.contentId;
          posterUrl = episode.thumbnailUrl;
          djName = episode.djName;
        }
      }

      const isRetryEligible =
        attempt.status === "FAILED" && new Date(attempt.retryGraceExpiresAt) > now;

      downloads.push({
        attemptId: attempt.id,
        orderId: attempt.orderId,
        entitlementId: attempt.entitlementId,
        contentKind: attempt.contentKind,
        contentId: attempt.contentId,
        title,
        slug,
        editionId: attempt.editionId,
        episodeId: attempt.episodeId,
        djName,
        posterUrl,
        backdropUrl,
        status: attempt.status,
        attemptNumber: attempt.attemptNumber,
        completedAt: attempt.completedAt ? attempt.completedAt.toISOString() : null,
        tokenExpiresAt: attempt.tokenExpiresAt.toISOString(),
        retryGraceExpiresAt: attempt.retryGraceExpiresAt.toISOString(),
        isRetryEligible,
        downloadLimit: planDownloadLimit,
        downloadLimitType: planDownloadLimitType,
        quotaRemaining,
        failureReason: attempt.failureReason,
        createdAt: attempt.createdAt.toISOString(),
      });
    }

    return {
      downloads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves active, download-eligible commercial licenses for a customer,
   * calculating real-time remaining quota and completed download flags.
   */
  async getDownloadLicenses(customerId: string): Promise<DownloadLicensesResponse> {
    const now = new Date();

    // 1. Fetch active entitlements for customer joined with order and plan_version
    const activeEntitlements = await this.db
      .select({
        entitlement: entitlementsTable,
        orderId: entitlementOrderEffectsTable.orderId,
        downloadLimit: planVersionsTable.downloadLimit,
        downloadLimitType: planVersionsTable.downloadLimitType,
      })
      .from(entitlementsTable)
      .innerJoin(
        entitlementOrderEffectsTable,
        eq(entitlementsTable.id, entitlementOrderEffectsTable.entitlementId),
      )
      .innerJoin(
        ordersTable,
        eq(entitlementOrderEffectsTable.orderId, ordersTable.id),
      )
      .innerJoin(
        planVersionsTable,
        eq(ordersTable.planVersionId, planVersionsTable.id),
      )
      .where(
        and(
          eq(entitlementsTable.customerId, customerId),
          eq(entitlementsTable.status, "ACTIVE"),
          sql`${entitlementsTable.expiresAt} > ${now}`,
        ),
      )
      .orderBy(desc(entitlementsTable.createdAt));

    // Filter out plans where downloadLimit === 0 (downloads explicitly disabled for plan)
    const downloadEligible = activeEntitlements.filter(
      (e) => e.downloadLimit === null || e.downloadLimit > 0,
    );

    if (downloadEligible.length === 0) {
      return { licenses: [] };
    }

    // Collect content IDs for batch fetching titles
    const movieIds = new Set<string>();
    const episodeIds = new Set<string>();

    for (const item of downloadEligible) {
      if (item.entitlement.targetKind === "MOVIE" && item.entitlement.targetMovieContentId) {
        movieIds.add(item.entitlement.targetMovieContentId);
      } else if (item.entitlement.targetKind === "EPISODE" && item.entitlement.targetEpisodeId) {
        episodeIds.add(item.entitlement.targetEpisodeId);
      }
    }

    const moviesMap = new Map<string, { title: string; slug: string; posterUrl: string | null }>();
    if (movieIds.size > 0) {
      const movies = await this.db
        .select({
          id: contentTable.id,
          title: contentTable.title,
          slug: contentTable.slug,
          posterUrl: contentTable.posterUrl,
        })
        .from(contentTable)
        .where(inArray(contentTable.id, Array.from(movieIds)));
      for (const m of movies) {
        moviesMap.set(m.id, m);
      }
    }

    const episodesMap = new Map<string, { title: string; thumbnailUrl: string | null }>();
    if (episodeIds.size > 0) {
      const episodes = await this.db
        .select({
          id: episodesTable.id,
          title: episodesTable.title,
          thumbnailUrl: episodesTable.thumbnailUrl,
        })
        .from(episodesTable)
        .where(inArray(episodesTable.id, Array.from(episodeIds)));
      for (const ep of episodes) {
        episodesMap.set(ep.id, {
          title: ep.title,
          thumbnailUrl: ep.thumbnailUrl ?? null,
        });
      }
    }

    // Query download_attempts for customer to find completed/latest statuses per order
    const attempts = await this.db
      .select({
        orderId: downloadAttemptsTable.orderId,
        status: downloadAttemptsTable.status,
        createdAt: downloadAttemptsTable.createdAt,
      })
      .from(downloadAttemptsTable)
      .where(eq(downloadAttemptsTable.customerId, customerId))
      .orderBy(desc(downloadAttemptsTable.createdAt));

    const completedOrders = new Set<string>();
    const latestStatusByOrder = new Map<string, string>();

    for (const att of attempts) {
      if (att.status === "COMPLETED") {
        completedOrders.add(att.orderId);
      }
      if (!latestStatusByOrder.has(att.orderId)) {
        latestStatusByOrder.set(att.orderId, att.status);
      }
    }

    const quotaMap = new Map<string, number | null>();
    const licenses: DownloadLicenseItem[] = [];

    for (const item of downloadEligible) {
      const { entitlement, orderId, downloadLimit, downloadLimitType } = item;

      let quotaRemaining: number | null = null;
      if (quotaMap.has(orderId)) {
        quotaRemaining = quotaMap.get(orderId)!;
      } else {
        quotaRemaining = await this.calculateQuotaRemaining(
          orderId,
          downloadLimit,
          downloadLimitType,
        );
        quotaMap.set(orderId, quotaRemaining);
      }

      let contentId = "";
      let title = "";
      let slug = "";
      let posterUrl: string | null = null;

      if (entitlement.targetKind === "MOVIE") {
        contentId = entitlement.targetMovieContentId ?? "";
        const movie = moviesMap.get(contentId);
        title = movie?.title ?? "Movie";
        slug = movie?.slug ?? "";
        posterUrl = movie?.posterUrl ?? null;
      } else if (entitlement.targetKind === "EPISODE") {
        contentId = entitlement.targetEpisodeId ?? "";
        const ep = episodesMap.get(contentId);
        title = ep?.title ?? "Episode";
        slug = contentId;
        posterUrl = ep?.thumbnailUrl ?? null;
      } else if (entitlement.targetKind === "CATALOG") {
        contentId = entitlement.id;
        title = "Full Catalog Access";
        slug = "catalog";
      } else {
        contentId =
          entitlement.targetSeriesContentId ?? entitlement.targetSeasonId ?? entitlement.id;
        title = `${entitlement.targetKind} Access`;
        slug = contentId;
      }

      licenses.push({
        entitlementId: entitlement.id,
        orderId,
        targetKind: entitlement.targetKind,
        contentId,
        title,
        slug,
        posterUrl,
        startsAt: entitlement.startsAt.toISOString(),
        expiresAt: entitlement.expiresAt.toISOString(),
        downloadLimit,
        downloadLimitType,
        quotaRemaining,
        hasCompletedDownload: completedOrders.has(orderId),
        latestAttemptStatus: latestStatusByOrder.get(orderId) ?? null,
      });
    }

    return { licenses };
  }
}


