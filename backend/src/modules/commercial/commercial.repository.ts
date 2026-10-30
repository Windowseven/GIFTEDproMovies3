import { Injectable } from "@nestjs/common";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { DatabaseClient } from "../../infrastructure/database/database.module.js";
export type { DatabaseClient };
import {
  accessPlansTable,
  catalogGrantRevocationsTable,
  catalogGrantsTable,
  commercialPolicySnapshotCategoriesTable,
  commercialPolicySnapshotContentsTable,
  commercialPolicySnapshotsTable,
  entitlementOrderEffectsTable,
  entitlementsTable,
  fulfillmentsTable,
  offerCatalogPolicyCategoryMembersTable,
  offerCatalogPolicyContentMembersTable,
  offersTable,
  ordersTable,
  paymentAttemptsTable,
  planVersionsTable,
  settlementsTable,
} from "../../infrastructure/database/schemas/commercial.schema.js";
import { categoriesTable } from "../../infrastructure/database/schemas/categories.schema.js";
import { contentTable } from "../../infrastructure/database/schemas/content.schema.js";
import { contentCategoriesTable } from "../../infrastructure/database/schemas/content-taxonomies.schema.js";
import { seasonsTable } from "../../infrastructure/database/schemas/seasons.schema.js";
import { episodesTable } from "../../infrastructure/database/schemas/episodes.schema.js";
import type {
  AccessPlanRecord,
  CatalogGrantRecord,
  CatalogGrantRevocationRecord,
  CommercialPolicySnapshotRecord,
  EntitlementOrderEffectRecord,
  EntitlementRecord,
  FulfillmentRecord,
  NewAccessPlanRecord,
  NewCatalogGrantRecord,
  NewCatalogGrantRevocationRecord,
  NewCommercialPolicySnapshotRecord,
  NewEntitlementOrderEffectRecord,
  NewEntitlementRecord,
  NewFulfillmentRecord,
  NewOfferRecord,
  NewOrderRecord,
  NewPaymentAttemptRecord,
  NewPlanVersionRecord,
  NewSettlementRecord,
  OfferRecord,
  OrderRecord,
  PaymentAttemptRecord,
  PlanVersionRecord,
  SettlementRecord,
} from "../../infrastructure/database/schemas/commercial.schema.js";


@Injectable()
export class CommercialRepository {

  async findAccessPlanById(client: DatabaseClient, id: string): Promise<AccessPlanRecord | null> {
    const [row] = await client
      .select()
      .from(accessPlansTable)
      .where(eq(accessPlansTable.id, id))
      .limit(1);

    return row ?? null;
  }

  async findAccessPlanByCode(client: DatabaseClient, code: string): Promise<AccessPlanRecord | null> {
    const [row] = await client
      .select()
      .from(accessPlansTable)
      .where(eq(accessPlansTable.code, code))
      .limit(1);

    return row ?? null;
  }

  async listAccessPlans(client: DatabaseClient): Promise<AccessPlanRecord[]> {
    return await client.select().from(accessPlansTable).orderBy(accessPlansTable.createdAt);
  }

  async insertAccessPlan(client: DatabaseClient, values: NewAccessPlanRecord): Promise<AccessPlanRecord> {
    const [row] = await client.insert(accessPlansTable).values(values).returning();
    return row!;
  }

  async findPlanVersionById(client: DatabaseClient, id: string): Promise<PlanVersionRecord | null> {
    const [row] = await client
      .select()
      .from(planVersionsTable)
      .where(eq(planVersionsTable.id, id))
      .limit(1);

    return row ?? null;
  }

  async listPlanVersions(client: DatabaseClient, accessPlanId?: string): Promise<PlanVersionRecord[]> {
    const query = client.select().from(planVersionsTable);
    if (accessPlanId) {
      return await query.where(eq(planVersionsTable.accessPlanId, accessPlanId));
    }
    return await query.orderBy(planVersionsTable.createdAt);
  }

  async insertPlanVersion(client: DatabaseClient, values: NewPlanVersionRecord): Promise<PlanVersionRecord> {
    const [row] = await client.insert(planVersionsTable).values(values).returning();
    return row!;
  }

  async findOfferById(client: DatabaseClient, id: string): Promise<OfferRecord | null> {
    const [row] = await client.select().from(offersTable).where(eq(offersTable.id, id)).limit(1);
    return row ?? null;
  }

  async findOfferByCode(client: DatabaseClient, code: string): Promise<OfferRecord | null> {
    const [row] = await client.select().from(offersTable).where(eq(offersTable.code, code)).limit(1);
    return row ?? null;
  }

  async listOffers(client: DatabaseClient): Promise<OfferRecord[]> {
    return await client.select().from(offersTable).orderBy(offersTable.createdAt);
  }

  async insertOffer(client: DatabaseClient, values: NewOfferRecord): Promise<OfferRecord> {
    const [row] = await client.insert(offersTable).values(values).returning();
    return row!;
  }

  async updateOfferStatus(client: DatabaseClient, id: string, status: OfferRecord["status"]): Promise<OfferRecord> {
    const [row] = await client
      .update(offersTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(offersTable.id, id))
      .returning();

    return row!;
  }

  async insertOfferCategoryMembers(
    client: DatabaseClient,
    offerId: string,
    categoryIds: readonly string[],
  ): Promise<void> {
    if (categoryIds.length === 0) return;

    await client.insert(offerCatalogPolicyCategoryMembersTable).values(
      categoryIds.map((categoryId) => ({ offerId, categoryId })),
    );
  }

  async insertOfferContentMembers(
    client: DatabaseClient,
    offerId: string,
    contentIds: readonly string[],
  ): Promise<void> {
    if (contentIds.length === 0) return;

    await client.insert(offerCatalogPolicyContentMembersTable).values(
      contentIds.map((contentId) => ({ offerId, contentId })),
    );
  }

  async findCategoryById(client: DatabaseClient, id: string): Promise<{ id: string } | null> {
    const [row] = await client
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(eq(categoriesTable.id, id))
      .limit(1);

    return row ?? null;
  }

  async findContentById(client: DatabaseClient, id: string): Promise<{ id: string; contentType: string } | null> {
    const [row] = await client
      .select({ id: contentTable.id, contentType: contentTable.contentType })
      .from(contentTable)
      .where(eq(contentTable.id, id))
      .limit(1);

    return row ?? null;
  }

  async findSeasonById(client: DatabaseClient, id: string): Promise<{ id: string; seriesId: string } | null> {
    const [row] = await client
      .select({ id: seasonsTable.id, seriesId: seasonsTable.seriesId })
      .from(seasonsTable)
      .where(eq(seasonsTable.id, id))
      .limit(1);

    return row ?? null;
  }

  async findEpisodeById(client: DatabaseClient, id: string): Promise<{ id: string; seasonId: string } | null> {
    const [row] = await client
      .select({ id: episodesTable.id, seasonId: episodesTable.seasonId })
      .from(episodesTable)
      .where(eq(episodesTable.id, id))
      .limit(1);

    return row ?? null;
  }

  async findExistingOfferPolicyCategoryMembers(client: DatabaseClient, offerId: string): Promise<string[]> {
    const rows = await client
      .select({ categoryId: offerCatalogPolicyCategoryMembersTable.categoryId })
      .from(offerCatalogPolicyCategoryMembersTable)
      .where(eq(offerCatalogPolicyCategoryMembersTable.offerId, offerId));

    return rows.map((row) => row.categoryId);
  }

  async findExistingOfferPolicyContentMembers(client: DatabaseClient, offerId: string): Promise<string[]> {
    const rows = await client
      .select({ contentId: offerCatalogPolicyContentMembersTable.contentId })
      .from(offerCatalogPolicyContentMembersTable)
      .where(eq(offerCatalogPolicyContentMembersTable.offerId, offerId));

    return rows.map((row) => row.contentId);
  }

  async clearOfferCategoryMembers(client: DatabaseClient, offerId: string): Promise<void> {
    await client
      .delete(offerCatalogPolicyCategoryMembersTable)
      .where(eq(offerCatalogPolicyCategoryMembersTable.offerId, offerId));
  }

  async clearOfferContentMembers(client: DatabaseClient, offerId: string): Promise<void> {
    await client
      .delete(offerCatalogPolicyContentMembersTable)
      .where(eq(offerCatalogPolicyContentMembersTable.offerId, offerId));
  }

  async findOrderById(client: DatabaseClient, id: string): Promise<OrderRecord | null> {
    const [row] = await client
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id))
      .limit(1);

    return row ?? null;
  }

  async findOrderByIdForCustomer(
    client: DatabaseClient,
    id: string,
    customerId: string,
  ): Promise<OrderRecord | null> {
    const [row] = await client
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.id, id), eq(ordersTable.customerId, customerId)))
      .limit(1);

    return row ?? null;
  }

  async findOrderByCustomerAndIdempotencyKey(
    client: DatabaseClient,
    customerId: string,
    idempotencyKey: string,
  ): Promise<OrderRecord | null> {
    const [row] = await client
      .select()
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.customerId, customerId),
          eq(ordersTable.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  async insertOrder(client: DatabaseClient, values: NewOrderRecord): Promise<OrderRecord> {
    const [row] = await client.insert(ordersTable).values(values).returning();
    return row!;
  }

  async insertPolicySnapshot(
    client: DatabaseClient,
    values: NewCommercialPolicySnapshotRecord,
  ): Promise<CommercialPolicySnapshotRecord> {
    const [row] = await client.insert(commercialPolicySnapshotsTable).values(values).returning();
    return row!;
  }

  async insertPolicySnapshotCategories(
    client: DatabaseClient,
    snapshotId: string,
    categoryIds: readonly string[],
  ): Promise<void> {
    if (categoryIds.length === 0) return;

    await client.insert(commercialPolicySnapshotCategoriesTable).values(
      categoryIds.map((categoryId) => ({ snapshotId, categoryId })),
    );
  }

  async insertPolicySnapshotContents(
    client: DatabaseClient,
    snapshotId: string,
    contentIds: readonly string[],
  ): Promise<void> {
    if (contentIds.length === 0) return;

    await client.insert(commercialPolicySnapshotContentsTable).values(
      contentIds.map((contentId) => ({ snapshotId, contentId })),
    );
  }

  async resolvePublishedContentIdsForCategories(
    client: DatabaseClient,
    categoryIds: readonly string[],
  ): Promise<string[]> {
    if (categoryIds.length === 0) return [];

    const rows = await client
      .selectDistinct({ contentId: contentCategoriesTable.contentId })
      .from(contentCategoriesTable)
      .innerJoin(contentTable, eq(contentCategoriesTable.contentId, contentTable.id))
      .where(
        and(
          inArray(contentCategoriesTable.categoryId, [...categoryIds]),
          eq(contentTable.status, "published"),
        ),
      );

    return rows.map((r) => r.contentId);
  }


  async findPaymentAttemptById(
    client: DatabaseClient,
    attemptId: string,
  ): Promise<PaymentAttemptRecord | null> {
    const [row] = await client
      .select()
      .from(paymentAttemptsTable)
      .where(eq(paymentAttemptsTable.id, attemptId))
      .limit(1);

    return row ?? null;
  }

  async findPaymentAttemptsForOrder(
    client: DatabaseClient,
    orderId: string,
  ): Promise<PaymentAttemptRecord[]> {
    return client
      .select()
      .from(paymentAttemptsTable)
      .where(eq(paymentAttemptsTable.orderId, orderId))
      .orderBy(paymentAttemptsTable.attemptNumber);
  }

  async findActiveUnresolvedAttemptForOrder(
    client: DatabaseClient,
    orderId: string,
  ): Promise<PaymentAttemptRecord | null> {
    const [row] = await client
      .select()
      .from(paymentAttemptsTable)
      .where(
        and(
          eq(paymentAttemptsTable.orderId, orderId),
          inArray(paymentAttemptsTable.status, ["PENDING", "UNKNOWN"]),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  async getMaxAttemptNumberForOrder(
    client: DatabaseClient,
    orderId: string,
  ): Promise<number> {
    const rows = await client
      .select({ attemptNumber: paymentAttemptsTable.attemptNumber })
      .from(paymentAttemptsTable)
      .where(eq(paymentAttemptsTable.orderId, orderId));

    if (rows.length === 0) return 0;
    return Math.max(...rows.map((r) => r.attemptNumber));
  }

  async insertPaymentAttempt(
    client: DatabaseClient,
    values: NewPaymentAttemptRecord,
  ): Promise<PaymentAttemptRecord> {
    const [row] = await client.insert(paymentAttemptsTable).values(values).returning();
    return row!;
  }

  async updatePaymentAttemptStatus(
    client: DatabaseClient,
    id: string,
    status: "PENDING" | "UNKNOWN" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "EXPIRED",
    providerEventId?: string,
    providerReference?: string,
  ): Promise<PaymentAttemptRecord> {
    const updateValues: Partial<NewPaymentAttemptRecord> = {
      status,
      updatedAt: new Date(),
    };
    if (providerEventId !== undefined) {
      updateValues.providerEventId = providerEventId;
    }
    if (providerReference !== undefined) {
      updateValues.providerReference = providerReference;
    }

    const [row] = await client
      .update(paymentAttemptsTable)
      .set(updateValues)
      .where(eq(paymentAttemptsTable.id, id))
      .returning();

    return row!;
  }

  async findPaymentAttemptByProviderEvent(
    client: DatabaseClient,
    providerName: string,
    providerEventId: string,
  ): Promise<PaymentAttemptRecord | null> {
    const [row] = await client
      .select()
      .from(paymentAttemptsTable)
      .where(
        and(
          eq(paymentAttemptsTable.providerName, providerName),
          eq(paymentAttemptsTable.providerEventId, providerEventId),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  async findPaymentAttemptByProviderReference(
    client: DatabaseClient,
    providerName: string,
    providerReference: string,
  ): Promise<PaymentAttemptRecord | null> {
    const [row] = await client
      .select()
      .from(paymentAttemptsTable)
      .where(
        and(
          eq(paymentAttemptsTable.providerName, providerName),
          eq(paymentAttemptsTable.providerReference, providerReference),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  async findStaleUnresolvedPaymentAttempts(
    client: DatabaseClient,
    olderThanMinutes: number,
    limit: number,
  ): Promise<PaymentAttemptRecord[]> {
    const thresholdDate = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    return await client
      .select()
      .from(paymentAttemptsTable)
      .where(
        sql`${paymentAttemptsTable.status} IN ('PENDING', 'UNKNOWN') AND ${paymentAttemptsTable.providerReference} IS NOT NULL AND ${paymentAttemptsTable.createdAt} <= ${thresholdDate}`,
      )
      .orderBy(asc(paymentAttemptsTable.createdAt))
      .limit(limit);
  }

  async findSettlementByProviderEvent(
    client: DatabaseClient,
    providerName: string,
    providerEventId: string,
  ): Promise<SettlementRecord | null> {
    const [row] = await client
      .select()
      .from(settlementsTable)
      .where(
        and(
          eq(settlementsTable.providerName, providerName),
          eq(settlementsTable.providerEventId, providerEventId),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  async findSettlementByPaymentAttemptId(
    client: DatabaseClient,
    paymentAttemptId: string,
  ): Promise<SettlementRecord | null> {
    const [row] = await client
      .select()
      .from(settlementsTable)
      .where(eq(settlementsTable.paymentAttemptId, paymentAttemptId))
      .limit(1);

    return row ?? null;
  }

  async insertSettlement(
    client: DatabaseClient,
    values: NewSettlementRecord,
  ): Promise<SettlementRecord> {
    const [row] = await client.insert(settlementsTable).values(values).returning();
    return row!;
  }

  async updateOrderStatus(
    client: DatabaseClient,
    orderId: string,
    status: "PENDING_PAYMENT" | "PAID" | "EXPIRED" | "CANCELLED",
  ): Promise<OrderRecord> {
    const [row] = await client
      .update(ordersTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(ordersTable.id, orderId))
      .returning();

    return row!;
  }

  async findFulfillmentById(client: DatabaseClient, id: string): Promise<FulfillmentRecord | null> {
    const [row] = await client
      .select()
      .from(fulfillmentsTable)
      .where(eq(fulfillmentsTable.id, id))
      .limit(1);

    return row ?? null;
  }

  async findFulfillmentByOrderId(client: DatabaseClient, orderId: string): Promise<FulfillmentRecord | null> {
    const [row] = await client
      .select()
      .from(fulfillmentsTable)
      .where(eq(fulfillmentsTable.orderId, orderId))
      .limit(1);

    return row ?? null;
  }

  async insertFulfillment(
    client: DatabaseClient,
    values: NewFulfillmentRecord,
  ): Promise<FulfillmentRecord | null> {
    const [row] = await client
      .insert(fulfillmentsTable)
      .values(values)
      .onConflictDoNothing({ target: fulfillmentsTable.orderId })
      .returning();

    return row ?? null;
  }

  async updateFulfillment(
    client: DatabaseClient,
    id: string,
    values: Partial<NewFulfillmentRecord>,
  ): Promise<FulfillmentRecord | null> {
    const [row] = await client
      .update(fulfillmentsTable)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(fulfillmentsTable.id, id))
      .returning();

    return row ?? null;
  }

  async findEntitlementById(client: DatabaseClient, id: string): Promise<EntitlementRecord | null> {
    const [row] = await client
      .select()
      .from(entitlementsTable)
      .where(eq(entitlementsTable.id, id))
      .limit(1);

    return row ?? null;
  }

  async findExactTargetEntitlement(
    client: DatabaseClient,
    customerId: string,
    targetKind: "MOVIE" | "SERIES" | "SEASON" | "EPISODE",
    targets: {
      movieContentId?: string | null;
      seriesContentId?: string | null;
      seasonId?: string | null;
      episodeId?: string | null;
    },
  ): Promise<EntitlementRecord | null> {
    const conditions = [
      eq(entitlementsTable.customerId, customerId),
      eq(entitlementsTable.targetKind, targetKind),
    ];

    if (targetKind === "MOVIE" && targets.movieContentId) {
      conditions.push(eq(entitlementsTable.targetMovieContentId, targets.movieContentId));
    } else if (targetKind === "SERIES" && targets.seriesContentId) {
      conditions.push(eq(entitlementsTable.targetSeriesContentId, targets.seriesContentId));
    } else if (targetKind === "SEASON" && targets.seasonId) {
      conditions.push(eq(entitlementsTable.targetSeasonId, targets.seasonId));
    } else if (targetKind === "EPISODE" && targets.episodeId) {
      conditions.push(eq(entitlementsTable.targetEpisodeId, targets.episodeId));
    } else {
      return null;
    }

    const [row] = await client
      .select()
      .from(entitlementsTable)
      .where(and(...conditions))
      .limit(1);

    return row ?? null;
  }

  async insertEntitlement(
    client: DatabaseClient,
    values: NewEntitlementRecord,
  ): Promise<EntitlementRecord | null> {
    const [row] = await client
      .insert(entitlementsTable)
      .values(values)
      .onConflictDoNothing()
      .returning();

    return row ?? null;
  }

  async updateEntitlement(
    client: DatabaseClient,
    id: string,
    values: Partial<NewEntitlementRecord>,
  ): Promise<EntitlementRecord> {
    const [row] = await client
      .update(entitlementsTable)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(entitlementsTable.id, id))
      .returning();

    return row!;
  }

  async findEntitlementOrderEffectByOrderId(
    client: DatabaseClient,
    orderId: string,
  ): Promise<EntitlementOrderEffectRecord | null> {
    const [row] = await client
      .select()
      .from(entitlementOrderEffectsTable)
      .where(eq(entitlementOrderEffectsTable.orderId, orderId))
      .limit(1);

    return row ?? null;
  }

  async insertEntitlementOrderEffect(
    client: DatabaseClient,
    values: NewEntitlementOrderEffectRecord,
  ): Promise<EntitlementOrderEffectRecord> {
    const [row] = await client
      .insert(entitlementOrderEffectsTable)
      .values(values)
      .returning();

    return row!;
  }

  async findCatalogGrantByOrderId(
    client: DatabaseClient,
    orderId: string,
  ): Promise<CatalogGrantRecord | null> {
    const [row] = await client
      .select()
      .from(catalogGrantsTable)
      .where(eq(catalogGrantsTable.orderId, orderId))
      .limit(1);

    return row ?? null;
  }

  async insertCatalogGrant(
    client: DatabaseClient,
    values: NewCatalogGrantRecord,
  ): Promise<CatalogGrantRecord> {
    const [row] = await client
      .insert(catalogGrantsTable)
      .values(values)
      .returning();

    return row!;
  }

  async findCatalogGrantRevocationByOrderId(
    client: DatabaseClient,
    orderId: string,
  ): Promise<CatalogGrantRevocationRecord | null> {
    const [row] = await client
      .select()
      .from(catalogGrantRevocationsTable)
      .where(eq(catalogGrantRevocationsTable.orderId, orderId))
      .limit(1);

    return row ?? null;
  }

  async insertCatalogGrantRevocation(
    client: DatabaseClient,
    values: NewCatalogGrantRevocationRecord,
  ): Promise<CatalogGrantRevocationRecord> {
    const [row] = await client
      .insert(catalogGrantRevocationsTable)
      .values(values)
      .returning();

    return row!;
  }
}


