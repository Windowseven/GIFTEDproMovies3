import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { contentTable } from "./content.schema.js";
import { djVoiceArtistsTable } from "./dj-voice-artists.schema.js";
import { mediaStatusEnum } from "./catalog-enums.js";

export const movieEditionsTable = pgTable(
  "movie_editions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    movieId: uuid("movie_id")
      .notNull()
      .references(() => contentTable.id, { onDelete: "cascade" }),
    djId: uuid("dj_id")
      .notNull()
      .references(() => djVoiceArtistsTable.id, { onDelete: "restrict" }),
    streamingFileKey: text("streaming_file_key"),
    downloadFileKey: text("download_file_key"),
    streamingStatus: mediaStatusEnum("streaming_status").notNull().default("pending"),
    downloadStatus: mediaStatusEnum("download_status").notNull().default("pending"),
    isDefault: boolean("is_default").notNull().default(false),
    isAvailable: boolean("is_available").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("movie_editions_movie_dj_unique_idx").on(table.movieId, table.djId),
    uniqueIndex("movie_editions_single_default_idx")
      .on(table.movieId)
      .where(sql`${table.isDefault} = true`),
    index("movie_editions_movie_id_idx").on(table.movieId),
    index("movie_editions_dj_id_idx").on(table.djId),
    index("movie_editions_availability_idx").on(table.isAvailable),
  ],
);

export type MovieEditionRecord = typeof movieEditionsTable.$inferSelect;
export type NewMovieEditionRecord = typeof movieEditionsTable.$inferInsert;
