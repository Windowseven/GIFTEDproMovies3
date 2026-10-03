import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users.schema.js";

export const authTokensTable = pgTable("auth_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "restrict" }),
  type: varchar("type", { length: 32 }).notNull(), // 'email_verification' | 'password_reset'
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AuthTokenRecord = typeof authTokensTable.$inferSelect;
export type NewAuthTokenRecord = typeof authTokensTable.$inferInsert;
