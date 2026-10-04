import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import { DRIZZLE_DATABASE } from "../database/database.tokens.js";
import type { ApplicationDatabase } from "../database/database.module.js";
import { emailOutboxTable, type EmailOutboxRecord } from "../database/schemas/email-outbox.schema.js";
import { ENVIRONMENT_CONFIG } from "../../config/tokens.js";
import type { EnvironmentConfig } from "../../config/environment.js";
import { encryptOutboxPayload } from "./outbox-crypto.js";

export interface EnqueueVerificationParams {
  userId: string;
  email: string;
  rawToken: string;
}

export interface EnqueuePasswordResetParams {
  userId: string;
  email: string;
  rawToken: string;
}

export interface OutboxPayloadData {
  rawToken: string;
}

@Injectable()
export class EmailOutboxService {
  private readonly encryptionKey: string;
  private readonly maxAttempts: number;

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
    @Inject(ENVIRONMENT_CONFIG)
    config: EnvironmentConfig,
  ) {
    this.encryptionKey = config.emailOutboxEncryptionKey;
    this.maxAttempts = config.emailWorkerMaxAttempts;
  }

  /**
   * Enqueues an encrypted verification email outbox job.
   * Can accept an existing Drizzle transaction context (tx) for atomic multi-table commit.
   */
  async enqueueVerificationEmail(
    params: EnqueueVerificationParams,
    tx?: ApplicationDatabase,
  ): Promise<EmailOutboxRecord> {
    const executor = tx ?? this.db;
    const { ciphertext, iv, tag } = encryptOutboxPayload(
      { rawToken: params.rawToken } satisfies OutboxPayloadData,
      this.encryptionKey,
    );

    const [record] = await executor
      .insert(emailOutboxTable)
      .values({
        eventType: "email_verification",
        recipient: params.email.toLowerCase().trim(),
        subject: "Verify your GIFTEDproMovies email address",
        encryptedPayload: ciphertext,
        payloadIv: iv,
        payloadTag: tag,
        status: "pending",
        attempts: 0,
        maxAttempts: this.maxAttempts,
        metadata: { userId: params.userId },
      })
      .returning();

    if (!record) {
      throw new Error("Failed to enqueue verification email outbox record");
    }

    return record;
  }

  /**
   * Enqueues an encrypted password reset email outbox job.
   * Can accept an existing Drizzle transaction context (tx) for atomic multi-table commit.
   */
  async enqueuePasswordResetEmail(
    params: EnqueuePasswordResetParams,
    tx?: ApplicationDatabase,
  ): Promise<EmailOutboxRecord> {
    const executor = tx ?? this.db;
    const { ciphertext, iv, tag } = encryptOutboxPayload(
      { rawToken: params.rawToken } satisfies OutboxPayloadData,
      this.encryptionKey,
    );

    const [record] = await executor
      .insert(emailOutboxTable)
      .values({
        eventType: "password_reset",
        recipient: params.email.toLowerCase().trim(),
        subject: "Reset your GIFTEDproMovies password",
        encryptedPayload: ciphertext,
        payloadIv: iv,
        payloadTag: tag,
        status: "pending",
        attempts: 0,
        maxAttempts: this.maxAttempts,
        metadata: { userId: params.userId },
      })
      .returning();

    if (!record) {
      throw new Error("Failed to enqueue password reset email outbox record");
    }

    return record;
  }

  /**
   * Atomically cancels prior pending or processing outbox jobs for a user and event type.
   * Used when a user requests a resend of verification or a fresh password reset.
   */
  async cancelSupersededJobs(
    userId: string,
    eventType: "email_verification" | "password_reset",
    tx?: ApplicationDatabase,
  ): Promise<void> {
    const executor = tx ?? this.db;
    const now = new Date();

    await executor
      .update(emailOutboxTable)
      .set({
        status: "cancelled",
        failureCode: "SUPERSEDED_BY_NEW_REQUEST",
        failureReason: "Superseded by a subsequent user request",
        updatedAt: now,
      })
      .where(
        and(
          eq(emailOutboxTable.eventType, eventType),
          inArray(emailOutboxTable.status, ["pending", "processing"]),
          sql`${emailOutboxTable.metadata}->>'userId' = ${userId}`,
        ),
      );
  }
}
