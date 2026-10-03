import { index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users.schema.js";
import { devicesTable } from "./devices.schema.js";

export const sessionsTable = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    deviceId: uuid("device_id").references(() => devicesTable.id, { onDelete: "set null" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedReason: varchar("revoked_reason", { length: 64 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_device_id_idx").on(table.deviceId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export type SessionRecord = typeof sessionsTable.$inferSelect;
export type NewSessionRecord = typeof sessionsTable.$inferInsert;
