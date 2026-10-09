import { Inject, Injectable } from "@nestjs/common";
import { DRIZZLE_DATABASE } from "../../infrastructure/database/database.tokens.js";
import type { ApplicationDatabase } from "../../infrastructure/database/database.module.js";
import {
  type AccessPlanRecord,
  type OfferRecord,
  type PlanVersionRecord,
} from "../../infrastructure/database/schemas/commercial.schema.js";
import { AuditService } from "../audit/audit.service.js";
import type { CreateAccessPlanDto } from "./dto/create-access-plan.dto.js";
import type { CreatePlanVersionDto } from "./dto/create-plan-version.dto.js";
import type { CreateOfferDto } from "./dto/create-offer.dto.js";
import type { UpdateOfferStatusDto } from "./dto/update-offer-status.dto.js";
import {
  AccessPlanCodeConflictException,
  AccessPlanNotFoundException,
  CommercialValidationException,
  OfferCodeConflictException,
  OfferNotFoundException,
  OfferPolicyValidationException,
  OfferStatusTransitionException,
  OfferTargetValidationException,
  PlanVersionConflictException,
  PlanVersionNotFoundException,
} from "./commercial.errors.js";
import { CommercialRepository } from "./commercial.repository.js";

const VALID_OFFER_STATUSES = new Set(["draft", "active", "inactive", "archived"]);

function ensureValidCode(value: string, fieldName: string): string {
  const sanitized = value.trim();
  if (!/^[A-Z0-9][A-Z0-9_-]{0,63}$/u.test(sanitized)) {
    throw new CommercialValidationException(`${fieldName} must be 1-64 characters and use only uppercase alphanumerics, underscores and hyphens.`);
  }
  return sanitized;
}

function ensureValidUuid(value: string | null | undefined, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0 || !/^[0-9a-fA-F-]{36}$/u.test(value.trim())) {
    throw new CommercialValidationException(`${fieldName} must be a valid UUID.`);
  }
  return value.trim();
}

function ensureFutureDateWindow(startsAt: Date, endsAt?: Date | null): void {
  if (endsAt && endsAt.getTime() <= startsAt.getTime()) {
    throw new CommercialValidationException("Offer end time must be later than the start time.");
  }
}

function ensureOfferStatusTransition(currentStatus: string, nextStatus: string): void {
  if (!VALID_OFFER_STATUSES.has(nextStatus)) {
    throw new CommercialValidationException("Offer status must be one of: draft, active, inactive, archived.");
  }

  const transitions: Record<string, Set<string>> = {
    draft: new Set(["active", "inactive", "archived"]),
    active: new Set(["inactive", "archived"]),
    inactive: new Set(["active", "archived"]),
    archived: new Set(),
  };

  if (currentStatus === "archived") {
    throw new OfferStatusTransitionException("Archived offers are terminal and cannot be reactivated or mutated.");
  }

  const allowed = transitions[currentStatus] ?? new Set();
  if (!allowed.has(nextStatus)) {
    throw new OfferStatusTransitionException(`Invalid offer status transition from ${currentStatus} to ${nextStatus}.`);
  }
}

@Injectable()
export class AccessPlanService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
    private readonly repository: CommercialRepository,
    private readonly audit: AuditService,
  ) {}

  async createAccessPlan(dto: CreateAccessPlanDto, actorId: string): Promise<AccessPlanRecord> {
    const normalizedCode = ensureValidCode(dto.code, "Access plan code");
    const name = dto.name.trim();
    if (name.length === 0 || name.length > 255) {
      throw new CommercialValidationException("Access plan name must be 1-255 characters.");
    }

    return await this.db.transaction(async (tx) => {
      const existing = await this.repository.findAccessPlanByCode(tx, normalizedCode);
      if (existing) {
        throw new AccessPlanCodeConflictException();
      }

      const plan = await this.repository.insertAccessPlan(tx, {
        code: normalizedCode,
        name,
      });

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "ACCESS_PLAN_CREATE",
        resourceType: "access_plan",
        resourceId: plan.id,
        metadata: {
          code: plan.code,
          name: plan.name,
        },
        failClosed: true,
      });

      return plan;
    });
  }

  async getAccessPlan(id: string): Promise<AccessPlanRecord> {
    const accessPlan = await this.repository.findAccessPlanById(this.db, ensureValidUuid(id, "Access plan id"));
    if (!accessPlan) {
      throw new AccessPlanNotFoundException();
    }

    return accessPlan;
  }

  async listAccessPlans(): Promise<AccessPlanRecord[]> {
    return await this.repository.listAccessPlans(this.db);
  }
}

@Injectable()
export class PlanVersionService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
    private readonly repository: CommercialRepository,
    private readonly audit: AuditService,
  ) {}

  async createPlanVersion(dto: CreatePlanVersionDto, actorId: string): Promise<PlanVersionRecord> {
    const planId = ensureValidUuid(dto.accessPlanId, "Access plan id");
    const versionNumber = Number(dto.versionNumber);
    const durationValue = Number(dto.durationValue);

    if (!Number.isInteger(versionNumber) || versionNumber <= 0) {
      throw new CommercialValidationException("Plan version number must be a positive integer.");
    }

    if (!Number.isInteger(durationValue) || durationValue <= 0) {
      throw new CommercialValidationException("Plan version duration value must be a positive integer.");
    }

    if (dto.durationUnit !== "HOUR" && dto.durationUnit !== "DAY") {
      throw new CommercialValidationException("Plan version duration unit must be HOUR or DAY.");
    }

    if (dto.downloadLimit !== undefined && dto.downloadLimit !== null && (!Number.isInteger(dto.downloadLimit) || dto.downloadLimit < 0)) {
      throw new CommercialValidationException("Download limit must be a non-negative integer when provided.");
    }

    if (dto.deviceLimit !== undefined && dto.deviceLimit !== null && (!Number.isInteger(dto.deviceLimit) || dto.deviceLimit < 0)) {
      throw new CommercialValidationException("Device limit must be a non-negative integer when provided.");
    }

    if (dto.concurrentStreamLimit !== undefined && dto.concurrentStreamLimit !== null && (!Number.isInteger(dto.concurrentStreamLimit) || dto.concurrentStreamLimit <= 0)) {
      throw new CommercialValidationException("Concurrent stream limit must be a positive integer when provided.");
    }

    return await this.db.transaction(async (tx) => {
      const accessPlan = await this.repository.findAccessPlanById(tx, planId);
      if (!accessPlan) {
        throw new AccessPlanNotFoundException();
      }

      const versions = await this.repository.listPlanVersions(tx, planId);
      const duplicate = versions.some((row) => row.versionNumber === versionNumber);
      if (duplicate) {
        throw new PlanVersionConflictException();
      }

      const created = await this.repository.insertPlanVersion(tx, {
        accessPlanId: planId,
        versionNumber,
        durationValue,
        durationUnit: dto.durationUnit,
        downloadLimit: dto.downloadLimit ?? null,
        downloadLimitType: dto.downloadLimitType ?? null,
        deviceLimit: dto.deviceLimit ?? null,
        concurrentStreamLimit: dto.concurrentStreamLimit ?? null,
      });

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "PLAN_VERSION_CREATE",
        resourceType: "plan_version",
        resourceId: created.id,
        metadata: {
          accessPlanId: planId,
          versionNumber: created.versionNumber,
          durationValue: created.durationValue,
          durationUnit: created.durationUnit,
        },
        failClosed: true,
      });

      return created;
    });
  }

  async getPlanVersion(id: string): Promise<PlanVersionRecord> {
    const planVersion = await this.repository.findPlanVersionById(this.db, ensureValidUuid(id, "Plan version id"));
    if (!planVersion) {
      throw new PlanVersionNotFoundException();
    }

    return planVersion;
  }

  async listPlanVersions(accessPlanId?: string): Promise<PlanVersionRecord[]> {
    if (accessPlanId) {
      const validatedId = ensureValidUuid(accessPlanId, "Access plan id");
      const plan = await this.repository.findAccessPlanById(this.db, validatedId);
      if (!plan) {
        throw new AccessPlanNotFoundException();
      }
      return await this.repository.listPlanVersions(this.db, validatedId);
    }

    return await this.repository.listPlanVersions(this.db);
  }
}

@Injectable()
export class OfferService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
    private readonly repository: CommercialRepository,
    private readonly audit: AuditService,
  ) {}

  async createOffer(dto: CreateOfferDto, actorId: string): Promise<OfferRecord> {
    const code = ensureValidCode(dto.code, "Offer code");
    const name = dto.name.trim();
    if (name.length === 0 || name.length > 255) {
      throw new CommercialValidationException("Offer name must be 1-255 characters.");
    }

    if (!Number.isInteger(dto.priceTzs) || dto.priceTzs < 0) {
      throw new CommercialValidationException("Offer price_tzs must be a non-negative integer.");
    }

    if (!(dto.startsAt instanceof Date) || Number.isNaN(dto.startsAt.getTime())) {
      throw new CommercialValidationException("Offer startsAt must be a valid ISO timestamp.");
    }

    if (dto.endsAt && (!(dto.endsAt instanceof Date) || Number.isNaN(dto.endsAt.getTime()))) {
      throw new CommercialValidationException("Offer endsAt must be a valid ISO timestamp when supplied.");
    }

    ensureFutureDateWindow(dto.startsAt, dto.endsAt ?? null);

    const planVersionId = ensureValidUuid(dto.planVersionId, "Offer plan version id");
    const targetKind = dto.targetKind;

    return await this.db.transaction(async (tx) => {
      const planVersion = await this.repository.findPlanVersionById(tx, planVersionId);
      if (!planVersion) {
        throw new PlanVersionNotFoundException();
      }

      const existingOffer = await this.repository.findOfferByCode(tx, code);
      if (existingOffer) {
        throw new OfferCodeConflictException();
      }

      await this.validateOfferTargetShape(dto, tx);
      this.validateOfferCatalogPolicy(dto);

      const offer = await this.repository.insertOffer(tx, {
        code,
        name,
        status: dto.status ?? "draft",
        startsAt: dto.startsAt,
        endsAt: dto.endsAt ?? null,
        targetKind,
        targetMovieContentId: dto.targetKind === "MOVIE" ? ensureValidUuid(dto.targetMovieContentId ?? null, "Movie target id") : null,
        targetSeriesContentId: dto.targetKind === "SERIES" ? ensureValidUuid(dto.targetSeriesContentId ?? null, "Series target id") : null,
        targetSeasonId: dto.targetKind === "SEASON" ? ensureValidUuid(dto.targetSeasonId ?? null, "Season target id") : null,
        targetEpisodeId: dto.targetKind === "EPISODE" ? ensureValidUuid(dto.targetEpisodeId ?? null, "Episode target id") : null,
        planVersionId,
        priceTzs: dto.priceTzs,
        catalogPolicyType: dto.catalogPolicyType ?? null,
      });

      if (dto.catalogPolicyType === "CATEGORY_SET" && Array.isArray(dto.categoryIds)) {
        const uniqueCategoryIds = [...new Set(dto.categoryIds.map((value) => ensureValidUuid(value, "Category id")))];
        if (uniqueCategoryIds.length === 0) {
          throw new OfferPolicyValidationException("CATEGORY_SET offers must include at least one category member.");
        }

        for (const categoryId of uniqueCategoryIds) {
          const exists = await this.repository.findCategoryById(tx, categoryId);
          if (!exists) {
            throw new OfferPolicyValidationException(`CATEGORY_SET offer references a non-existent category: ${categoryId}`);
          }
        }

        await this.repository.insertOfferCategoryMembers(tx, offer.id, uniqueCategoryIds);
      }

      if (dto.catalogPolicyType === "CONTENT_SET" && Array.isArray(dto.contentIds)) {
        const uniqueContentIds = [...new Set(dto.contentIds.map((value) => ensureValidUuid(value, "Content id")))];
        if (uniqueContentIds.length === 0) {
          throw new OfferPolicyValidationException("CONTENT_SET offers must include at least one content member.");
        }

        for (const contentId of uniqueContentIds) {
          const exists = await this.repository.findContentById(tx, contentId);
          if (!exists) {
            throw new OfferPolicyValidationException(`CONTENT_SET offer references a non-existent content item: ${contentId}`);
          }
        }

        await this.repository.insertOfferContentMembers(tx, offer.id, uniqueContentIds);
      }

      if (dto.catalogPolicyType === "ALL_CATALOG") {
        if ((dto.categoryIds?.length ?? 0) > 0 || (dto.contentIds?.length ?? 0) > 0) {
          throw new OfferPolicyValidationException("ALL_CATALOG offers cannot include category or content members.");
        }
      }

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "OFFER_CREATE",
        resourceType: "offer",
        resourceId: offer.id,
        metadata: {
          code: offer.code,
          name: offer.name,
          status: offer.status,
          targetKind: offer.targetKind,
          planVersionId: offer.planVersionId,
          priceTzs: offer.priceTzs,
        },
        failClosed: true,
      });

      return offer;
    });
  }

  async getOffer(id: string): Promise<OfferRecord> {
    const offer = await this.repository.findOfferById(this.db, ensureValidUuid(id, "Offer id"));
    if (!offer) {
      throw new OfferNotFoundException();
    }
    return offer;
  }

  async listOffers(): Promise<OfferRecord[]> {
    return await this.repository.listOffers(this.db);
  }

  async updateOfferStatus(id: string, dto: UpdateOfferStatusDto, actorId: string): Promise<OfferRecord> {
    const offerId = ensureValidUuid(id, "Offer id");
    const normalizedStatus = dto.status;

    return await this.db.transaction(async (tx) => {
      const offer = await this.repository.findOfferById(tx, offerId);
      if (!offer) {
        throw new OfferNotFoundException();
      }

      ensureOfferStatusTransition(offer.status, normalizedStatus);

      const updated = await this.repository.updateOfferStatus(tx, offerId, normalizedStatus);

      await this.audit.recordEvent({
        tx,
        actorId,
        action: "OFFER_STATUS_UPDATE",
        resourceType: "offer",
        resourceId: offerId,
        metadata: {
          previousStatus: offer.status,
          nextStatus: updated.status,
        },
        failClosed: true,
      });

      return updated;
    });
  }

  private async validateOfferTargetShape(
    dto: CreateOfferDto,
    tx: Parameters<Parameters<ApplicationDatabase["transaction"]>[0]>[0],
  ): Promise<void> {
    const typedIds = [
      dto.targetMovieContentId,
      dto.targetSeriesContentId,
      dto.targetSeasonId,
      dto.targetEpisodeId,
    ];

    if (dto.targetKind === "CATALOG") {
      if (typedIds.some((id) => id !== null && id !== undefined && id.length > 0)) {
        throw new OfferTargetValidationException("CATALOG offers must have all typed target columns null.");
      }
      if (!dto.catalogPolicyType) {
        throw new OfferPolicyValidationException("CATALOG offers require a catalog policy type.");
      }
      return;
    }

    if (dto.catalogPolicyType !== undefined && dto.catalogPolicyType !== null) {
      throw new OfferTargetValidationException("Non-CATALOG offers must not include a catalog policy type.");
    }

    const populated = typedIds.filter((value) => typeof value === "string" && value.trim().length > 0);
    if (populated.length !== 1) {
      throw new OfferTargetValidationException("Each non-CATALOG offer must set exactly one typed target column.");
    }

    const targetId = populated[0] as string;
    const normalizedTargetId = ensureValidUuid(targetId, "Offer target id");

    if (dto.targetKind === "MOVIE") {
      const content = await this.repository.findContentById(tx, normalizedTargetId);
      if (!content || content.contentType !== "movie") {
        throw new OfferTargetValidationException("MOVIE offers must target a movie content item.");
      }
      return;
    }

    if (dto.targetKind === "SERIES") {
      const content = await this.repository.findContentById(tx, normalizedTargetId);
      if (!content || content.contentType !== "series") {
        throw new OfferTargetValidationException("SERIES offers must target a series content item.");
      }
      return;
    }

    if (dto.targetKind === "SEASON") {
      const season = await this.repository.findSeasonById(tx, normalizedTargetId);
      if (!season) {
        throw new OfferTargetValidationException("SEASON offers must target an existing season.");
      }
      const series = await this.repository.findContentById(tx, season.seriesId);
      if (!series || series.contentType !== "series") {
        throw new OfferTargetValidationException("SEASON offers must target a season belonging to a series.");
      }
      return;
    }

    if (dto.targetKind === "EPISODE") {
      const episode = await this.repository.findEpisodeById(tx, normalizedTargetId);
      if (!episode) {
        throw new OfferTargetValidationException("EPISODE offers must target an existing episode.");
      }
      const season = await this.repository.findSeasonById(tx, episode.seasonId);
      if (!season) {
        throw new OfferTargetValidationException("EPISODE offers must target an episode belonging to an existing season.");
      }
      const series = await this.repository.findContentById(tx, season.seriesId);
      if (!series || series.contentType !== "series") {
        throw new OfferTargetValidationException("EPISODE offers must target an episode under a series.");
      }
      return;
    }

    throw new OfferTargetValidationException("Unsupported target kind provided for offer validation.");
  }

  private validateOfferCatalogPolicy(dto: CreateOfferDto): void {
    if (dto.targetKind !== "CATALOG") {
      return;
    }

    const emptyCategoryIds = (dto.categoryIds ?? []).filter((value) => typeof value === "string" && value.trim().length > 0);
    const emptyContentIds = (dto.contentIds ?? []).filter((value) => typeof value === "string" && value.trim().length > 0);

    if (dto.catalogPolicyType === "ALL_CATALOG") {
      if (emptyCategoryIds.length > 0 || emptyContentIds.length > 0) {
        throw new OfferPolicyValidationException("ALL_CATALOG offers cannot include category or content members.");
      }
      return;
    }

    if (dto.catalogPolicyType === "CATEGORY_SET") {
      if (emptyCategoryIds.length === 0) {
        throw new OfferPolicyValidationException("CATEGORY_SET offers require at least one category member.");
      }
      if (emptyContentIds.length > 0) {
        throw new OfferPolicyValidationException("CATEGORY_SET offers cannot include explicit content members.");
      }
      return;
    }

    if (dto.catalogPolicyType === "CONTENT_SET") {
      if (emptyContentIds.length === 0) {
        throw new OfferPolicyValidationException("CONTENT_SET offers require at least one content member.");
      }
      if (emptyCategoryIds.length > 0) {
        throw new OfferPolicyValidationException("CONTENT_SET offers cannot include category members.");
      }
      return;
    }

    throw new OfferPolicyValidationException("Catalog offers must declare a valid catalog policy type: ALL_CATALOG, CATEGORY_SET, or CONTENT_SET.");
  }
}

@Injectable()
export class CommercialService {
  constructor(
    private readonly accessPlans: AccessPlanService,
    private readonly planVersions: PlanVersionService,
    private readonly offers: OfferService,
  ) {}

  async createAccessPlan(dto: CreateAccessPlanDto, actorId: string): Promise<AccessPlanRecord> {
    return await this.accessPlans.createAccessPlan(dto, actorId);
  }

  async getAccessPlan(id: string): Promise<AccessPlanRecord> {
    return await this.accessPlans.getAccessPlan(id);
  }

  async listAccessPlans(): Promise<AccessPlanRecord[]> {
    return await this.accessPlans.listAccessPlans();
  }

  async createPlanVersion(dto: CreatePlanVersionDto, actorId: string): Promise<PlanVersionRecord> {
    return await this.planVersions.createPlanVersion(dto, actorId);
  }

  async getPlanVersion(id: string): Promise<PlanVersionRecord> {
    return await this.planVersions.getPlanVersion(id);
  }

  async listPlanVersions(accessPlanId?: string): Promise<PlanVersionRecord[]> {
    return await this.planVersions.listPlanVersions(accessPlanId);
  }

  async createOffer(dto: CreateOfferDto, actorId: string): Promise<OfferRecord> {
    return await this.offers.createOffer(dto, actorId);
  }

  async getOffer(id: string): Promise<OfferRecord> {
    return await this.offers.getOffer(id);
  }

  async listOffers(): Promise<OfferRecord[]> {
    return await this.offers.listOffers();
  }

  async updateOfferStatus(id: string, dto: UpdateOfferStatusDto, actorId: string): Promise<OfferRecord> {
    return await this.offers.updateOfferStatus(id, dto, actorId);
  }
}
