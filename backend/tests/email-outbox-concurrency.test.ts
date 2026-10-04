import assert from "node:assert/strict";
import test from "node:test";
import { EmailOutboxWorker } from "../src/infrastructure/email/email-outbox.worker.js";
import { EmailTemplateService } from "../src/infrastructure/email/email-template.service.js";
import type { EmailSender } from "../src/infrastructure/email/email-sender.interface.js";
import { encryptOutboxPayload } from "../src/infrastructure/email/outbox-crypto.js";
import type { EnvironmentConfig } from "../src/config/environment.js";

const VALID_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const testConfig: EnvironmentConfig = {
  appEnvironment: "test",
  port: 8000,
  databaseUrl: "postgresql://tester:tester@127.0.0.1:5433/giftedpro_phase1_test",
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
  emailWorkerLeaseMs: 1000, // 1 second lease for fast testing
  emailWorkerMaxAttempts: 5,
  emailWorkerBaseBackoffMs: 2000,
  emailWorkerMaxBackoffMs: 60000,
  emailWorkerJitterMs: 0,
};

test("Concurrency & Worker Isolation — Mutually exclusive lease claiming with FOR UPDATE SKIP LOCKED", async () => {
  const encrypted = encryptOutboxPayload({ rawToken: "concurrency_token_1234567890abcdef" }, VALID_KEY);

  const sharedOutboxRow: any = {
    id: "job-shared-concurrency",
    event_type: "email_verification",
    recipient: "concurrent@example.com",
    subject: "Verify your email",
    encrypted_payload: encrypted.ciphertext,
    payload_iv: encrypted.iv,
    payload_tag: encrypted.tag,
    status: "pending",
    attempts: 0,
    max_attempts: 5,
    available_at: new Date(Date.now() - 5000),
    locked_at: null,
    locked_by: null,
    lease_until: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  let activeLeaseHolder: string | null = null;
  const dispatchHistory: string[] = [];

  // Simulated concurrency-safe database mock with atomic row-level lease lock
  const createMockDbForWorker = (workerName: string) => ({
    execute: async () => {
      const now = new Date();
      // Atomic row lock simulation (FOR UPDATE SKIP LOCKED)
      const isClaimable =
        (sharedOutboxRow.status === "pending" && sharedOutboxRow.available_at <= now) ||
        (sharedOutboxRow.status === "processing" &&
          sharedOutboxRow.lease_until &&
          sharedOutboxRow.lease_until < now);

      if (isClaimable && activeLeaseHolder === null) {
        activeLeaseHolder = workerName;
        sharedOutboxRow.status = "processing";
        sharedOutboxRow.locked_at = now;
        sharedOutboxRow.locked_by = workerName;
        sharedOutboxRow.lease_until = new Date(now.getTime() + 1000);
        sharedOutboxRow.attempts = (sharedOutboxRow.attempts || 0) + 1;
        return { rows: [{ ...sharedOutboxRow }] };
      }

      // If another worker currently holds an unexpired lease, SKIP LOCKED returns empty
      return { rows: [] };
    },
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ tokenHash: "matching-hash", usedAt: null, expiresAt: new Date(Date.now() + 86400000) }],
        }),
      }),
    }),
    update: () => ({
      set: (updates: any) => ({
        where: () => {
          Object.assign(sharedOutboxRow, updates);
          activeLeaseHolder = null; // lease released on completion/failure
          return Promise.resolve();
        },
      }),
    }),
  });

  const createSenderForWorker = (workerName: string): EmailSender => ({
    sendEmail: async () => {
      dispatchHistory.push(workerName);
      return { messageId: `msg-${workerName}-${Date.now()}` };
    },
    sendVerificationEmail: async () => {},
    sendPasswordResetEmail: async () => {},
  });

  const templateService = new EmailTemplateService(testConfig);

  const workerA = new EmailOutboxWorker(createMockDbForWorker("Worker-A") as any, createSenderForWorker("Worker-A"), templateService, testConfig);
  const workerB = new EmailOutboxWorker(createMockDbForWorker("Worker-B") as any, createSenderForWorker("Worker-B"), templateService, testConfig);
  const workerC = new EmailOutboxWorker(createMockDbForWorker("Worker-C") as any, createSenderForWorker("Worker-C"), templateService, testConfig);

  // Trigger all 3 workers simultaneously against the same single job
  const [resA, resB, resC] = await Promise.all([
    workerA.processPendingJobsOnce(),
    workerB.processPendingJobsOnce(),
    workerC.processPendingJobsOnce(),
  ]);

  // Exactly ONE worker must succeed in claiming and dispatching the job
  const totalClaimed = resA + resB + resC;
  assert.equal(totalClaimed, 1, `Exactly 1 worker must claim the job, got ${totalClaimed}`);
  assert.equal(dispatchHistory.length, 1, "Email must only be dispatched once by the lease-holding worker");
  assert.equal(sharedOutboxRow.status, "provider_accepted");
  assert.equal(sharedOutboxRow.attempts, 1);
});

test("Stale Lease Recovery — Dead/crashed worker's lease is reclaimed after lease_until expires", async () => {
  const encrypted = encryptOutboxPayload({ rawToken: "stale_token_test_123" }, VALID_KEY);

  // Job was claimed by crashed worker 10 seconds ago, lease expired 5 seconds ago
  const orphanedJob: any = {
    id: "job-orphaned-by-crash",
    event_type: "email_verification",
    recipient: "orphan@example.com",
    subject: "Verify email",
    encrypted_payload: encrypted.ciphertext,
    payload_iv: encrypted.iv,
    payload_tag: encrypted.tag,
    status: "processing", // left in processing state by crashed worker
    attempts: 1,
    max_attempts: 5,
    available_at: new Date(Date.now() - 60000),
    locked_at: new Date(Date.now() - 10000),
    locked_by: "crashed-worker-pid-9999",
    lease_until: new Date(Date.now() - 5000), // EXPIRED LEASE
    created_at: new Date(Date.now() - 60000),
    updated_at: new Date(Date.now() - 10000),
  };

  let dispatched = false;

  const mockDb = {
    execute: async () => {
      const now = new Date();
      // Stale lease recovery condition: status = 'processing' AND lease_until < NOW()
      if (orphanedJob.status === "processing" && orphanedJob.lease_until && orphanedJob.lease_until < now) {
        orphanedJob.locked_by = "survivor-worker";
        orphanedJob.locked_at = now;
        orphanedJob.lease_until = new Date(now.getTime() + 300000);
        orphanedJob.attempts = orphanedJob.attempts + 1;
        return { rows: [{ ...orphanedJob }] };
      }
      return { rows: [] };
    },
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ tokenHash: "matching-hash", usedAt: null, expiresAt: new Date(Date.now() + 86400000) }],
        }),
      }),
    }),
    update: () => ({
      set: (updates: any) => ({
        where: () => {
          Object.assign(orphanedJob, updates);
          return Promise.resolve();
        },
      }),
    }),
  } as any;

  const mockSender: EmailSender = {
    sendEmail: async () => {
      dispatched = true;
      return { messageId: "msg-recovered-99" };
    },
    sendVerificationEmail: async () => {},
    sendPasswordResetEmail: async () => {},
  };

  const templateService = new EmailTemplateService(testConfig);
  const survivorWorker = new EmailOutboxWorker(mockDb, mockSender, templateService, testConfig);

  const reclaimedCount = await survivorWorker.processPendingJobsOnce();
  assert.equal(reclaimedCount, 1, "Survivor worker must successfully reclaim expired lease");
  assert.equal(dispatched, true, "Email must be dispatched by survivor worker");
  assert.equal(orphanedJob.status, "provider_accepted");
  assert.equal(orphanedJob.attempts, 2, "Attempt counter must increment on lease recovery retry");
});
