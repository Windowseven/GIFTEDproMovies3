import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { contentTable } from "./content.schema.js";
import { usersTable } from "./users.schema.js";

export const contentReviewNotesTable = pgTable(
  "content_review_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contentTable.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    assignedTo: uuid("assigned_to").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    rejectionReason: text("rejection_reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("content_review_notes_content_id_idx").on(table.contentId),
    index("content_review_notes_reviewer_id_idx").on(table.reviewerId),
    index("content_review_notes_assigned_to_idx").on(table.assignedTo),
  ],
);

export type ContentReviewNoteRecord = typeof contentReviewNotesTable.$inferSelect;
export type NewContentReviewNoteRecord = typeof contentReviewNotesTable.$inferInsert;
