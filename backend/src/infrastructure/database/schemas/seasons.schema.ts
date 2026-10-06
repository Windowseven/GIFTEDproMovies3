import { boolean, index, integer, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { contentTable } from "./content.schema.js";

export const seasonsTable = pgTable(
  "seasons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seriesId: uuid("series_id")
      .notNull()
      .references(() => contentTable.id, { onDelete: "cascade" }),
    seasonNumber: integer("season_number").notNull(),
    title: varchar("title", { length: 255 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("seasons_series_season_number_unique_idx").on(
      table.seriesId,
      table.seasonNumber,
    ),
    index("seasons_series_id_idx").on(table.seriesId),
    index("seasons_is_active_idx").on(table.isActive),
  ],
);

export type SeasonRecord = typeof seasonsTable.$inferSelect;
export type NewSeasonRecord = typeof seasonsTable.$inferInsert;
