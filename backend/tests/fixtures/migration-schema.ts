import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Temporary Phase 1 tool-evaluation fixture only. This is not an application
 * entity and must never be imported by the backend runtime.
 */
export const phase1MigrationProbe = pgTable("phase1_migration_probe", {
  id: serial("id").primaryKey(),
  marker: text("marker").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
