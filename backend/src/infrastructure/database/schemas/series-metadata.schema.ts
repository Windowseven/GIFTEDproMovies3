import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { contentTable } from "./content.schema.js";
import { djVoiceArtistsTable } from "./dj-voice-artists.schema.js";

export const seriesMetadataTable = pgTable(
  "series_metadata",
  {
    contentId: uuid("content_id")
      .primaryKey()
      .references(() => contentTable.id, { onDelete: "cascade" }),
    leadDjId: uuid("lead_dj_id").references(() => djVoiceArtistsTable.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export type SeriesMetadataRecord = typeof seriesMetadataTable.$inferSelect;
export type NewSeriesMetadataRecord = typeof seriesMetadataTable.$inferInsert;
