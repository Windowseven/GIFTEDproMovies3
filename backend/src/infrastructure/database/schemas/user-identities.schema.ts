import { pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users.schema.js";

export const userIdentitiesTable = pgTable(
  "user_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 32 }).notNull(),
    providerSubject: varchar("provider_subject", { length: 255 }).notNull(),
    emailAtLinkTime: varchar("email_at_link_time", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_identities_provider_subject_idx").on(
      table.provider,
      table.providerSubject,
    ),
    uniqueIndex("user_identities_user_provider_idx").on(
      table.userId,
      table.provider,
    ),
  ],
);

export type UserIdentityRecord = typeof userIdentitiesTable.$inferSelect;
export type NewUserIdentityRecord = typeof userIdentitiesTable.$inferInsert;
