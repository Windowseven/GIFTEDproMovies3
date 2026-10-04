import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"),
  role: varchar("role", { length: 32 }).notNull().default("customer"), // 'customer' | 'media_team' | 'admin'
  status: varchar("status", { length: 32 }).notNull().default("pending_verification"), // 'pending_verification' | 'active' | 'suspended' | 'deactivated'
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type UserRecord = typeof usersTable.$inferSelect;
export type NewUserRecord = typeof usersTable.$inferInsert;
