import { Inject, Injectable } from "@nestjs/common";
import { DRIZZLE_DATABASE } from "../../../infrastructure/database/database.tokens.js";
import type {
  ApplicationDatabase,
  DatabaseClient,
} from "../../../infrastructure/database/database.module.js";
import { CatalogRepository } from "../repositories/catalog.repository.js";
import { AuditService } from "../../audit/audit.service.js";
import { NotificationsService } from "../../notifications/notifications.service.js";
import { SystemSettingsService } from "./system-settings.service.js";
import {
  ContentNotFoundException,
  DefaultEditionRequiredException,
  InvalidLifecycleTransitionException,
  PublicationReadinessFailedException,
  RejectionReasonRequiredException,
  SeriesInitialContentRequiredException,
} from "../catalog.errors.js";
import type { ContentRecord } from "../../../infrastructure/database/schemas/content.schema.js";
import type { MovieEditionRecord } from "../../../infrastructure/database/schemas/movie-editions.schema.js";

@Injectable()
export class ContentLifecycleService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
    private readonly repository: CatalogRepository,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly settings: SystemSettingsService,
  ) {}

  // =========================================================================
  // SUBMISSION & REVIEW WORKFLOW
  // =========================================================================

  async submitForReview(contentId: string, actorId: string): Promise<ContentRecord> {
    return await this.db.transaction(async (tx) => {
      const content = await this.repository.lockContentForUpdate(tx, contentId);
      if (!content) {
        throw new ContentNotFoundException("Content item not found");
      }

      if (content.status !== "draft") {
        throw new InvalidLifecycleTransitionException(
          `Can only submit draft content for review. Current status is ${content.status}`,
        );
      }

      const requiresApproval = await this.settings.isPublishingApprovalRequired(tx);

      if (requiresApproval) {
        // Enqueue in Admin Review Queue
        const updated = await this.repository.updateContent(tx, contentId, {
          status: "pending_review",
          submittedBy: actorId,
          submittedAt: new Date(),
        });

        await this.audit.recordEvent({
          tx,
          actorId,
          action: "CONTENT_SUBMIT_REVIEW",
          resourceType: "content",
          resourceId: contentId,
          metadata: {
            previousStatus: "draft",
            newStatus: "pending_review",
            requiresApproval: true,
          },
          failClosed: true,
        });

        return updated;
      }

      // Auto-Publishing Gate (when publishingRequiresApproval is false)
      await this.validatePublicationReadiness(tx, content);

      const published = await this.repository.updateContent(tx, contentId, {
        status: "published",
        submittedBy: actorId,
        submittedAt: new Date(),
        publishedAt: new Date(),
        approvedBy: null, // System auto-published
        rejectionReason: null,
      });

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "CONTENT_PUBLISH",
        resourceType: "content",
        resourceId: contentId,
        metadata: {
          autoPublished: true,
          previousStatus: "draft",
          newStatus: "published",
        },
        failClosed: true,
      });

      return published;
    });
  }

  // =========================================================================
  // PUBLICATION GATE & AUTHORITATIVE 9/9 READINESS VALIDATOR
  // =========================================================================

  async publishContent(contentId: string, actorId: string): Promise<ContentRecord> {
    return await this.db.transaction(async (tx) => {
      const content = await this.repository.lockContentForUpdate(tx, contentId);
      if (!content) {
        throw new ContentNotFoundException("Content item not found");
      }

      if (content.status === "archived") {
        throw new InvalidLifecycleTransitionException(
          "Archived content cannot be directly published. It must first be restored to draft.",
        );
      }

      if (content.status === "published") {
        return content;
      }

      // Authoritative 9-Point Publication Readiness Validator
      await this.validatePublicationReadiness(tx, content);

      const published = await this.repository.updateContent(tx, contentId, {
        status: "published",
        publishedAt: new Date(),
        approvedBy: actorId,
        rejectionReason: null,
      });

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "CONTENT_PUBLISH",
        resourceType: "content",
        resourceId: contentId,
        metadata: {
          previousStatus: content.status,
          newStatus: "published",
        },
        failClosed: true,
      });

      return published;
    });
  }

  /**
   * The authoritative 9-point publication readiness checklist defined in ARCH-018 Section 6.
   * Executed strictly inside the publishing database transaction under row locks.
   */
  async validatePublicationReadiness(
    tx: DatabaseClient,
    content: ContentRecord,
  ): Promise<void> {
    const missing: string[] = [];

    // 1. basicInfo
    const hasBasicInfo =
      Boolean(content.title && content.title.trim().length > 0) &&
      Boolean(content.description && content.description.trim().length > 0) &&
      content.releaseYear !== null &&
      content.releaseYear >= 1900 &&
      (content.contentType === "series" || (content.durationMinutes !== null && content.durationMinutes >= 1));

    if (!hasBasicInfo) {
      missing.push("basicInfo");
    }

    // 2. poster (vertical 2:3 image URL)
    if (!content.posterUrl || content.posterUrl.trim().length === 0) {
      missing.push("poster");
    }

    // 3. backdrop (horizontal 16:9 image URL)
    if (!content.backdropUrl || content.backdropUrl.trim().length === 0) {
      missing.push("backdrop");
    }

    // 4. trailer (valid trailer URL)
    if (!content.trailerUrl || content.trailerUrl.trim().length === 0) {
      missing.push("trailer");
    }

    // 5. categories: COUNT(content_categories) >= 1
    const categoryCount = await this.repository.countCategories(tx, content.id);
    if (categoryCount < 1) {
      missing.push("categories");
    }

    // 6. countries: COUNT(content_countries) >= 1
    const countryCount = await this.repository.countCountries(tx, content.id);
    if (countryCount < 1) {
      missing.push("countries");
    }

    // Type-specific checks (7, 8, 9)
    if (content.contentType === "movie") {
      const editions = await this.repository.findMovieEditions(tx, content.id);

      // 7. djAssigned: At least 1 edition with assigned DJ
      const hasDjAssigned = editions.some((e) => Boolean(e.djId));
      if (!hasDjAssigned) {
        missing.push("djAssigned");
      }

      // Default edition verification (under key share lock)
      const defaultEdition = await this.repository.lockDefaultEditionForKeyShare(tx, content.id);
      if (!defaultEdition) {
        missing.push("defaultEdition");
        missing.push("streamingMedia");
        missing.push("downloadMedia");
      } else {
        // 8. streamingMedia: Default edition has streaming_status == 'ready' and non-empty key
        if (
          defaultEdition.streamingStatus !== "ready" ||
          !defaultEdition.streamingFileKey ||
          defaultEdition.streamingFileKey.trim().length === 0
        ) {
          missing.push("streamingMedia");
        }

        // 9. downloadMedia: Default edition has download_status == 'ready' and non-empty key
        if (
          defaultEdition.downloadStatus !== "ready" ||
          !defaultEdition.downloadFileKey ||
          defaultEdition.downloadFileKey.trim().length === 0
        ) {
          missing.push("downloadMedia");
        }
      }
    } else if (content.contentType === "series") {
      // 7. djAssigned: Series has lead_dj_id in series_metadata
      const metadata = await this.repository.findSeriesMetadata(tx, content.id);
      if (!metadata || !metadata.leadDjId) {
        missing.push("djAssigned");
      }

      // Series initial publication requirement: Season 1 and Episode 1 must exist with ready media
      const season1 = await this.repository.findSeasonByNumber(tx, content.id, 1);
      if (!season1) {
        missing.push("season1");
        missing.push("episode1");
        missing.push("streamingMedia");
        missing.push("downloadMedia");
      } else {
        const episode1 = await this.repository.findEpisodeByNumber(tx, season1.id, 1);
        if (!episode1) {
          missing.push("episode1");
          missing.push("streamingMedia");
          missing.push("downloadMedia");
        } else {
          // 8. streamingMedia: Episode 1 in Season 1 has streaming_status == 'ready' and non-empty key
          if (
            episode1.streamingStatus !== "ready" ||
            !episode1.streamingFileKey ||
            episode1.streamingFileKey.trim().length === 0
          ) {
            missing.push("streamingMedia");
          }

          // 9. downloadMedia: Episode 1 in Season 1 has download_status == 'ready' and non-empty key
          if (
            episode1.downloadStatus !== "ready" ||
            !episode1.downloadFileKey ||
            episode1.downloadFileKey.trim().length === 0
          ) {
            missing.push("downloadMedia");
          }
        }
      }
    }

    if (missing.length > 0) {
      if (content.contentType === "series" && (missing.includes("season1") || missing.includes("episode1"))) {
        throw new SeriesInitialContentRequiredException(
          "Initial series publication requires Season 1 and Episode 1 with ready media.",
        );
      }
      if (content.contentType === "movie" && missing.includes("defaultEdition")) {
        throw new DefaultEditionRequiredException(
          "A published movie must have an active, verified default edition.",
        );
      }
      throw new PublicationReadinessFailedException(
        missing,
        `Content is not ready for publication. Missing: ${missing.join(", ")}`,
      );
    }
  }

  // =========================================================================
  // UNPUBLISH & ARCHIVE LIFECYCLE
  // =========================================================================

  async unpublishContent(
    contentId: string,
    actorId: string,
    reason?: string,
  ): Promise<ContentRecord> {
    return await this.db.transaction(async (tx) => {
      const content = await this.repository.lockContentForUpdate(tx, contentId);
      if (!content) {
        throw new ContentNotFoundException("Content item not found");
      }

      if (content.status === "archived") {
        throw new InvalidLifecycleTransitionException("Cannot unpublish archived content");
      }

      const updated = await this.repository.updateContent(tx, contentId, {
        status: "unpublished",
        unpublishedAt: new Date(),
      });

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "CONTENT_UNPUBLISH",
        resourceType: "content",
        resourceId: contentId,
        metadata: {
          previousStatus: content.status,
          newStatus: "unpublished",
          reason: reason ?? "Manual unpublish",
        },
        failClosed: true,
      });

      return updated;
    });
  }

  async archiveContent(contentId: string, actorId: string): Promise<ContentRecord> {
    return await this.db.transaction(async (tx) => {
      const content = await this.repository.lockContentForUpdate(tx, contentId);
      if (!content) {
        throw new ContentNotFoundException("Content item not found");
      }

      const updated = await this.repository.updateContent(tx, contentId, {
        status: "archived",
        archivedAt: new Date(),
      });

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "CONTENT_ARCHIVE",
        resourceType: "content",
        resourceId: contentId,
        metadata: {
          previousStatus: content.status,
          newStatus: "archived",
        },
        failClosed: true,
      });

      return updated;
    });
  }

  /**
   * Authoritative Archive Restoration (Final PO Decision):
   * Strictly ARCHIVED -> DRAFT.
   * Direct restoration to PUBLISHED is strictly rejected.
   */
  async restoreArchivedContent(contentId: string, actorId: string): Promise<ContentRecord> {
    return await this.db.transaction(async (tx) => {
      const content = await this.repository.lockContentForUpdate(tx, contentId);
      if (!content) {
        throw new ContentNotFoundException("Content item not found");
      }

      if (content.status !== "archived") {
        throw new InvalidLifecycleTransitionException(
          `Can only restore archived content. Current status is ${content.status}`,
        );
      }

      const restored = await this.repository.updateContent(tx, contentId, {
        status: "draft",
        archivedAt: null,
        publishedAt: null,
        unpublishedAt: null,
        submittedAt: null,
        submittedBy: null,
        approvedBy: null,
        rejectionReason: null,
      });

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "CONTENT_RESTORE_DRAFT",
        resourceType: "content",
        resourceId: contentId,
        metadata: {
          previousStatus: "archived",
          newStatus: "draft",
        },
        failClosed: true,
      });

      return restored;
    });
  }

  // =========================================================================
  // REJECTION WORKFLOW
  // =========================================================================

  async rejectContent(
    contentId: string,
    rejectionReason: string,
    actorId: string,
  ): Promise<ContentRecord> {
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      throw new RejectionReasonRequiredException("A written rejection reason is required.");
    }

    let recipientId: string | null = null;
    let rejectedContent: ContentRecord;

    await this.db.transaction(async (tx) => {
      const content = await this.repository.lockContentForUpdate(tx, contentId);
      if (!content) {
        throw new ContentNotFoundException("Content item not found");
      }

      if (content.status !== "pending_review") {
        throw new InvalidLifecycleTransitionException(
          `Can only reject content currently in pending_review. Current status is ${content.status}`,
        );
      }

      recipientId = content.assignedTo ?? content.submittedBy ?? content.createdBy;

      rejectedContent = await this.repository.updateContent(tx, contentId, {
        status: "draft",
        rejectionReason,
      });

      await this.repository.insertReviewNote(tx, contentId, actorId, rejectionReason);

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "CONTENT_REJECT",
        resourceType: "content",
        resourceId: contentId,
        metadata: {
          previousStatus: "pending_review",
          newStatus: "draft",
          rejectionReason,
        },
        failClosed: true,
      });
    });

    // Post-commit async trigger: notify author using existing NotificationsService
    if (recipientId) {
      try {
        await this.notifications.createNotification(
          recipientId,
          "CATALOG_REJECTION",
          "Content Review: Changes Requested",
          `Your submission for "${rejectedContent!.title}" was rejected: ${rejectionReason}`,
          { contentId, slug: rejectedContent!.slug },
        );
      } catch {
        // Notification delivery error must not roll back the committed rejection decision
      }
    }

    return rejectedContent!;
  }

  // =========================================================================
  // MOVIE DEFAULT EDITION OUTAGE & FALLBACK (Cases A & B)
  // =========================================================================

  async handleMovieEditionFailure(
    movieId: string,
    failedEditionId: string,
    actorId: string,
  ): Promise<{ content: ContentRecord; editions: MovieEditionRecord[] }> {
    return await this.db.transaction(async (tx) => {
      // Canonical lock order: content FOR UPDATE -> movie_editions FOR UPDATE ORDER BY id ASC
      const content = await this.repository.lockContentForUpdate(tx, movieId);
      if (!content) {
        throw new ContentNotFoundException("Movie not found");
      }

      if (content.contentType !== "movie") {
        throw new InvalidLifecycleTransitionException("Content is not a movie");
      }

      const editions = await this.repository.lockMovieEditionsForUpdate(tx, movieId);
      const failedEdition = editions.find((e) => e.id === failedEditionId);
      if (!failedEdition) {
        throw new ContentNotFoundException("Edition not found on specified movie");
      }

      // Mark the failed edition as failed and unavailable
      await this.repository.updateMovieEdition(tx, failedEditionId, {
        streamingStatus: "failed",
        isAvailable: false,
      });

      let updatedContent = content;

      // If the failed edition was the default edition, execute Fallback logic
      if (failedEdition.isDefault) {
        // Look for a secondary ready edition (Case A)
        const eligibleReplacement = editions.find(
          (e) =>
            e.id !== failedEditionId &&
            e.streamingStatus === "ready" &&
            e.downloadStatus === "ready" &&
            e.isAvailable === true,
        );

        if (eligibleReplacement) {
          // Case A: Promote healthy replacement to default, movie remains published
          // Demote existing default(s) first to avoid transient unique constraint violation
          for (const edition of editions) {
            if (edition.id === failedEditionId || edition.isDefault) {
              await this.repository.updateMovieEdition(tx, edition.id, {
                isDefault: false,
              });
            }
          }
          // Promote eligible replacement
          await this.repository.updateMovieEdition(tx, eligibleReplacement.id, {
            isDefault: true,
            isAvailable: true,
          });

          await this.audit.recordEvent({
            tx,
            actorId,
            action: "MOVIE_EDITION_OUTAGE_FALLBACK",
            resourceType: "content",
            resourceId: movieId,
            metadata: {
              case: "A",
              previousDefaultId: failedEditionId,
              newDefaultId: eligibleReplacement.id,
              movieRemainsPublished: content.status === "published",
            },
            failClosed: true,
          });
        } else {
          // Case B: No ready edition exists. Demote failed default.
          await this.repository.updateMovieEdition(tx, failedEditionId, {
            isDefault: false,
          });

          // If movie was published, it must transition immediately to UNPUBLISHED
          if (content.status === "published") {
            updatedContent = await this.repository.updateContent(tx, movieId, {
              status: "unpublished",
              unpublishedAt: new Date(),
            });

            await this.audit.recordEvent({
              tx,
              actorId,
              action: "CONTENT_UNPUBLISH",
              resourceType: "content",
              resourceId: movieId,
              metadata: {
                reason: "DEFAULT_EDITION_MEDIA_UNAVAILABLE",
                case: "B",
              },
              failClosed: true,
            });
          }

          await this.audit.recordEvent({
            tx,
            actorId,
            action: "MOVIE_EDITION_OUTAGE_FALLBACK",
            resourceType: "content",
            resourceId: movieId,
            metadata: {
              case: "B",
              movieUnpublished: content.status === "published",
            },
            failClosed: true,
          });
        }
      }

      const finalEditions = await this.repository.findMovieEditions(tx, movieId);
      return { content: updatedContent, editions: finalEditions };
    });
  }
}
