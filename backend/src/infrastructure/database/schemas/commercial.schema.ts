import { pgEnum, pgTable, timestamp, uuid, varchar, integer, uniqueIndex, index } from "drizzle-orm/pg-core";

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

