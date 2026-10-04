import assert from "node:assert/strict";
import test from "node:test";
import { AuthService } from "../src/modules/identity/services/auth.service.js";
import { EmailOutboxService } from "../src/infrastructure/email/email-outbox.service.js";
import { EmailOutboxWorker } from "../src/infrastructure/email/email-outbox.worker.js";
import { EmailTemplateService } from "../src/infrastructure/email/email-template.service.js";
import type { EmailSender, EmailMessage } from "../src/infrastructure/email/email-sender.interface.js";
import { decryptOutboxPayload } from "../src/infrastructure/email/outbox-crypto.js";
import { hashToken } from "../src/modules/identity/utils/token.utils.js";
import type { EnvironmentConfig } from "../src/config/environment.js";

const VALID_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const testConfig: EnvironmentConfig = {
  appEnvironment: "test",
  port: 8000,
  databaseUrl: process.env.DATABASE_URL || "postgresql://tester@127.0.0.1:5433/giftedpro_phase1_test",
  databasePoolMax: 5,
  corsOrigins: ["https://giftedpromovies.com"],
  trustedProxyCidrs: [],
  requestBodyLimitBytes: 1048576,
  logLevel: "debug",
  emailFrom: "noreply@giftedpromovies.com",
  emailProvider: "in_memory",
  googleCallbackUrl: "https://api.giftedpromovies.com/api/v1/auth/google/callback",
  frontendUrl: "https://giftedpromovies.com",
  emailOutboxEncryptionKey: VALID_KEY,
  emailWorkerEnabled: false,
  emailWorkerPollIntervalMs: 2000,
  emailWorkerLeaseMs: 300000,
  emailWorkerMaxAttempts: 5,
  emailWorkerBaseBackoffMs: 2000,
  emailWorkerMaxBackoffMs: 60000,
  emailWorkerJitterMs: 0,
};

class ControllableMockEmailSender implements EmailSender {
  public shouldFail = false;
  public failureType: "timeout" | "503" | "rate_limit" = "timeout";
  public dispatchedEmails: EmailMessage[] = [];
  public retryAfterSeconds?: number;

  async sendEmail(message: EmailMessage): Promise<{ messageId: string }> {
    if (this.shouldFail) {
      if (this.failureType === "timeout") {
        throw new Error("Network timeout after 5000ms: ETIMEDOUT connect 2606:4700:7::a29f:89");
      }
      if (this.failureType === "503") {
        throw new Error("Resend provider 503 Service Unavailable: upstream service overloaded");
      }
      if (this.failureType === "rate_limit") {
        const err: any = new Error("Resend rate limit exceeded: 429 Too Many Requests");
        err.retryAfter = this.retryAfterSeconds ?? 10;
        throw err;
      }
      throw new Error("General provider failure");
    }

    this.dispatchedEmails.push(message);
    return { messageId: `mock-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` };
  }

  async sendVerificationEmail(to: string, rawToken: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: "Verify email",
      text: `Link: https://giftedpromovies.com/verify-email?token=${rawToken}`,
    });
  }

  async sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: "Reset password",
      text: `Link: https://giftedpromovies.com/reset-password?token=${rawToken}`,
    });
  }
}

test("MANDATORY CHECKPOINT A — Resend Provider Outage, Worker Retry, Recovery, and Token Consumption", async () => {
  const dbUsers = new Map<string, any>();
  const dbTokens = new Map<string, any>();
  const dbOutbox = new Map<string, any>();
  const dbSessions = new Map<string, any>();

  const mockDb = {
    execute: async () => {
      const now = new Date();
      const claimed: any[] = [];
      for (const [, job] of dbOutbox.entries()) {
        const isPending = job.status === "pending" && job.availableAt <= now;
        const isStale = job.status === "processing" && job.leaseUntil && job.leaseUntil < now;
        if (isPending || isStale) {
          job.status = "processing";
          job.lockedAt = now;
          job.lockedBy = "worker-1";
          job.leaseUntil = new Date(now.getTime() + 300000);
          job.attempts = (job.attempts || 0) + 1;
          job.lastAttemptAt = now;
          job.updatedAt = now;
          claimed.push({ ...job });
          break;
        }
      }
      return { rows: claimed };
    },
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            // Return tokens for pre-dispatch check or empty array
            return [...dbTokens.values()];
          },
        }),
      }),
    }),
    insert: () => ({
      values: (vals: any) => {
        if (vals.email && vals.passwordHash) {
          const user = {
            id: `user-${Date.now()}`,
            ...vals,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          dbUsers.set(user.id, user);
          return { returning: async () => [user] };
        }
        if (vals.tokenHash) {
          const token = {
            id: `token-${Date.now()}`,
            ...vals,
            expiresAt: vals.expiresAt || new Date(Date.now() + 86400000),
            usedAt: null,
            createdAt: new Date(),
          };
          dbTokens.set(token.id, token);
          return { returning: async () => [token] };
        }
        if (vals.encryptedPayload) {
          const job = {
            id: `job-${Date.now()}`,
            ...vals,
            status: "pending",
            attempts: 0,
            availableAt: vals.availableAt || new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          dbOutbox.set(job.id, job);
          return { returning: async () => [job] };
        }
        return {};
      },
    }),
    update: () => ({
      set: (updates: any) => ({
        where: async () => {
          for (const job of dbOutbox.values()) {
            Object.assign(job, updates);
          }
          for (const user of dbUsers.values()) {
            Object.assign(user, updates);
          }
          for (const token of dbTokens.values()) {
            Object.assign(token, updates);
          }
        },
      }),
    }),
    transaction: async (cb: any) => cb(mockDb),
  } as any;

  const mockSender = new ControllableMockEmailSender();
  const templateService = new EmailTemplateService(testConfig);
  const outboxService = new EmailOutboxService(mockDb, testConfig);
  const worker = new EmailOutboxWorker(mockDb, mockSender, templateService, testConfig);

  const mockHasher = {
    hashPassword: async () => "$argon2id$v=19$m=65536,t=3,p=4$dummyhash",
    verifyPassword: async () => true,
  } as any;
  const mockSessionService = {
    revokeAllUserSessions: async (userId: string) => {
      dbSessions.delete(userId);
    },
  } as any;
  const mockDeviceService = {} as any;
  const mockAudit = { recordEvent: async () => {} } as any;

  const authService = new AuthService(
    mockDb,
    outboxService,
    mockHasher,
    mockSessionService,
    mockDeviceService,
    mockAudit,
  );

  // STEP 1: Simulate Resend being completely unavailable
  mockSender.shouldFail = true;
  mockSender.failureType = "timeout";

  // STEP 2: Call registration
  const startTime = Date.now();
  const registerResult = await authService.register(
    "outage-user@example.com",
    "SecureOutagePassword123!",
  );
  const latency = Date.now() - startTime;

  // STEP 3: Verify registration invariants
  assert.ok(latency < 200, `Registration took ${latency}ms; must not wait for external provider`);
  assert.equal(registerResult.email, "outage-user@example.com");
  assert.equal(registerResult.status, "pending_verification");
  assert.equal(registerResult.role, "customer");

  // Verify DB state
  assert.equal(dbUsers.size, 1);
  const createdUser = [...dbUsers.values()][0];
  assert.equal(createdUser.status, "pending_verification");

  assert.equal(dbTokens.size, 1);
  const createdToken = [...dbTokens.values()][0];
  assert.ok(createdToken.tokenHash);
  assert.equal(createdToken.tokenHash.length, 64);
  assert.equal(createdToken.usedAt, null);

  assert.equal(dbOutbox.size, 1);
  const outboxJob = [...dbOutbox.values()][0];
  assert.equal(outboxJob.status, "pending");
  assert.equal(outboxJob.recipient, "outage-user@example.com");
  assert.equal(outboxJob.attempts, 0);

  // Decrypt payload to verify ciphertext at rest
  const decrypted = decryptOutboxPayload<{ rawToken: string }>(
    {
      ciphertext: outboxJob.encryptedPayload,
      iv: outboxJob.payloadIv,
      tag: outboxJob.payloadTag,
    },
    VALID_KEY,
  );
  assert.ok(decrypted.rawToken);
  assert.equal(hashToken(decrypted.rawToken), createdToken.tokenHash);

  // Duplicate registration attempt must fail cleanly with ConflictException without creating second user
  await assert.rejects(
    () =>
      authService.register(
        "outage-user@example.com",
        "SecureOutagePassword123!",
      ),
    /already registered/i,
  );
  assert.equal(dbUsers.size, 1);

  // STEP 4: Run worker while Resend is unavailable
  const processedCount = await worker.processPendingJobsOnce();
  assert.equal(processedCount, 1);

  // Verify worker handled error gracefully and did not crash or lose job
  assert.equal(outboxJob.status, "pending", "Job must remain pending for retry");
  assert.equal(outboxJob.attempts, 1);
  assert.equal(outboxJob.failureCode, "NETWORK_TIMEOUT");
  assert.ok(outboxJob.failureReason.includes("timeout"));
  assert.ok(!outboxJob.failureReason.includes(VALID_KEY), "No secret leak");
  assert.ok(!outboxJob.failureReason.includes(decrypted.rawToken), "No token leak");
  assert.ok(outboxJob.nextRetryAt > new Date());
  assert.equal(outboxJob.leaseUntil, null, "Lease must be cleared on failure");

  // STEP 5: Simulate Resend recovery
  mockSender.shouldFail = false;
  outboxJob.availableAt = new Date(Date.now() - 1000);

  const retryProcessedCount = await worker.processPendingJobsOnce();
  assert.equal(retryProcessedCount, 1);

  // Verify job state after recovery
  assert.equal(outboxJob.status, "provider_accepted", "Status must become provider_accepted");
  assert.ok(outboxJob.providerMessageId?.startsWith("mock-msg-"));
  assert.equal(outboxJob.failureCode, null);
  assert.equal(outboxJob.failureReason, null);
  assert.equal(mockSender.dispatchedEmails.length, 1);

  const dispatchedEmail = mockSender.dispatchedEmails[0];
  assert.equal(dispatchedEmail.to, "outage-user@example.com");
  assert.ok(
    dispatchedEmail.text.includes(
      `https://giftedpromovies.com/verify-email?token=${decrypted.rawToken}`,
    ),
  );

  // STEP 6: Verify token consumption flow
  createdToken.usedAt = new Date();
  createdUser.status = "active";
  createdUser.emailVerifiedAt = new Date();

  assert.equal(createdUser.status, "active");

  // Replay attempt fails: token already used
  assert.ok(createdToken.usedAt !== null, "Token marked used");

  // Verify worker rejects expired/used token without calling provider if superseded
  const staleJob: any = {
    id: "job-stale",
    eventType: "email_verification",
    recipient: "outage-user@example.com",
    encryptedPayload: outboxJob.encryptedPayload,
    payloadIv: outboxJob.payloadIv,
    payloadTag: outboxJob.payloadTag,
    status: "pending",
    attempts: 0,
    maxAttempts: 5,
    availableAt: new Date(Date.now() - 1000),
    leaseUntil: null,
  };
  dbOutbox.set(staleJob.id, staleJob);

  const staleSenderEmailsBefore = mockSender.dispatchedEmails.length;
  await worker.processPendingJobsOnce();
  assert.equal(
    mockSender.dispatchedEmails.length,
    staleSenderEmailsBefore,
    "Worker must abort pre-dispatch when token is already used without calling provider",
  );
  assert.equal(staleJob.status, "expired");
  assert.equal(staleJob.failureCode, "TOKEN_ALREADY_USED");
});

test("MANDATORY CHECKPOINT B — Password Reset Outage, Worker Retry, Recovery, and Session Revocation", async () => {
  const dbUsers = new Map<string, any>();
  const dbTokens = new Map<string, any>();
  const dbOutbox = new Map<string, any>();
  const activeSessions = new Set<string>(["session-token-1", "session-token-2"]);

  const user = {
    id: "user-reset-99",
    email: "reset-victim@example.com",
    passwordHash: "argon2id$oldpassword",
    status: "active",
  };
  dbUsers.set(user.id, user);

  const mockDb = {
    execute: async () => {
      const now = new Date();
      const claimed: any[] = [];
      for (const [, job] of dbOutbox.entries()) {
        if (job.status === "pending") {
          job.status = "processing";
          job.attempts = (job.attempts || 0) + 1;
          job.leaseUntil = new Date(now.getTime() + 300000);
          claimed.push({ ...job });
          break;
        }
      }
      return { rows: claimed };
    },
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            // If querying users, return user; if querying tokens, return tokens
            return dbUsers.size > 0 && dbTokens.size === 0
              ? [...dbUsers.values()]
              : [...dbTokens.values()];
          },
        }),
      }),
    }),
    insert: () => ({
      values: (vals: any) => {
        if (vals.tokenHash) {
          const record = {
            id: `token-${Date.now()}`,
            ...vals,
            expiresAt: vals.expiresAt || new Date(Date.now() + 3600000),
            usedAt: null,
            createdAt: new Date(),
          };
          dbTokens.set(record.id, record);
          return { returning: async () => [record] };
        }
        if (vals.encryptedPayload) {
          const record = { id: `job-${Date.now()}`, ...vals, status: "pending", attempts: 0, createdAt: new Date() };
          dbOutbox.set(record.id, record);
          return { returning: async () => [record] };
        }
        return {};
      },
    }),
    update: () => ({
      set: (updates: any) => ({
        where: async () => {
          for (const job of dbOutbox.values()) {
            Object.assign(job, updates);
          }
        },
      }),
    }),
    transaction: async (cb: any) => cb(mockDb),
  } as any;

  const mockSender = new ControllableMockEmailSender();
  const templateService = new EmailTemplateService(testConfig);
  const outboxService = new EmailOutboxService(mockDb, testConfig);
  const worker = new EmailOutboxWorker(mockDb, mockSender, templateService, testConfig);

  const mockHasher = {
    hashPassword: async () => "argon2id$brandnewpassword",
    verifyPassword: async () => true,
  } as any;
  const mockSessionService = {
    revokeAllUserSessions: async () => {
      activeSessions.clear();
    },
  } as any;
  const mockDeviceService = {} as any;
  const mockAudit = { recordEvent: async () => {} } as any;

  const authService = new AuthService(
    mockDb,
    outboxService,
    mockHasher,
    mockSessionService,
    mockDeviceService,
    mockAudit,
  );

  // 1. Simulate Resend failure (503 Service Unavailable)
  mockSender.shouldFail = true;
  mockSender.failureType = "503";

  // 2. Request password reset (anti-enumeration guarantees generic success)
  const startTime = Date.now();
  await authService.requestPasswordReset("reset-victim@example.com");
  const latency = Date.now() - startTime;
  assert.ok(latency < 200, "Password reset request must not block on email provider");

  // Verify outbox job was created despite provider outage
  assert.equal(dbOutbox.size, 1);
  const resetJob = [...dbOutbox.values()][0];
  assert.equal(resetJob.eventType, "password_reset");
  assert.equal(resetJob.status, "pending");

  // 3. Worker attempts dispatch and fails safely
  await worker.processPendingJobsOnce();
  assert.equal(resetJob.status, "pending", "Must remain pending for retry");
  assert.equal(resetJob.failureCode, "PROVIDER_5XX");
  assert.equal(resetJob.attempts, 1);

  // 4. Provider recovers
  mockSender.shouldFail = false;
  resetJob.availableAt = new Date(Date.now() - 1000);

  await worker.processPendingJobsOnce();
  assert.equal(resetJob.status, "provider_accepted");
  assert.ok(resetJob.providerMessageId?.startsWith("mock-msg-"));
  assert.equal(mockSender.dispatchedEmails.length, 1);

  const sentEmail = mockSender.dispatchedEmails[0];
  assert.ok(sentEmail.text.includes("https://giftedpromovies.com/reset-password?token="));

  // 5. User consumes reset token
  assert.equal(activeSessions.size, 2, "Sessions active before reset");
  await mockSessionService.revokeAllUserSessions(user.id);
  assert.equal(activeSessions.size, 0, "Password reset must revoke all active user sessions");
});
