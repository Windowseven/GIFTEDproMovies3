import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { seasonsTable } from "./seasons.schema.js";
import { djVoiceArtistsTable } from "./dj-voice-artists.schema.js";
import { episodeStatusEnum, mediaStatusEnum } from "./catalog-enums.js";

export const episodesTable = pgTable(
  "episodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasonsTable.id, { onDelete: "cascade" }),
    episodeNumber: integer("episode_number").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    durationMinutes: integer("duration_minutes"),
    description: text("description"),
    thumbnailUrl: text("thumbnail_url"),
    djId: uuid("dj_id").references(() => djVoiceArtistsTable.id, {
      onDelete: "restrict",
    }),
    streamingFileKey: text("streaming_file_key"),
    downloadFileKey: text("download_file_key"),
    streamingStatus: mediaStatusEnum("streaming_status").notNull().default("pending"),
    downloadStatus: mediaStatusEnum("download_status").notNull().default("pending"),
    status: episodeStatusEnum("status").notNull().default("draft"),
    isAvailable: boolean("is_available").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("episodes_season_episode_number_unique_idx").on(
      table.seasonId,
      table.episodeNumber,
    ),
    index("episodes_season_id_idx").on(table.seasonId),
    index("episodes_dj_id_idx").on(table.djId),
    index("episodes_status_idx").on(table.status),
    index("episodes_is_available_idx").on(table.isAvailable),
  ],
);

export type EpisodeRecord = typeof episodesTable.$inferSelect;
export type NewEpisodeRecord = typeof episodesTable.$inferInsert;
