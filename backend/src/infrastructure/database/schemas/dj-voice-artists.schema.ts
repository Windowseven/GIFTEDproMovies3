import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const djVoiceArtistsTable = pgTable(
  "dj_voice_artists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 150 }).notNull(),
    stageName: varchar("stage_name", { length: 150 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    colorHex: varchar("color_hex", { length: 10 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("dj_voice_artists_slug_unique_idx").on(sql`lower(${table.slug})`),
    index("dj_voice_artists_stage_name_idx").on(table.stageName),
    index("dj_voice_artists_is_active_idx").on(table.isActive),
  ],
);

export type DjVoiceArtistRecord = typeof djVoiceArtistsTable.$inferSelect;
export type NewDjVoiceArtistRecord = typeof djVoiceArtistsTable.$inferInsert;
