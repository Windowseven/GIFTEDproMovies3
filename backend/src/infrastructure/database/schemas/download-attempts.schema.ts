import { index, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users.schema.js";
import { ordersTable, entitlementsTable, planVersionsTable } from "./commercial.schema.js";
import { movieEditionsTable } from "./movie-editions.schema.js";
import { episodesTable } from "./episodes.schema.js";

export const downloadAttemptsTable = pgTable(
  "download_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => ordersTable.id, { onDelete: "restrict" }),
    entitlementId: uuid("entitlement_id")
      .notNull()
      .references(() => entitlementsTable.id, { onDelete: "restrict" }),
    planVersionId: uuid("plan_version_id")
      .notNull()
      .references(() => planVersionsTable.id, { onDelete: "restrict" }),
    contentKind: varchar("content_kind", { length: 32 }).notNull(),
    contentId: uuid("content_id").notNull(),
    editionId: uuid("edition_id").references(() => movieEditionsTable.id, {
      onDelete: "set null",
    }),
    episodeId: uuid("episode_id").references(() => episodesTable.id, {
      onDelete: "set null",
    }),
    status: varchar("status", { length: 32 }).notNull().default("PENDING"),
    downloadToken: text("download_token").notNull(),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }).notNull(),
    retryGraceExpiresAt: timestamp("retry_grace_expires_at", { withTimezone: true }).notNull(),
    attemptNumber: integer("attempt_number").notNull().default(1),
    failureReason: text("failure_reason"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("download_attempts_customer_order_idx").on(table.customerId, table.orderId),
    index("download_attempts_content_idx").on(table.contentId),
    index("download_attempts_status_idx").on(table.status),
    index("download_attempts_retry_grace_idx").on(table.retryGraceExpiresAt),
  ],
);

export type DownloadAttemptRecord = typeof downloadAttemptsTable.$inferSelect;
export type NewDownloadAttemptRecord = typeof downloadAttemptsTable.$inferInsert;
