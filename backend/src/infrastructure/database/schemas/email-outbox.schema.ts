import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  index,
} from "drizzle-orm/pg-core";

export const emailOutboxTable = pgTable(
  "email_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventType: varchar("event_type", { length: 64 }).notNull(), // 'email_verification' | 'password_reset'
    recipient: varchar("recipient", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    encryptedPayload: text("encrypted_payload").notNull(),
    payloadIv: varchar("payload_iv", { length: 32 }).notNull(),
    payloadTag: varchar("payload_tag", { length: 32 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("pending"), // 'pending' | 'processing' | 'provider_accepted' | 'failed' | 'expired' | 'cancelled'
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    availableAt: timestamp("available_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: varchar("locked_by", { length: 128 }),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    providerMessageId: varchar("provider_message_id", { length: 128 }),
    failureCode: varchar("failure_code", { length: 64 }),
    failureReason: text("failure_reason"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("email_outbox_status_available_at_idx").on(table.status, table.availableAt),
    index("email_outbox_lease_until_idx").on(table.leaseUntil),
    index("email_outbox_event_type_status_idx").on(table.eventType, table.status),
  ],
);

export type EmailOutboxRecord = typeof emailOutboxTable.$inferSelect;
export type NewEmailOutboxRecord = typeof emailOutboxTable.$inferInsert;
