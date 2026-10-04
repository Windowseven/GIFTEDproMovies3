import assert from "node:assert/strict";
import test from "node:test";
import {
  EmailOutboxWorker,
  classifyError,
  sanitizeErrorMessage,
} from "../src/infrastructure/email/email-outbox.worker.js";
import { EmailTemplateService } from "../src/infrastructure/email/email-template.service.js";
import { encryptOutboxPayload } from "../src/infrastructure/email/outbox-crypto.js";
import type { EnvironmentConfig } from "../src/config/environment.js";
import type { EmailSender } from "../src/infrastructure/email/email-sender.interface.js";

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
  emailWorkerMaxAttempts: 3,
  emailWorkerBaseBackoffMs: 1000,
  emailWorkerMaxBackoffMs: 10000,
  emailWorkerJitterMs: 100,
};

test("classifyError correctly identifies transient vs permanent failures", () => {
  // Transient
  assert.deepEqual(classifyError(new Error("Rate limit exceeded (429)")), {
    code: "PROVIDER_RATE_LIMIT",
    isTransient: true,
  });
  assert.deepEqual(classifyError(new Error("connect ETIMEDOUT 1.2.3.4")), {
    code: "NETWORK_TIMEOUT",
    isTransient: true,
  });
  assert.deepEqual(classifyError(new Error("Internal Server Error 500")), {
    code: "PROVIDER_5XX",
    isTransient: true,
  });
  assert.deepEqual(classifyError(new Error("ECONNRESET by peer")), {
    code: "PROVIDER_5XX",
    isTransient: true,
  });
  assert.deepEqual(classifyError(new Error("Some arbitrary network glitch")), {
    code: "PROVIDER_5XX",
    isTransient: true,
  });

  // Permanent
  assert.deepEqual(classifyError(new Error("Invalid recipient email address")), {
    code: "INVALID_RECIPIENT",
    isTransient: false,
  });
  assert.deepEqual(classifyError(new Error("RESEND_API_KEY is not configured")), {
    code: "CONFIGURATION_ERROR",
    isTransient: false,
  });
  assert.deepEqual(classifyError(new Error("Domain not verified in Resend")), {
    code: "CONFIGURATION_ERROR",
    isTransient: false,
  });
  assert.deepEqual(classifyError(new Error("Validation_error: invalid subject")), {
    code: "PROVIDER_REJECTED",
    isTransient: false,
  });
});

test("sanitizeErrorMessage scrubs emails, URLs, tokens, and caps length", () => {
  const dirty = "Failed sending to customer@domain.com via https://api.resend.com/emails?token=secr3t_token_val - unexpected error";
  const clean = sanitizeErrorMessage(new Error(dirty));

  assert.ok(!clean.includes("customer@domain.com"));
  assert.ok(clean.includes("[EMAIL]"));
  assert.ok(!clean.includes("https://api.resend.com"));
  assert.ok(clean.includes("[URL]"));
  assert.ok(!clean.includes("secr3t_token_val"));
  assert.ok(clean.length <= 255);
});

test("EmailOutboxWorker marks job provider_accepted on successful dispatch", async () => {
  const rawToken = "valid_token_1234567890";
  const { ciphertext, iv, tag } = encryptOutboxPayload({ rawToken }, VALID_KEY);

  let updatedStatus: any = null;
  const mockDb = {
    execute: async () => ({
      rows: [
        {
          id: "job-1",
          eventType: "email_verification",
          recipient: "user@example.com",
          encryptedPayload: ciphertext,
          payloadIv: iv,
          payloadTag: tag,
          status: "processing",
          attempts: 1,
          maxAttempts: 3,
        },
      ],
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: "token-1",
              expiresAt: new Date(Date.now() + 100000),
              usedAt: null,
            },
          ],
        }),
      }),
    }),
    update: () => ({
      set: (values: any) => {
        updatedStatus = values;
        return {
          where: async () => undefined,
        };
      },
    }),
  } as any;

  let emailSent = false;
  const mockEmailSender: EmailSender = {
    sendEmail: async () => {
      emailSent = true;
    },
    sendVerificationEmail: async () => undefined,
    sendPasswordResetEmail: async () => undefined,
  };

  const templateService = new EmailTemplateService(mockConfig);
  const worker = new EmailOutboxWorker(
    mockDb,
    mockEmailSender,
    templateService,
    mockConfig,
  );

  const processedCount = await worker.processPendingJobsOnce();

  assert.equal(processedCount, 1);
  assert.equal(emailSent, true);
  assert.equal(updatedStatus.status, "provider_accepted");
  assert.ok(updatedStatus.completedAt);
});

test("EmailOutboxWorker marks job expired if auth token is expired or used", async () => {
  const rawToken = "expired_token_123";
  const { ciphertext, iv, tag } = encryptOutboxPayload({ rawToken }, VALID_KEY);

  let updatedStatus: any = null;
  const mockDb = {
    execute: async () => ({
      rows: [
        {
          id: "job-expired-1",
          eventType: "email_verification",
          recipient: "user@example.com",
          encryptedPayload: ciphertext,
          payloadIv: iv,
          payloadTag: tag,
          status: "processing",
          attempts: 1,
          maxAttempts: 3,
        },
      ],
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: "token-expired-id",
              expiresAt: new Date(Date.now() - 5000), // ALREADY EXPIRED!
              usedAt: null,
            },
          ],
        }),
      }),
    }),
    update: () => ({
      set: (values: any) => {
        updatedStatus = values;
        return {
          where: async () => undefined,
        };
      },
    }),
  } as any;

  let emailSent = false;
  const mockEmailSender: EmailSender = {
    sendEmail: async () => {
      emailSent = true;
    },
    sendVerificationEmail: async () => undefined,
    sendPasswordResetEmail: async () => undefined,
  };

  const templateService = new EmailTemplateService(mockConfig);
  const worker = new EmailOutboxWorker(
    mockDb,
    mockEmailSender,
    templateService,
    mockConfig,
  );

  await worker.processPendingJobsOnce();

  assert.equal(emailSent, false, "Must not call email provider for expired token");
  assert.equal(updatedStatus.status, "expired");
  assert.equal(updatedStatus.failureCode, "TOKEN_EXPIRED");
});

test("EmailOutboxWorker marks job expired if auth token was already used or invalidated", async () => {
  const rawToken = "used_token_123";
  const { ciphertext, iv, tag } = encryptOutboxPayload({ rawToken }, VALID_KEY);

  let updatedStatus: any = null;
  const mockDb = {
    execute: async () => ({
      rows: [
        {
          id: "job-used-1",
          eventType: "email_verification",
          recipient: "user@example.com",
          encryptedPayload: ciphertext,
          payloadIv: iv,
          payloadTag: tag,
          status: "processing",
          attempts: 1,
          maxAttempts: 3,
        },
      ],
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: "token-used-id",
              expiresAt: new Date(Date.now() + 50000),
              usedAt: new Date(), // ALREADY USED!
            },
          ],
        }),
      }),
    }),
    update: () => ({
      set: (values: any) => {
        updatedStatus = values;
        return {
          where: async () => undefined,
        };
      },
    }),
  } as any;

  let emailSent = false;
  const mockEmailSender: EmailSender = {
    sendEmail: async () => {
      emailSent = true;
    },
    sendVerificationEmail: async () => undefined,
    sendPasswordResetEmail: async () => undefined,
  };

  const templateService = new EmailTemplateService(mockConfig);
  const worker = new EmailOutboxWorker(
    mockDb,
    mockEmailSender,
    templateService,
    mockConfig,
  );

  await worker.processPendingJobsOnce();

  assert.equal(emailSent, false, "Must not call email provider for invalidated token");
  assert.equal(updatedStatus.status, "expired");
  assert.equal(updatedStatus.failureCode, "TOKEN_ALREADY_USED");
});

test("EmailOutboxWorker schedules bounded retry on transient provider error", async () => {
  const rawToken = "transient_fail_token";
  const { ciphertext, iv, tag } = encryptOutboxPayload({ rawToken }, VALID_KEY);

  let updatedStatus: any = null;
  const mockDb = {
    execute: async () => ({
      rows: [
        {
          id: "job-transient-1",
          eventType: "email_verification",
          recipient: "user@example.com",
          encryptedPayload: ciphertext,
          payloadIv: iv,
          payloadTag: tag,
          status: "processing",
          attempts: 1,
          maxAttempts: 3,
        },
      ],
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: "token-valid",
              expiresAt: new Date(Date.now() + 50000),
              usedAt: null,
            },
          ],
        }),
      }),
    }),
    update: () => ({
      set: (values: any) => {
        updatedStatus = values;
        return {
          where: async () => undefined,
        };
      },
    }),
  } as any;

  const mockEmailSender: EmailSender = {
    sendEmail: async () => {
      throw new Error("HTTP 429 Too Many Requests");
    },
    sendVerificationEmail: async () => undefined,
    sendPasswordResetEmail: async () => undefined,
  };

  const templateService = new EmailTemplateService(mockConfig);
  const worker = new EmailOutboxWorker(
    mockDb,
    mockEmailSender,
    templateService,
    mockConfig,
  );

  await worker.processPendingJobsOnce();

  assert.equal(updatedStatus.status, "pending");
  assert.equal(updatedStatus.failureCode, "PROVIDER_RATE_LIMIT");
  assert.ok(updatedStatus.availableAt > new Date());
  assert.ok(updatedStatus.nextRetryAt > new Date());
});

test("EmailOutboxWorker marks job failed permanently after reaching maxAttempts", async () => {
  const rawToken = "max_attempts_token";
  const { ciphertext, iv, tag } = encryptOutboxPayload({ rawToken }, VALID_KEY);

  let updatedStatus: any = null;
  const mockDb = {
    execute: async () => ({
      rows: [
        {
          id: "job-max-1",
          eventType: "email_verification",
          recipient: "user@example.com",
          encryptedPayload: ciphertext,
          payloadIv: iv,
          payloadTag: tag,
          status: "processing",
          attempts: 3, // REACHED MAX ATTEMPTS!
          maxAttempts: 3,
        },
      ],
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: "token-valid",
              expiresAt: new Date(Date.now() + 50000),
              usedAt: null,
            },
          ],
        }),
      }),
    }),
    update: () => ({
      set: (values: any) => {
        updatedStatus = values;
        return {
          where: async () => undefined,
        };
      },
    }),
  } as any;

  const mockEmailSender: EmailSender = {
    sendEmail: async () => {
      throw new Error("ETIMEDOUT connection failed");
    },
    sendVerificationEmail: async () => undefined,
    sendPasswordResetEmail: async () => undefined,
  };

  const templateService = new EmailTemplateService(mockConfig);
  const worker = new EmailOutboxWorker(
    mockDb,
    mockEmailSender,
    templateService,
    mockConfig,
  );

  await worker.processPendingJobsOnce();

  assert.equal(updatedStatus.status, "failed");
  assert.equal(updatedStatus.failureCode, "MAX_ATTEMPTS_EXCEEDED");
});
