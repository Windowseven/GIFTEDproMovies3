import { boolean, index, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const countriesTable = pgTable(
  "countries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 10 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    flagEmoji: varchar("flag_emoji", { length: 16 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("countries_code_unique_idx").on(sql`upper(${table.code})`),
    uniqueIndex("countries_name_unique_idx").on(sql`lower(${table.name})`),
    index("countries_is_active_idx").on(table.isActive),
  ],
);

export type CountryRecord = typeof countriesTable.$inferSelect;
export type NewCountryRecord = typeof countriesTable.$inferInsert;
