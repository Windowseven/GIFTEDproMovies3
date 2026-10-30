import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { DRIZZLE_DATABASE } from "../../infrastructure/database/database.tokens.js";
import type { ApplicationDatabase } from "../../infrastructure/database/database.module.js";
import {
  catalogGrantRevocationsTable,
  catalogGrantsTable,
  commercialPolicySnapshotContentsTable,
  commercialPolicySnapshotsTable,
  entitlementsTable,
  ordersTable,
} from "../../infrastructure/database/schemas/commercial.schema.js";
import { contentTable } from "../../infrastructure/database/schemas/content.schema.js";
import { seasonsTable } from "../../infrastructure/database/schemas/seasons.schema.js";
import { episodesTable } from "../../infrastructure/database/schemas/episodes.schema.js";
import { usersTable } from "../../infrastructure/database/schemas/users.schema.js";

export interface AccessTargetQuery {
  contentId?: string;
  seasonId?: string;
  episodeId?: string;
}

export interface AccessDecision {
  granted: boolean;
  reason?: string;
  grantType?: "EXACT_ENTITLEMENT" | "CATALOG_GRANT";
  targetKind?: string;
  entitlementId?: string;
  orderId?: string;
  policyType?: string;
  expiresAt?: Date;
}

export interface CustomerLibraryItem {
  id: string;
  targetKind: "MOVIE" | "SERIES" | "SEASON" | "EPISODE" | "CATALOG";
  targetMovieContentId: string | null;
  targetSeriesContentId: string | null;
  targetSeasonId: string | null;
  targetEpisodeId: string | null;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  startsAt: Date;
  expiresAt: Date;
}

export interface CustomerCatalogGrantItem {
  id: string;
  orderId: string;
  validFrom: Date;
  validUntil: Date;
  policyType: string;
  status: "ACTIVE" | "SCHEDULED" | "EXPIRED" | "REVOKED";
  revocationReason?: string | null;
}

export interface CustomerLibraryResponse {
  customerId: string;
  exactEntitlements: CustomerLibraryItem[];
  catalogGrants: CustomerCatalogGrantItem[];
  hasActiveCatalogAccess: boolean;
}

@Injectable()
export class CommercialAccessService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
  ) {}

  /**
   * Evaluates authoritative access decision for a customer to a specified media content.
   * Single-point policy evaluation engine implementing:
   * - Fail-closed security on invalid customer or content
   * - Exact-target active entitlement evaluation
   * - Scope-aware series hierarchy inheritance (SERIES -> SEASON -> EPISODE)
   * - Per-snapshot CATALOG grant evaluation (ALL_CATALOG, CATEGORY_SET, CONTENT_SET)
   * - Revocation enforcement and non-reactivation
   * - Future-scheduled and expired grant boundary checks
   */
  async canAccess(customerId: string, target: AccessTargetQuery): Promise<AccessDecision> {
    if (!customerId) {
      return { granted: false, reason: "INVALID_CUSTOMER" };
    }

    // 1. Verify customer status: fail-closed if non-active or suspended
    const [customer] = await this.db
      .select({ id: usersTable.id, status: usersTable.status })
      .from(usersTable)
      .where(eq(usersTable.id, customerId))
      .limit(1);

    if (!customer || customer.status !== "active") {
      return { granted: false, reason: "CUSTOMER_NOT_ACTIVE" };
    }

    // 2. Resolve content hierarchy and candidate target identifiers
    let targetMovieContentId: string | null = null;
    let targetSeriesContentId: string | null = null;
    let targetSeasonId: string | null = target.seasonId ?? null;
    const targetEpisodeId: string | null = target.episodeId ?? null;
    let rootContentId: string | null = target.contentId ?? null;

    if (targetEpisodeId) {
      const [episode] = await this.db
        .select({
          id: episodesTable.id,
          seasonId: episodesTable.seasonId,
        })
        .from(episodesTable)
        .where(eq(episodesTable.id, targetEpisodeId))
        .limit(1);

      if (!episode) {
        return { granted: false, reason: "EPISODE_NOT_FOUND" };
      }

      targetSeasonId = episode.seasonId;
      const [season] = await this.db
        .select({
          id: seasonsTable.id,
          seriesId: seasonsTable.seriesId,
        })
        .from(seasonsTable)
        .where(eq(seasonsTable.id, episode.seasonId))
        .limit(1);

      if (season) {
        targetSeriesContentId = season.seriesId;
        rootContentId = season.seriesId;
      }
    } else if (targetSeasonId) {
      const [season] = await this.db
        .select({
          id: seasonsTable.id,
          seriesId: seasonsTable.seriesId,
        })
        .from(seasonsTable)
        .where(eq(seasonsTable.id, targetSeasonId))
        .limit(1);

      if (!season) {
        return { granted: false, reason: "SEASON_NOT_FOUND" };
      }

      targetSeriesContentId = season.seriesId;
      rootContentId = season.seriesId;
    } else if (rootContentId) {
      const [content] = await this.db
        .select({
          id: contentTable.id,
          contentType: contentTable.contentType,
        })
        .from(contentTable)
        .where(eq(contentTable.id, rootContentId))
        .limit(1);

      if (!content) {
        return { granted: false, reason: "CONTENT_NOT_FOUND" };
      }

      if (content.contentType === "movie") {
        targetMovieContentId = content.id;
      } else if (content.contentType === "series") {
        targetSeriesContentId = content.id;
      }
    } else {
      return { granted: false, reason: "MISSING_TARGET_PARAMETER" };
    }

    const now = new Date();

    // 3. Exact-target entitlement evaluation with D4 hierarchy inheritance
    const customerEntitlements = await this.db
      .select()
      .from(entitlementsTable)
      .where(
        and(
          eq(entitlementsTable.customerId, customerId),
          sql`${entitlementsTable.targetKind} <> 'CATALOG'`,
        ),
      );

    for (const ent of customerEntitlements) {
      if (ent.status === "REVOKED") {
        continue;
      }

      const startsAt = new Date(ent.startsAt);
      const expiresAt = new Date(ent.expiresAt);

      if (now.getTime() < startsAt.getTime() || now.getTime() >= expiresAt.getTime()) {
        continue;
      }

      // Check matching candidate targets
      if (ent.targetKind === "MOVIE" && targetMovieContentId && ent.targetMovieContentId === targetMovieContentId) {
        return {
          granted: true,
          grantType: "EXACT_ENTITLEMENT",
          targetKind: ent.targetKind,
          entitlementId: ent.id,
          expiresAt,
        };
      }

      if (ent.targetKind === "SERIES" && targetSeriesContentId && ent.targetSeriesContentId === targetSeriesContentId) {
        return {
          granted: true,
          grantType: "EXACT_ENTITLEMENT",
          targetKind: ent.targetKind,
          entitlementId: ent.id,
          expiresAt,
        };
      }

      if (ent.targetKind === "SEASON" && targetSeasonId && ent.targetSeasonId === targetSeasonId) {
        return {
          granted: true,
          grantType: "EXACT_ENTITLEMENT",
          targetKind: ent.targetKind,
          entitlementId: ent.id,
          expiresAt,
        };
      }

      if (ent.targetKind === "EPISODE" && targetEpisodeId && ent.targetEpisodeId === targetEpisodeId) {
        return {
          granted: true,
          grantType: "EXACT_ENTITLEMENT",
          targetKind: ent.targetKind,
          entitlementId: ent.id,
          expiresAt,
        };
      }
    }

    // 4. Multi-Tier Catalog Grants Evaluation
    // Find customer's CATALOG anchor
    const [anchor] = await this.db
      .select()
      .from(entitlementsTable)
      .where(
        and(
          eq(entitlementsTable.customerId, customerId),
          eq(entitlementsTable.targetKind, "CATALOG"),
        ),
      )
      .limit(1);

    if (!anchor || anchor.status === "REVOKED") {
      return { granted: false, reason: "NO_ACTIVE_ENTITLEMENT" };
    }

    // Query active unrevoked catalog grants: valid_from <= now < valid_until
    const activeGrants = await this.db
      .select({
        id: catalogGrantsTable.id,
        orderId: catalogGrantsTable.orderId,
        validFrom: catalogGrantsTable.validFrom,
        validUntil: catalogGrantsTable.validUntil,
      })
      .from(catalogGrantsTable)
      .where(
        and(
          eq(catalogGrantsTable.entitlementId, anchor.id),
          sql`${catalogGrantsTable.validFrom} <= transaction_timestamp()`,
          sql`${catalogGrantsTable.validUntil} > transaction_timestamp()`,
          sql`${catalogGrantsTable.orderId} NOT IN (SELECT order_id FROM ${catalogGrantRevocationsTable})`,
        ),
      )
      .orderBy(desc(catalogGrantsTable.validUntil));

    if (activeGrants.length === 0) {
      return { granted: false, reason: "NO_ACTIVE_ENTITLEMENT" };
    }

    // Evaluate snapshot coverage for each active grant
    const activeOrderIds = activeGrants.map((g) => g.orderId);
    const orders = await this.db
      .select({
        id: ordersTable.id,
        catalogPolicySnapshotId: ordersTable.catalogPolicySnapshotId,
      })
      .from(ordersTable)
      .where(inArray(ordersTable.id, activeOrderIds));

    const orderMap = new Map(orders.map((o) => [o.id, o]));

    for (const grant of activeGrants) {
      const order = orderMap.get(grant.orderId);
      if (!order || !order.catalogPolicySnapshotId) {
        continue;
      }

      const [snapshot] = await this.db
        .select()
        .from(commercialPolicySnapshotsTable)
        .where(eq(commercialPolicySnapshotsTable.id, order.catalogPolicySnapshotId))
        .limit(1);

      if (!snapshot) {
        continue;
      }

      const expiresAt = new Date(grant.validUntil);

      if (snapshot.policyType === "ALL_CATALOG") {
        return {
          granted: true,
          grantType: "CATALOG_GRANT",
          policyType: "ALL_CATALOG",
          orderId: grant.orderId,
          expiresAt,
        };
      }

      if (snapshot.policyType === "CONTENT_SET" || snapshot.policyType === "CATEGORY_SET") {
        // Check if root content ID (movie ID or series ID) is included in snapshot content members
        if (rootContentId) {
          const [member] = await this.db
            .select()
            .from(commercialPolicySnapshotContentsTable)
            .where(
              and(
                eq(
                  commercialPolicySnapshotContentsTable.snapshotId,
                  snapshot.id,
                ),
                eq(
                  commercialPolicySnapshotContentsTable.contentId,
                  rootContentId,
                ),
              ),
            )
            .limit(1);

          if (member) {
            return {
              granted: true,
              grantType: "CATALOG_GRANT",
              policyType: snapshot.policyType,
              orderId: grant.orderId,
              expiresAt,
            };
          }
        }
      }
    }

    return { granted: false, reason: "NO_ACTIVE_ENTITLEMENT" };
  }

  /**
   * Retrieves full customer-owned commercial access library.
   * Enforces customer ownership boundary and distinguishes active, scheduled, expired, and revoked grants.
   */
  async getCustomerLibrary(customerId: string): Promise<CustomerLibraryResponse> {
    const now = new Date();

    // 1. Direct content entitlements
    const entitlements = await this.db
      .select()
      .from(entitlementsTable)
      .where(
        and(
          eq(entitlementsTable.customerId, customerId),
          sql`${entitlementsTable.targetKind} <> 'CATALOG'`,
        ),
      )
      .orderBy(desc(entitlementsTable.createdAt));

    const exactEntitlements: CustomerLibraryItem[] = entitlements.map((ent) => {
      let derivedStatus: "ACTIVE" | "EXPIRED" | "REVOKED" = "ACTIVE";
      if (ent.status === "REVOKED") {
        derivedStatus = "REVOKED";
      } else if (new Date(ent.expiresAt).getTime() <= now.getTime()) {
        derivedStatus = "EXPIRED";
      }

      return {
        id: ent.id,
        targetKind: ent.targetKind as CustomerLibraryItem["targetKind"],
        targetMovieContentId: ent.targetMovieContentId,
        targetSeriesContentId: ent.targetSeriesContentId,
        targetSeasonId: ent.targetSeasonId,
        targetEpisodeId: ent.targetEpisodeId,
        status: derivedStatus,
        startsAt: new Date(ent.startsAt),
        expiresAt: new Date(ent.expiresAt),
      };
    });

    // 2. Catalog grants
    const [anchor] = await this.db
      .select()
      .from(entitlementsTable)
      .where(
        and(
          eq(entitlementsTable.customerId, customerId),
          eq(entitlementsTable.targetKind, "CATALOG"),
        ),
      )
      .limit(1);

    const catalogGrants: CustomerCatalogGrantItem[] = [];
    let hasActiveCatalogAccess = false;

    if (anchor) {
      const grants = await this.db
        .select()
        .from(catalogGrantsTable)
        .where(eq(catalogGrantsTable.entitlementId, anchor.id))
        .orderBy(desc(catalogGrantsTable.validUntil));

      const revocations = await this.db
        .select()
        .from(catalogGrantRevocationsTable);
      const revocationMap = new Map(revocations.map((r) => [r.orderId, r]));

      const grantOrderIds = grants.map((g) => g.orderId);
      const orders = grantOrderIds.length > 0
        ? await this.db
            .select({
              id: ordersTable.id,
              catalogPolicySnapshotId: ordersTable.catalogPolicySnapshotId,
            })
            .from(ordersTable)
            .where(inArray(ordersTable.id, grantOrderIds))
        : [];
      const orderMap = new Map(orders.map((o) => [o.id, o]));

      const snapshotIds = orders.map((o) => o.catalogPolicySnapshotId).filter((id): id is string => Boolean(id));
      const snapshots = snapshotIds.length > 0
        ? await this.db
            .select()
            .from(commercialPolicySnapshotsTable)
            .where(inArray(commercialPolicySnapshotsTable.id, snapshotIds))
        : [];
      const snapshotMap = new Map(snapshots.map((s) => [s.id, s]));

      for (const grant of grants) {
        const order = orderMap.get(grant.orderId);
        const snapshot = order?.catalogPolicySnapshotId ? snapshotMap.get(order.catalogPolicySnapshotId) : null;
        const policyType = snapshot?.policyType ?? "ALL_CATALOG";

        const validFrom = new Date(grant.validFrom);
        const validUntil = new Date(grant.validUntil);
        const revocation = revocationMap.get(grant.orderId);

        let grantStatus: "ACTIVE" | "SCHEDULED" | "EXPIRED" | "REVOKED" = "ACTIVE";
        if (anchor.status === "REVOKED" || revocation) {
          grantStatus = "REVOKED";
        } else if (now.getTime() < validFrom.getTime()) {
          grantStatus = "SCHEDULED";
        } else if (now.getTime() >= validUntil.getTime()) {
          grantStatus = "EXPIRED";
        } else {
          hasActiveCatalogAccess = true;
        }

        catalogGrants.push({
          id: grant.id,
          orderId: grant.orderId,
          validFrom,
          validUntil,
          policyType,
          status: grantStatus,
          revocationReason: revocation?.revocationReason ?? null,
        });
      }
    }

    return {
      customerId,
      exactEntitlements,
      catalogGrants,
      hasActiveCatalogAccess,
    };
  }
}
