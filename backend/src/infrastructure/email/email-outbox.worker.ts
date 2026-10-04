import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { DRIZZLE_DATABASE } from "../database/database.tokens.js";
import type { ApplicationDatabase } from "../database/database.module.js";
import {
  emailOutboxTable,
  type EmailOutboxRecord,
} from "../database/schemas/email-outbox.schema.js";
import { authTokensTable } from "../database/schemas/auth-tokens.schema.js";
import { EMAIL_SENDER } from "./email.tokens.js";
import type { EmailSender } from "./email-sender.interface.js";
import { EmailTemplateService } from "./email-template.service.js";
import { ENVIRONMENT_CONFIG } from "../../config/tokens.js";
import type { EnvironmentConfig } from "../../config/environment.js";
import { decryptOutboxPayload } from "./outbox-crypto.js";
import { hashToken } from "../../modules/identity/utils/token.utils.js";

export type OutboxFailureCode =
  | "NETWORK_TIMEOUT"
  | "PROVIDER_RATE_LIMIT"
  | "PROVIDER_5XX"
  | "PROVIDER_REJECTED"
  | "INVALID_RECIPIENT"
  | "CONFIGURATION_ERROR"
  | "PAYLOAD_DECRYPTION_FAILURE"
  | "TOKEN_NOT_FOUND"
  | "TOKEN_EXPIRED"
  | "TOKEN_ALREADY_USED"
  | "MAX_ATTEMPTS_EXCEEDED"
  | "UNKNOWN_PROVIDER_ERROR";

export function sanitizeErrorMessage(error: unknown): string {
  if (!error) return "Unknown error";
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown error";

  return raw
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]")
    .replace(/token=[a-zA-Z0-9._~-]+/gi, "token=[REDACTED]")
    .replace(/https?:\/\/[^\s]+/gi, "[URL]")
    .slice(0, 255);
}

export function classifyError(error: unknown): {
  code: OutboxFailureCode;
  isTransient: boolean;
} {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (
    message.includes("rate limit") ||
    message.includes("429") ||
    message.includes("too many requests")
  ) {
    return { code: "PROVIDER_RATE_LIMIT", isTransient: true };
  }
  if (
    message.includes("timeout") ||
    message.includes("etimedout") ||
    message.includes("esockettimedout")
  ) {
    return { code: "NETWORK_TIMEOUT", isTransient: true };
  }
  if (
    message.includes("econnreset") ||
    message.includes("econnrefused") ||
    message.includes("network") ||
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504")
  ) {
    return { code: "PROVIDER_5XX", isTransient: true };
  }
  if (
    message.includes("invalid recipient") ||
    message.includes("does not exist") ||
    message.includes("invalid email")
  ) {
    return { code: "INVALID_RECIPIENT", isTransient: false };
  }
  if (
    message.includes("not configured") ||
    message.includes("api_key") ||
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("domain not verified")
  ) {
    return { code: "CONFIGURATION_ERROR", isTransient: false };
  }
  if (message.includes("rejected") || message.includes("validation_error")) {
    return { code: "PROVIDER_REJECTED", isTransient: false };
  }

  return { code: "UNKNOWN_PROVIDER_ERROR", isTransient: true };
}

export function extractRetryAfterMs(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const anyErr = error as Record<string, unknown>;
  const val =
    anyErr.retryAfter ??
    anyErr.retry_after ??
    (anyErr.headers && typeof anyErr.headers === "object"
      ? (anyErr.headers as Record<string, unknown>)["retry-after"]
      : undefined);

  if (typeof val === "number" && Number.isFinite(val) && val > 0) {
    return Math.floor(val * 1000);
  }
  if (typeof val === "string") {
    const parsed = Number(val);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed * 1000);
    }
  }
  return null;
}

@Injectable()
export class EmailOutboxWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(EmailOutboxWorker.name);
  private readonly workerId: string;
  private readonly encryptionKey: string;
  private readonly pollIntervalMs: number;
  private readonly leaseMs: number;
  private readonly baseBackoffMs: number;
  private readonly maxBackoffMs: number;
  private readonly jitterMs: number;
  private readonly isWorkerEnabled: boolean;

  private pollTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private isShuttingDown = false;

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
    @Inject(EMAIL_SENDER)
    private readonly emailSender: EmailSender,
    private readonly templateService: EmailTemplateService,
    @Inject(ENVIRONMENT_CONFIG)
    config: EnvironmentConfig,
  ) {
    this.workerId = `worker-${randomUUID().slice(0, 8)}`;
    this.encryptionKey = config.emailOutboxEncryptionKey;
    this.pollIntervalMs = config.emailWorkerPollIntervalMs;
    this.leaseMs = config.emailWorkerLeaseMs;
    this.baseBackoffMs = config.emailWorkerBaseBackoffMs;
    this.maxBackoffMs = config.emailWorkerMaxBackoffMs;
    this.jitterMs = config.emailWorkerJitterMs;
    this.isWorkerEnabled = config.emailWorkerEnabled;
  }

  onApplicationBootstrap(): void {
    if (!this.isWorkerEnabled) {
      this.logger.log("EmailOutboxWorker: background polling is disabled");
      return;
    }

    this.logger.log(
      {
        workerId: this.workerId,
        pollIntervalMs: this.pollIntervalMs,
        leaseMs: this.leaseMs,
      },
      "EmailOutboxWorker: starting background outbox processor",
    );

    this.scheduleNextPoll();
  }

  async onApplicationShutdown(): Promise<void> {
    this.isShuttingDown = true;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    // Wait if currently in the middle of a processing loop
    let waitCount = 0;
    while (this.isProcessing && waitCount < 25) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      waitCount++;
    }
  }

  private scheduleNextPoll(): void {
    if (this.isShuttingDown) return;
    this.pollTimer = setTimeout(async () => {
      try {
        await this.processPendingJobsOnce();
      } catch (err: unknown) {
        this.logger.error(
          { errorMessage: err instanceof Error ? err.message : "Unknown error" },
          "EmailOutboxWorker: error in processing loop",
        );
      } finally {
        this.scheduleNextPoll();
      }
    }, this.pollIntervalMs);
  }

  /**
   * Executes a single processing cycle. Safe to call manually in test environments.
   * Atomically claims eligible jobs and processes each sequentially.
   */
  async processPendingJobsOnce(batchSize = 10): Promise<number> {
    if (this.isProcessing || this.isShuttingDown) {
      return 0;
    }

    this.isProcessing = true;
    try {
      const claimedJobs = await this.claimEligibleJobs(batchSize);
      for (const job of claimedJobs) {
        if (this.isShuttingDown) break;
        await this.processClaimedJob(job);
      }
      return claimedJobs.length;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Atomically claims pending or stale-lease jobs using FOR UPDATE SKIP LOCKED.
   */
  private mapRowToRecord(row: Record<string, unknown>): EmailOutboxRecord {
    return {
      id: row.id as string,
      eventType: (row.eventType ?? row.event_type) as string,
      recipient: row.recipient as string,
      subject: row.subject as string,
      encryptedPayload: (row.encryptedPayload ?? row.encrypted_payload) as string,
      payloadIv: (row.payloadIv ?? row.payload_iv) as string,
      payloadTag: (row.payloadTag ?? row.payload_tag) as string,
      status: row.status as string,
      attempts: Number(row.attempts ?? 0),
      maxAttempts: Number(row.maxAttempts ?? row.max_attempts ?? 5),
      availableAt: (row.availableAt ?? row.available_at) as Date,
      lockedAt: (row.lockedAt ?? row.locked_at ?? null) as Date | null,
      lockedBy: (row.lockedBy ?? row.locked_by ?? null) as string | null,
      leaseUntil: (row.leaseUntil ?? row.lease_until ?? null) as Date | null,
      lastAttemptAt: (row.lastAttemptAt ?? row.last_attempt_at ?? null) as Date | null,
      nextRetryAt: (row.nextRetryAt ?? row.next_retry_at ?? null) as Date | null,
      completedAt: (row.completedAt ?? row.completed_at ?? null) as Date | null,
      providerMessageId: (row.providerMessageId ?? row.provider_message_id ?? null) as string | null,
      failureCode: (row.failureCode ?? row.failure_code ?? null) as string | null,
      failureReason: (row.failureReason ?? row.failure_reason ?? null) as string | null,
      metadata: (row.metadata ?? null) as Record<string, unknown> | null,
      createdAt: (row.createdAt ?? row.created_at) as Date,
      updatedAt: (row.updatedAt ?? row.updated_at) as Date,
    };
  }

  /**
   * Atomically claims pending or stale-lease jobs using FOR UPDATE SKIP LOCKED.
   */
  private async claimEligibleJobs(limit: number): Promise<EmailOutboxRecord[]> {
    const leaseIntervalSql = sql`${this.leaseMs} * interval '1 millisecond'`;

    const result = await this.db.execute<Record<string, unknown>>(sql`
      WITH claimable AS (
        SELECT id
        FROM email_outbox
        WHERE (
          status = 'pending' AND available_at <= NOW()
        ) OR (
          status = 'processing' AND lease_until IS NOT NULL AND lease_until < NOW()
        )
        ORDER BY available_at ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE email_outbox
      SET
        status = 'processing',
        locked_at = NOW(),
        locked_by = ${this.workerId},
        lease_until = NOW() + ${leaseIntervalSql},
        attempts = email_outbox.attempts + 1,
        last_attempt_at = NOW(),
        updated_at = NOW()
      FROM claimable
      WHERE email_outbox.id = claimable.id
      RETURNING email_outbox.*;
    `);

    const rawRows = (result.rows ?? []) as Record<string, unknown>[];
    return rawRows.map((row) => this.mapRowToRecord(row));
  }

  /**
   * Authoritatively processes a single claimed job.
   */
  private async processClaimedJob(job: EmailOutboxRecord): Promise<void> {
    const startTime = Date.now();

    // 1. Decrypt sensitive payload
    let rawToken: string;
    try {
      const payload = decryptOutboxPayload<{ rawToken: string }>(
        {
          ciphertext: job.encryptedPayload,
          iv: job.payloadIv,
          tag: job.payloadTag,
        },
        this.encryptionKey,
      );
      rawToken = payload.rawToken;
    } catch {
      this.logger.error(
        { jobId: job.id, eventType: job.eventType },
        "EmailOutboxWorker: payload decryption failed",
      );
      await this.markJobFailedPermanently(
        job.id,
        "PAYLOAD_DECRYPTION_FAILURE",
        "Payload decryption failed",
      );
      return;
    }

    // 2. Authoritative pre-dispatch verification against auth_tokens
    const tokenHash = hashToken(rawToken);
    const now = new Date();

    const [tokenRecord] = await this.db
      .select({
        id: authTokensTable.id,
        expiresAt: authTokensTable.expiresAt,
        usedAt: authTokensTable.usedAt,
      })
      .from(authTokensTable)
      .where(
        and(
          eq(authTokensTable.tokenHash, tokenHash),
          eq(authTokensTable.type, job.eventType),
        ),
      )
      .limit(1);

    if (!tokenRecord) {
      await this.markJobCancelled(
        job.id,
        "TOKEN_NOT_FOUND",
        "Associated authentication token was not found",
      );
      return;
    }

    if (tokenRecord.usedAt !== null) {
      await this.markJobExpired(
        job.id,
        "TOKEN_ALREADY_USED",
        "Associated authentication token has already been used or invalidated",
      );
      return;
    }

    if (tokenRecord.expiresAt <= now) {
      await this.markJobExpired(
        job.id,
        "TOKEN_EXPIRED",
        "Associated authentication token has expired",
      );
      return;
    }

    // 3. Render message via EmailTemplateService
    const emailMessage =
      job.eventType === "password_reset"
        ? this.templateService.generatePasswordResetEmail(job.recipient, rawToken)
        : this.templateService.generateVerificationEmail(job.recipient, rawToken);

    // 4. Dispatch via EmailSender abstraction (no direct coupling to Resend)
    try {
      const sendResult = await this.emailSender.sendEmail(emailMessage);
      const providerMessageId =
        sendResult && typeof sendResult === "object" && "messageId" in sendResult && typeof sendResult.messageId === "string"
          ? sendResult.messageId
          : null;

      // 5. Mark provider accepted
      await this.db
        .update(emailOutboxTable)
        .set({
          status: "provider_accepted",
          providerMessageId,
          completedAt: new Date(),
          lockedAt: null,
          lockedBy: null,
          leaseUntil: null,
          failureCode: null,
          failureReason: null,
          updatedAt: new Date(),
        })
        .where(eq(emailOutboxTable.id, job.id));

      this.logger.log(
        {
          jobId: job.id,
          eventType: job.eventType,
          durationMs: Date.now() - startTime,
          attempts: job.attempts,
        },
        "EmailOutboxWorker: email dispatched to provider successfully",
      );
    } catch (dispatchErr: unknown) {
      const sanitizedReason = sanitizeErrorMessage(dispatchErr);
      const { code, isTransient } = classifyError(dispatchErr);

      this.logger.warn(
        {
          jobId: job.id,
          eventType: job.eventType,
          attempts: job.attempts,
          failureCode: code,
          isTransient,
        },
        "EmailOutboxWorker: provider dispatch failed",
      );

      if (!isTransient || job.attempts >= job.maxAttempts) {
        await this.markJobFailedPermanently(
          job.id,
          job.attempts >= job.maxAttempts ? "MAX_ATTEMPTS_EXCEEDED" : code,
          sanitizedReason,
        );
      } else {
        const retryAfterMs = extractRetryAfterMs(dispatchErr);
        await this.scheduleJobRetry(job, code, sanitizedReason, retryAfterMs);
      }
    }
  }

  private async markJobFailedPermanently(
    jobId: string,
    failureCode: OutboxFailureCode,
    failureReason: string,
  ): Promise<void> {
    await this.db
      .update(emailOutboxTable)
      .set({
        status: "failed",
        failureCode,
        failureReason,
        lockedAt: null,
        lockedBy: null,
        leaseUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(emailOutboxTable.id, jobId));
  }

  private async markJobExpired(
    jobId: string,
    failureCode: OutboxFailureCode,
    failureReason: string,
  ): Promise<void> {
    await this.db
      .update(emailOutboxTable)
      .set({
        status: "expired",
        failureCode,
        failureReason,
        lockedAt: null,
        lockedBy: null,
        leaseUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(emailOutboxTable.id, jobId));
  }

  private async markJobCancelled(
    jobId: string,
    failureCode: OutboxFailureCode,
    failureReason: string,
  ): Promise<void> {
    await this.db
      .update(emailOutboxTable)
      .set({
        status: "cancelled",
        failureCode,
        failureReason,
        lockedAt: null,
        lockedBy: null,
        leaseUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(emailOutboxTable.id, jobId));
  }

  private async scheduleJobRetry(
    job: EmailOutboxRecord,
    failureCode: OutboxFailureCode,
    failureReason: string,
    retryAfterMs?: number | null,
  ): Promise<void> {
    const attempts = job.attempts;
    const exponential = this.baseBackoffMs * Math.pow(2, Math.max(0, attempts - 1));
    const jitter = Math.floor(Math.random() * (this.jitterMs + 1));
    const calculatedDelay =
      typeof retryAfterMs === "number" && retryAfterMs > 0
        ? Math.max(this.baseBackoffMs, retryAfterMs)
        : exponential;
    const delayMs = Math.min(this.maxBackoffMs, calculatedDelay) + jitter;
    const nextRetryAt = new Date(Date.now() + delayMs);

    await this.db
      .update(emailOutboxTable)
      .set({
        status: "pending",
        availableAt: nextRetryAt,
        nextRetryAt,
        failureCode,
        failureReason,
        lockedAt: null,
        lockedBy: null,
        leaseUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(emailOutboxTable.id, job.id));
  }
}
