import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users.schema.js";
import { contentStatusEnum, contentTypeEnum } from "./catalog-enums.js";

export const contentTable = pgTable(
  "content",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    codeId: varchar("code_id", { length: 32 }).notNull().unique(),
    contentType: contentTypeEnum("content_type").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    originalTitle: varchar("original_title", { length: 255 }),
    slug: varchar("slug", { length: 280 }).notNull(),
    releaseYear: integer("release_year"),
    description: text("description"),
    posterUrl: text("poster_url"),
    backdropUrl: text("backdrop_url"),
    trailerUrl: text("trailer_url"),
    status: contentStatusEnum("status").notNull().default("draft"),
    isFeatured: boolean("is_featured").notNull().default(false),
    isTrending: boolean("is_trending").notNull().default(false),
    durationMinutes: integer("duration_minutes"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    submittedBy: uuid("submitted_by").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    assignedTo: uuid("assigned_to").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    approvedBy: uuid("approved_by").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    rejectionReason: text("rejection_reason"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    unpublishedAt: timestamp("unpublished_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("content_slug_unique_idx").on(sql`lower(${table.slug})`),
    index("content_status_idx").on(table.status),
    index("content_type_status_idx").on(table.contentType, table.status),
    index("content_published_at_idx").on(table.publishedAt),
    index("content_created_by_idx").on(table.createdBy),
    index("content_assigned_to_idx").on(table.assignedTo),
    index("content_is_featured_idx").on(table.isFeatured),
    index("content_is_trending_idx").on(table.isTrending),
  ],
);

export type ContentRecord = typeof contentTable.$inferSelect;
export type NewContentRecord = typeof contentTable.$inferInsert;
