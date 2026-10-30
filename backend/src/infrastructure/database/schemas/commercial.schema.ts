import { sql } from "drizzle-orm";
import { pgEnum, pgTable, timestamp, uuid, varchar, integer, text, uniqueIndex, index } from "drizzle-orm/pg-core";

export const commercialTargetKindEnum = pgEnum("commercial_target_kind", [
  "MOVIE",
  "SERIES",
  "SEASON",
  "EPISODE",
  "CATALOG",
]);

export const commercialPolicyTypeEnum = pgEnum("commercial_policy_type", [
  "ALL_CATALOG",
  "CATEGORY_SET",
  "CONTENT_SET",
]);

export const durationUnitEnum = pgEnum("duration_unit", ["HOUR", "DAY"]);

export const offerStatusEnum = pgEnum("offer_status", [
  "draft",
  "active",
  "inactive",
  "archived",
]);

export const accessPlansTable = pgTable(
  "access_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("access_plans_code_unique").on(table.code),
  ],
);

export const planVersionsTable = pgTable(
  "plan_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accessPlanId: uuid("access_plan_id").notNull(),
    versionNumber: integer("version_number").notNull(),
    durationValue: integer("duration_value").notNull(),
    durationUnit: durationUnitEnum("duration_unit").notNull(),
    downloadLimit: integer("download_limit"),
    downloadLimitType: varchar("download_limit_type", { length: 32 }),
    deviceLimit: integer("device_limit"),
    concurrentStreamLimit: integer("concurrent_stream_limit"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("plan_versions_access_plan_version_unique").on(table.accessPlanId, table.versionNumber),
    index("plan_versions_access_plan_id_idx").on(table.accessPlanId),
  ],
);

export const offersTable = pgTable(
  "offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    status: offerStatusEnum("status").notNull().default("draft"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    targetKind: commercialTargetKindEnum("target_kind").notNull(),
    targetMovieContentId: uuid("target_movie_content_id"),
    targetSeriesContentId: uuid("target_series_content_id"),
    targetSeasonId: uuid("target_season_id"),
    targetEpisodeId: uuid("target_episode_id"),
    planVersionId: uuid("plan_version_id").notNull(),
    priceTzs: integer("price_tzs").notNull(),
    catalogPolicyType: commercialPolicyTypeEnum("catalog_policy_type"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("offers_code_unique").on(table.code),
    index("offers_status_idx").on(table.status),
    index("offers_target_kind_idx").on(table.targetKind),
    index("offers_plan_version_id_idx").on(table.planVersionId),
    index("offers_target_movie_content_id_idx").on(table.targetMovieContentId),
    index("offers_target_series_content_id_idx").on(table.targetSeriesContentId),
    index("offers_target_season_id_idx").on(table.targetSeasonId),
    index("offers_target_episode_id_idx").on(table.targetEpisodeId),
  ],
);

export const offerCatalogPolicyCategoryMembersTable = pgTable(
  "offer_catalog_policy_category_members",
  {
    offerId: uuid("offer_id").notNull(),
    categoryId: uuid("category_id").notNull(),
  },
  (table) => [
    uniqueIndex("offer_catalog_policy_category_members_pk").on(table.offerId, table.categoryId),
    index("offer_catalog_policy_category_members_category_id_idx").on(table.categoryId),
  ],
);

export const offerCatalogPolicyContentMembersTable = pgTable(
  "offer_catalog_policy_content_members",
  {
    offerId: uuid("offer_id").notNull(),
    contentId: uuid("content_id").notNull(),
  },
  (table) => [
    uniqueIndex("offer_catalog_policy_content_members_pk").on(table.offerId, table.contentId),
    index("offer_catalog_policy_content_members_content_id_idx").on(table.contentId),
  ],
);

export type AccessPlanRecord = typeof accessPlansTable.$inferSelect;
export type NewAccessPlanRecord = typeof accessPlansTable.$inferInsert;

export type PlanVersionRecord = typeof planVersionsTable.$inferSelect;
export type NewPlanVersionRecord = typeof planVersionsTable.$inferInsert;

export type OfferRecord = typeof offersTable.$inferSelect;
export type NewOfferRecord = typeof offersTable.$inferInsert;

export type OfferCatalogPolicyCategoryMemberRecord = typeof offerCatalogPolicyCategoryMembersTable.$inferSelect;
export type OfferCatalogPolicyContentMemberRecord = typeof offerCatalogPolicyContentMembersTable.$inferSelect;

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING_PAYMENT",
  "PAID",
  "EXPIRED",
  "CANCELLED",
]);

export const commercialPolicySnapshotsTable = pgTable(
  "commercial_policy_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    policyType: commercialPolicyTypeEnum("policy_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const commercialPolicySnapshotCategoriesTable = pgTable(
  "commercial_policy_snapshot_categories",
  {
    snapshotId: uuid("snapshot_id").notNull(),
    categoryId: uuid("category_id").notNull(),
  },
  (table) => [
    uniqueIndex("commercial_policy_snapshot_categories_pk").on(table.snapshotId, table.categoryId),
    index("commercial_policy_snapshot_categories_category_id_idx").on(table.categoryId),
  ],
);

export const commercialPolicySnapshotContentsTable = pgTable(
  "commercial_policy_snapshot_contents",
  {
    snapshotId: uuid("snapshot_id").notNull(),
    contentId: uuid("content_id").notNull(),
  },
  (table) => [
    uniqueIndex("commercial_policy_snapshot_contents_pk").on(table.snapshotId, table.contentId),
    index("commercial_policy_snapshot_contents_content_id_idx").on(table.contentId),
  ],
);

export const ordersTable = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id").notNull(),
    offerId: uuid("offer_id").notNull(),
    status: orderStatusEnum("status").notNull().default("PENDING_PAYMENT"),
    targetKind: commercialTargetKindEnum("target_kind").notNull(),
    targetMovieContentId: uuid("target_movie_content_id"),
    targetSeriesContentId: uuid("target_series_content_id"),
    targetSeasonId: uuid("target_season_id"),
    targetEpisodeId: uuid("target_episode_id"),
    planVersionId: uuid("plan_version_id").notNull(),
    amountTzs: integer("amount_tzs").notNull(),
    durationValue: integer("duration_value").notNull(),
    durationUnit: durationUnitEnum("duration_unit").notNull(),
    catalogPolicySnapshotId: uuid("catalog_policy_snapshot_id"),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("orders_customer_idempotency_unique").on(table.customerId, table.idempotencyKey),
    uniqueIndex("orders_catalog_policy_snapshot_id_unique").on(table.catalogPolicySnapshotId),
    index("orders_customer_id_idx").on(table.customerId),
    index("orders_offer_id_idx").on(table.offerId),
    index("orders_status_idx").on(table.status),
    index("orders_target_kind_idx").on(table.targetKind),
    index("orders_plan_version_id_idx").on(table.planVersionId),
    index("orders_target_movie_content_id_idx").on(table.targetMovieContentId),
    index("orders_target_series_content_id_idx").on(table.targetSeriesContentId),
    index("orders_target_season_id_idx").on(table.targetSeasonId),
    index("orders_target_episode_id_idx").on(table.targetEpisodeId),
    index("orders_created_at_idx").on(table.createdAt),
  ],
);

export type CommercialPolicySnapshotRecord = typeof commercialPolicySnapshotsTable.$inferSelect;
export type NewCommercialPolicySnapshotRecord = typeof commercialPolicySnapshotsTable.$inferInsert;

export type CommercialPolicySnapshotCategoryRecord = typeof commercialPolicySnapshotCategoriesTable.$inferSelect;
export type CommercialPolicySnapshotContentRecord = typeof commercialPolicySnapshotContentsTable.$inferSelect;

export type OrderRecord = typeof ordersTable.$inferSelect;
export type NewOrderRecord = typeof ordersTable.$inferInsert;

export const paymentAttemptStatusEnum = pgEnum("payment_attempt_status", [
  "PENDING",
  "UNKNOWN",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "EXPIRED",
]);

export const paymentAttemptsTable = pgTable(
  "payment_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => ordersTable.id),
    attemptNumber: integer("attempt_number").notNull(),
    providerName: varchar("provider_name", { length: 64 }).notNull(),
    providerReference: varchar("provider_reference", { length: 128 }),
    providerEventId: varchar("provider_event_id", { length: 128 }),
    status: paymentAttemptStatusEnum("status").notNull().default("PENDING"),
    amountTzs: integer("amount_tzs").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("payment_attempts_order_attempt_unique").on(table.orderId, table.attemptNumber),
    uniqueIndex("payment_attempts_provider_event_unique").on(table.providerName, table.providerEventId),
    uniqueIndex("payment_attempts_provider_reference_idx").on(table.providerName, table.providerReference),
    uniqueIndex("payment_attempts_single_unresolved_idx")
      .on(table.orderId)
      .where(sql`"status" IN ('PENDING', 'UNKNOWN')`),
    index("payment_attempts_order_id_idx").on(table.orderId),
    index("payment_attempts_status_idx").on(table.status),
  ],
);

export const settlementsTable = pgTable(
  "settlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentAttemptId: uuid("payment_attempt_id")
      .notNull()
      .references(() => paymentAttemptsTable.id),
    providerName: varchar("provider_name", { length: 64 }).notNull(),
    providerEventId: varchar("provider_event_id", { length: 128 }).notNull(),
    providerReference: varchar("provider_reference", { length: 128 }).notNull(),
    amountTzs: integer("amount_tzs").notNull(),
    settledAt: timestamp("settled_at", { withTimezone: true }).notNull().defaultNow(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("settlements_payment_attempt_id_unique").on(table.paymentAttemptId),
    uniqueIndex("settlements_provider_event_unique").on(table.providerName, table.providerEventId),
    index("settlements_provider_reference_idx").on(table.providerReference),
    index("settlements_settled_at_idx").on(table.settledAt),
  ],
);

export type PaymentAttemptRecord = typeof paymentAttemptsTable.$inferSelect;
export type NewPaymentAttemptRecord = typeof paymentAttemptsTable.$inferInsert;

export type SettlementRecord = typeof settlementsTable.$inferSelect;
export type NewSettlementRecord = typeof settlementsTable.$inferInsert;

export const fulfillmentStatusEnum = pgEnum("fulfillment_status", [
  "PENDING",
  "COMPLETED",
  "FAILED_RETRYABLE",
  "FAILED_TERMINAL",
]);

export const fulfillmentsTable = pgTable(
  "fulfillments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => ordersTable.id),
    status: fulfillmentStatusEnum("status").notNull().default("PENDING"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastErrorCode: varchar("last_error_code", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("fulfillments_order_id_unique").on(table.orderId),
    index("fulfillments_status_idx").on(table.status),
    index("fulfillments_created_at_idx").on(table.createdAt),
  ],
);

export type FulfillmentRecord = typeof fulfillmentsTable.$inferSelect;
export type NewFulfillmentRecord = typeof fulfillmentsTable.$inferInsert;

export const entitlementStatusEnum = pgEnum("entitlement_status", [
  "ACTIVE",
  "EXPIRED",
  "REVOKED",
]);

export const entitlementEffectKindEnum = pgEnum("entitlement_effect_kind", [
  "CREATED",
  "EXTENDED",
]);

export const entitlementsTable = pgTable(
  "entitlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id").notNull(),
    targetKind: commercialTargetKindEnum("target_kind").notNull(),
    targetMovieContentId: uuid("target_movie_content_id"),
    targetSeriesContentId: uuid("target_series_content_id"),
    targetSeasonId: uuid("target_season_id"),
    targetEpisodeId: uuid("target_episode_id"),
    status: entitlementStatusEnum("status").notNull().default("ACTIVE"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revocationReason: text("revocation_reason"),
    revokedBy: uuid("revoked_by"),
  },
  (table) => [
    uniqueIndex("entitlements_customer_movie_idx")
      .on(table.customerId, table.targetMovieContentId)
      .where(sql`"target_kind" = 'MOVIE' AND "target_movie_content_id" IS NOT NULL`),
    uniqueIndex("entitlements_customer_series_idx")
      .on(table.customerId, table.targetSeriesContentId)
      .where(sql`"target_kind" = 'SERIES' AND "target_series_content_id" IS NOT NULL`),
    uniqueIndex("entitlements_customer_season_idx")
      .on(table.customerId, table.targetSeasonId)
      .where(sql`"target_kind" = 'SEASON' AND "target_season_id" IS NOT NULL`),
    uniqueIndex("entitlements_customer_episode_idx")
      .on(table.customerId, table.targetEpisodeId)
      .where(sql`"target_kind" = 'EPISODE' AND "target_episode_id" IS NOT NULL`),
    uniqueIndex("entitlements_customer_catalog_idx")
      .on(table.customerId)
      .where(sql`"target_kind" = 'CATALOG'`),
    index("entitlements_customer_id_idx").on(table.customerId),
    index("entitlements_status_expires_at_idx").on(table.status, table.expiresAt),
    index("entitlements_target_movie_content_id_idx").on(table.targetMovieContentId),
    index("entitlements_target_series_content_id_idx").on(table.targetSeriesContentId),
    index("entitlements_target_season_id_idx").on(table.targetSeasonId),
    index("entitlements_target_episode_id_idx").on(table.targetEpisodeId),
  ],
);

export type EntitlementRecord = typeof entitlementsTable.$inferSelect;
export type NewEntitlementRecord = typeof entitlementsTable.$inferInsert;

export const entitlementOrderEffectsTable = pgTable(
  "entitlement_order_effects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => ordersTable.id),
    entitlementId: uuid("entitlement_id")
      .notNull()
      .references(() => entitlementsTable.id),
    effectKind: entitlementEffectKindEnum("effect_kind").notNull(),
    appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAtAfter: timestamp("expires_at_after", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("entitlement_order_effects_order_id_unique").on(table.orderId),
    index("entitlement_order_effects_entitlement_id_idx").on(table.entitlementId),
  ],
);

export type EntitlementOrderEffectRecord = typeof entitlementOrderEffectsTable.$inferSelect;
export type NewEntitlementOrderEffectRecord = typeof entitlementOrderEffectsTable.$inferInsert;

export const catalogGrantsTable = pgTable(
  "catalog_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => ordersTable.id),
    entitlementId: uuid("entitlement_id")
      .notNull()
      .references(() => entitlementsTable.id),
    predecessorOrderId: uuid("predecessor_order_id").references(() => ordersTable.id),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
    validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("catalog_grants_order_id_unique").on(table.orderId),
    index("catalog_grants_entitlement_window_idx").on(table.entitlementId, table.validUntil),
    index("catalog_grants_predecessor_order_id_idx").on(table.predecessorOrderId),
  ],
);

export type CatalogGrantRecord = typeof catalogGrantsTable.$inferSelect;
export type NewCatalogGrantRecord = typeof catalogGrantsTable.$inferInsert;

export const catalogGrantRevocationsTable = pgTable(
  "catalog_grant_revocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => ordersTable.id),
    revokedAt: timestamp("revoked_at", { withTimezone: true }).notNull().defaultNow(),
    revocationReason: text("revocation_reason").notNull(),
    revokedBy: uuid("revoked_by"),
  },
  (table) => [
    uniqueIndex("catalog_grant_revocations_order_id_unique").on(table.orderId),
  ],
);

export type CatalogGrantRevocationRecord = typeof catalogGrantRevocationsTable.$inferSelect;
export type NewCatalogGrantRevocationRecord = typeof catalogGrantRevocationsTable.$inferInsert;


