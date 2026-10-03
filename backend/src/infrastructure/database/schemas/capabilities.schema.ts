import { pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users.schema.js";

export const userCapabilitiesTable = pgTable(
  "user_capabilities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    capability: varchar("capability", { length: 64 }).notNull(),
    grantedBy: uuid("granted_by").references(() => usersTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_capabilities_user_capability_idx").on(table.userId, table.capability),
  ],
);

export type UserCapabilityRecord = typeof userCapabilitiesTable.$inferSelect;
export type NewUserCapabilityRecord = typeof userCapabilitiesTable.$inferInsert;
