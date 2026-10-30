import { index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users.schema.js";

export const mediaAssetSupersessionsTable = pgTable(
  "media_asset_supersessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentKind: varchar("content_kind", { length: 32 }).notNull(),
    targetId: uuid("target_id").notNull(),
    supersededByActorId: uuid("superseded_by_actor_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    reason: text("reason").notNull(),
    fileType: varchar("file_type", { length: 32 }).notNull(),
    previousStreamingFileKey: text("previous_streaming_file_key"),
    previousDownloadFileKey: text("previous_download_file_key"),
    newStreamingFileKey: text("new_streaming_file_key"),
    newDownloadFileKey: text("new_download_file_key"),
    supersededAt: timestamp("superseded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("media_asset_supersessions_target_idx").on(table.targetId),
    index("media_asset_supersessions_actor_idx").on(table.supersededByActorId),
    index("media_asset_supersessions_created_idx").on(table.createdAt),
  ],
);

export type MediaAssetSupersessionRecord = typeof mediaAssetSupersessionsTable.$inferSelect;
export type NewMediaAssetSupersessionRecord = typeof mediaAssetSupersessionsTable.$inferInsert;
