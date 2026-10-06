import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const systemSettingsTable = pgTable(
  "system_settings",
  {
    key: varchar("key", { length: 128 }).primaryKey(),
    value: text("value").notNull(),
    description: text("description"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export type SystemSettingRecord = typeof systemSettingsTable.$inferSelect;
export type NewSystemSettingRecord = typeof systemSettingsTable.$inferInsert;
