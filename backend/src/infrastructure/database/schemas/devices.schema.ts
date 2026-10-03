import { pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users.schema.js";

export const devicesTable = pgTable(
  "devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    deviceIdentifier: varchar("device_identifier", { length: 128 }).notNull(),
    deviceName: varchar("device_name", { length: 128 }).notNull(),
    deviceType: varchar("device_type", { length: 32 }).notNull().default("other"), // 'mobile' | 'tablet' | 'desktop' | 'smart_tv' | 'other'
    lastUsedAt: timestamp("last_used_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("devices_user_identifier_idx").on(table.userId, table.deviceIdentifier),
  ],
);

export type DeviceRecord = typeof devicesTable.$inferSelect;
export type NewDeviceRecord = typeof devicesTable.$inferInsert;
