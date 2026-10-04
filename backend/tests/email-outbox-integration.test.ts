import assert from "node:assert/strict";
import test from "node:test";
import { AuthService } from "../src/modules/identity/services/auth.service.js";
import { EmailOutboxService } from "../src/infrastructure/email/email-outbox.service.js";
import { decryptOutboxPayload } from "../src/infrastructure/email/outbox-crypto.js";
import { hashToken } from "../src/modules/identity/utils/token.utils.js";
import type { EnvironmentConfig } from "../src/config/environment.js";

const VALID_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const mockConfig: EnvironmentConfig = {
  appEnvironment: "test",
  port: 8000,
  databaseUrl: "postgresql://tester:tester@127.0.0.1:5432/giftedpro_phase1_test",
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
  emailWorkerJitterMs: 500,
};

test("Atomic registration creates user, token, and encrypted outbox job atomically", async () => {
  const users: any[] = [];
  const tokens: any[] = [];
  const outboxJobs: any[] = [];

  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    }),
    insert: () => ({
      values: (vals: any) => {
        if (vals.email && vals.passwordHash) {
          const record = { id: "user-uuid-1", ...vals, createdAt: new Date(), updatedAt: new Date() };
          users.push(record);
          return {
            returning: async () => [record],
          };
        }
        if (vals.tokenHash) {
          tokens.push(vals);
          return {};
        }
        if (vals.encryptedPayload) {
          const record = { id: "outbox-uuid-1", ...vals, createdAt: new Date(), updatedAt: new Date() };
          outboxJobs.push(record);
          return {
            returning: async () => [record],
          };
        }
        return {};
      },
    }),
  } as any;

  const outboxService = new EmailOutboxService(mockDb, mockConfig);
  const mockHasher = { hashPassword: async () => "argon2id$hashed" } as any;
  const mockSessionService = {} as any;
  const mockDeviceService = {} as any;
  const mockAudit = { recordEvent: async () => undefined } as any;

  const authService = new AuthService(
    mockDb,
    outboxService,
    mockHasher,
    mockSessionService,
    mockDeviceService,
    mockAudit,
  );

  const safeUser = await authService.register("NewCustomer@Example.com", "SecurePassword123!");

  assert.equal(safeUser.email, "newcustomer@example.com");
  assert.equal(safeUser.role, "customer");
  assert.equal(safeUser.status, "pending_verification");
  assert.equal(users.length, 1);
  assert.equal(tokens.length, 1);
  assert.equal(outboxJobs.length, 1);

  const job = outboxJobs[0];
  assert.equal(job.eventType, "email_verification");
  assert.equal(job.recipient, "newcustomer@example.com");
  assert.equal(job.status, "pending");

  // Decrypt outbox payload and verify matching token hash
  const decrypted = decryptOutboxPayload<{ rawToken: string }>(
    {
      ciphertext: job.encryptedPayload,
      iv: job.payloadIv,
      tag: job.payloadTag,
    },
    VALID_KEY,
  );
  assert.ok(decrypted.rawToken);
  assert.equal(hashToken(decrypted.rawToken), tokens[0].tokenHash);
});

test("Registration rolls back completely if outbox job insertion fails", async () => {
  let userInserted = false;
  let tokenInserted = false;

  const mockDb = {
    transaction: async (cb: any) => {
      // Simulate rollback when an inner error is thrown
      try {
        await cb(mockDb);
      } catch (err) {
        userInserted = false;
        tokenInserted = false;
        throw err;
      }
    },
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    }),
    insert: () => ({
      values: (vals: any) => {
        if (vals.email && vals.passwordHash) {
          userInserted = true;
          return {
            returning: async () => [{ id: "user-1", ...vals }],
          };
        }
        if (vals.tokenHash) {
          tokenInserted = true;
          return {};
        }
        if (vals.encryptedPayload) {
          throw new Error("Simulated Outbox DB Write Failure");
        }
        return {};
      },
    }),
  } as any;

  const outboxService = new EmailOutboxService(mockDb, mockConfig);
  const mockHasher = { hashPassword: async () => "argon2id$hashed" } as any;
  const mockSessionService = {} as any;
  const mockDeviceService = {} as any;
  const mockAudit = { recordEvent: async () => undefined } as any;

  const authService = new AuthService(
    mockDb,
    outboxService,
    mockHasher,
    mockSessionService,
    mockDeviceService,
    mockAudit,
  );

  await assert.rejects(
    async () => await authService.register("failuser@example.com", "Password123!"),
    /Simulated Outbox DB Write Failure/,
  );

  assert.equal(userInserted, false, "User must not be committed on outbox failure");
  assert.equal(tokenInserted, false, "Token must not be committed on outbox failure");
});

test("Registration does not wait for email provider (asynchronous proof)", async () => {
  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    }),
    insert: () => ({
      values: (vals: any) => ({
        returning: async () => [{ id: "user-perf-1", ...vals }],
      }),
    }),
  } as any;

  const outboxService = new EmailOutboxService(mockDb, mockConfig);
  const mockHasher = { hashPassword: async () => "argon2id$hashed" } as any;
  const mockSessionService = {} as any;
  const mockDeviceService = {} as any;
  const mockAudit = { recordEvent: async () => undefined } as any;

  const authService = new AuthService(
    mockDb,
    outboxService,
    mockHasher,
    mockSessionService,
    mockDeviceService,
    mockAudit,
  );

  const start = Date.now();
  await authService.register("perf_test@example.com", "Password123!");
  const elapsed = Date.now() - start;

  // Registration should be instantaneous (< 150ms in test environment, zero network wait)
  assert.ok(elapsed < 150, `Registration took ${elapsed}ms, expected < 150ms`);
});

test("resendVerification cancels previous pending outbox jobs and creates fresh token", async () => {
  let cancelledJobsCount = 0;
  let newOutboxCreated = false;
  let tokenInvalidated = false;
  let newTokenCreated = false;

  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: "user-resend-1",
              email: "resend_user@example.com",
              status: "pending_verification",
            },
          ],
        }),
      }),
    }),
    update: () => ({
      set: (vals: any) => ({
        where: async () => {
          if (vals.status === "cancelled") {
            cancelledJobsCount++;
          }
          if (vals.usedAt) {
            tokenInvalidated = true;
          }
        },
      }),
    }),
    insert: () => ({
      values: (vals: any) => {
        if (vals.tokenHash) {
          newTokenCreated = true;
          return {};
        }
        if (vals.encryptedPayload) {
          newOutboxCreated = true;
          return {
            returning: async () => [{ id: "outbox-fresh", ...vals }],
          };
        }
        return {};
      },
    }),
  } as any;

  const outboxService = new EmailOutboxService(mockDb, mockConfig);
  const mockHasher = {} as any;
  const mockSessionService = {} as any;
  const mockDeviceService = {} as any;
  const mockAudit = { recordEvent: async () => undefined } as any;

  const authService = new AuthService(
    mockDb,
    outboxService,
    mockHasher,
    mockSessionService,
    mockDeviceService,
    mockAudit,
  );

  await authService.resendVerification("resend_user@example.com");

  assert.equal(tokenInvalidated, true, "Previous token must be invalidated");
  assert.equal(cancelledJobsCount, 1, "Previous outbox job must be cancelled");
  assert.equal(newTokenCreated, true, "New token must be created");
  assert.equal(newOutboxCreated, true, "Fresh outbox job must be created");
});

test("requestPasswordReset cancels previous pending reset jobs and creates fresh reset token", async () => {
  let cancelledJobsCount = 0;
  let newResetOutboxCreated = false;
  let resetTokenInvalidated = false;
  let newResetTokenCreated = false;

  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: "user-reset-1",
              email: "reset_user@example.com",
              status: "active",
            },
          ],
        }),
      }),
    }),
    update: () => ({
      set: (vals: any) => ({
        where: async () => {
          if (vals.status === "cancelled") {
            cancelledJobsCount++;
          }
          if (vals.usedAt) {
            resetTokenInvalidated = true;
          }
        },
      }),
    }),
    insert: () => ({
      values: (vals: any) => {
        if (vals.type === "password_reset") {
          newResetTokenCreated = true;
          return {};
        }
        if (vals.encryptedPayload) {
          newResetOutboxCreated = true;
          return {
            returning: async () => [{ id: "outbox-reset-fresh", ...vals }],
          };
        }
        return {};
      },
    }),
  } as any;

  const outboxService = new EmailOutboxService(mockDb, mockConfig);
  const mockHasher = {} as any;
  const mockSessionService = {} as any;
  const mockDeviceService = {} as any;
  const mockAudit = { recordEvent: async () => undefined } as any;

  const authService = new AuthService(
    mockDb,
    outboxService,
    mockHasher,
    mockSessionService,
    mockDeviceService,
    mockAudit,
  );

  await authService.requestPasswordReset("reset_user@example.com");

  assert.equal(resetTokenInvalidated, true, "Previous reset token must be invalidated");
  assert.equal(cancelledJobsCount, 1, "Previous reset outbox job must be cancelled");
  assert.equal(newResetTokenCreated, true, "New reset token must be created");
  assert.equal(newResetOutboxCreated, true, "Fresh reset outbox job must be created");
});
