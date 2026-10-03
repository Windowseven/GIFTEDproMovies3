import process from "node:process";
import crypto from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";
import { Resend } from "resend";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import fastifyCookie from "@fastify/cookie";
import { AppModule } from "../dist/app.module.js";
import { loadEnvironment } from "../dist/config/environment.js";
import { configureHttpApplication } from "../dist/http/configure-http-application.js";
import { ApiExceptionFilter } from "../dist/http/api-exception.filter.js";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || "postgresql://tester@127.0.0.1:5433/giftedpro_phase1_test";
const recipient = "lespikiusjunior@gmail.com";
const initialResendMessageId = "01a102dd-59ed-7827-9e23-5f10a3ed9699";

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

async function run() {
  process.env.DATABASE_URL = databaseUrl;
  process.env.APP_ENV = "test";
  process.env.EMAIL_PROVIDER = "resend";

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const resend = new Resend(process.env.RESEND_API_KEY);

  process.stdout.write("--- Step 1: Retrieving Initial Registration Email from Resend ---\n");
  const emailRes = await resend.emails.get(initialResendMessageId);
  if (!emailRes.data?.text) {
    throw new Error(`Failed to retrieve email content from Resend for ${initialResendMessageId}`);
  }

  const tokenMatch = emailRes.data.text.match(/Your verification token is:\s*([a-f0-9]{64})/i);
  if (!tokenMatch || !tokenMatch[1]) {
    throw new Error("Could not extract verification token from email text");
  }
  const initialRawToken = tokenMatch[1];
  const initialTokenHash = hashToken(initialRawToken);

  // Verify hash matches database record
  const tokenDbRes = await pool.query(
    "SELECT id, user_id, type, token_hash, used_at FROM auth_tokens WHERE token_hash = $1",
    [initialTokenHash],
  );
  if (tokenDbRes.rows.length === 0) {
    throw new Error("Initial token hash does NOT match any record in auth_tokens table");
  }
  const initialTokenRecord = tokenDbRes.rows[0];
  process.stdout.write(`Verified initial token in auth_tokens (ID: ${initialTokenRecord.id}, Hash matched)\n`);

  // Ensure user is pending_verification and initial token used_at is NULL for clean testing
  await pool.query("UPDATE users SET status = 'pending_verification', email_verified_at = NULL WHERE id = $1", [initialTokenRecord.user_id]);
  await pool.query("UPDATE auth_tokens SET used_at = NULL WHERE id = $1", [initialTokenRecord.id]);

  process.stdout.write("\n--- Initializing NestJS Fastify Application ---\n");
  loadEnvironment(process.env);
  const app = await NestFactory.create(AppModule, new FastifyAdapter({ disableRequestLogging: true }));
  const fastify = app.getHttpAdapter().getInstance();
  await fastify.register(fastifyCookie);
  configureHttpApplication(app);
  app.useGlobalFilters(new ApiExceptionFilter(fastify.log));
  await app.init();

  process.stdout.write("\n--- Step 2: Testing Resend Verification Invalidation ---\n");
  const resendHttpRes = await app.inject({
    method: "POST",
    url: "/api/v1/auth/resend-verification",
    payload: { email: recipient },
  });
  if (resendHttpRes.statusCode !== 200) {
    throw new Error(`Resend verification failed with status ${resendHttpRes.statusCode}: ${resendHttpRes.body}`);
  }
  process.stdout.write("POST /api/v1/auth/resend-verification returned 200 OK\n");

  // Verify initial token is now marked used (invalidated)
  const invalidatedRes = await pool.query("SELECT used_at FROM auth_tokens WHERE id = $1", [initialTokenRecord.id]);
  if (!invalidatedRes.rows[0]?.used_at) {
    throw new Error("Initial token was NOT marked as used after resend-verification!");
  }
  process.stdout.write(`Initial token ${initialTokenRecord.id} successfully invalidated (used_at: ${invalidatedRes.rows[0].used_at.toISOString()})\n`);

  // Verify initial token rejection (cannot be used now)
  const rejectedVerifyRes = await app.inject({
    method: "POST",
    url: "/api/v1/auth/verify-email",
    payload: { token: initialRawToken },
  });
  if (rejectedVerifyRes.statusCode !== 400) {
    throw new Error(`Expected HTTP 400 for invalidated token, got ${rejectedVerifyRes.statusCode}`);
  }
  process.stdout.write("Invalidated token verification correctly rejected with HTTP 400 Bad Request\n");

  process.stdout.write("\n--- Step 3: Verifying Account with Real Token from Email ---\n");
  // Reset initial token used_at to NULL to test verification of real received email token
  await pool.query("UPDATE auth_tokens SET used_at = NULL WHERE id = $1", [initialTokenRecord.id]);
  
  const verifyRes = await app.inject({
    method: "POST",
    url: "/api/v1/auth/verify-email",
    payload: { token: initialRawToken },
  });
  if (verifyRes.statusCode !== 200) {
    throw new Error(`Verification failed with status ${verifyRes.statusCode}: ${verifyRes.body}`);
  }
  process.stdout.write(`POST /api/v1/auth/verify-email returned 200 OK: ${verifyRes.body}\n`);

  // Check database user status
  const userAfterVerify = await pool.query("SELECT id, status, email_verified_at FROM users WHERE id = $1", [initialTokenRecord.user_id]);
  const u = userAfterVerify.rows[0];
  if (u.status !== "active") {
    throw new Error(`Expected user status to be 'active', got '${u.status}'`);
  }
  if (!u.email_verified_at) {
    throw new Error("Expected user email_verified_at to be populated, got NULL");
  }
  process.stdout.write(`Database verified: users.status = '${u.status}', email_verified_at = ${u.email_verified_at.toISOString()}\n`);

  // Check auth_token used_at
  const tokenAfterVerify = await pool.query("SELECT used_at FROM auth_tokens WHERE id = $1", [initialTokenRecord.id]);
  if (!tokenAfterVerify.rows[0]?.used_at) {
    throw new Error("Expected token.used_at to be populated after verification");
  }
  process.stdout.write(`Database verified: auth_tokens.used_at = ${tokenAfterVerify.rows[0].used_at.toISOString()}\n`);

  process.stdout.write("\n--- Step 4: Testing Token Replay Rejection ---\n");
  const replayRes = await app.inject({
    method: "POST",
    url: "/api/v1/auth/verify-email",
    payload: { token: initialRawToken },
  });
  if (replayRes.statusCode !== 400) {
    throw new Error(`Expected replay attempt to return 400 Bad Request, got ${replayRes.statusCode}`);
  }
  process.stdout.write("Token replay correctly rejected with 400 Bad Request\n");

  process.stdout.write("\n--- Step 5: Testing Login for Verified User ---\n");
  const loginRes = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: {
      email: recipient,
      password: "StrongPassword123!",
      deviceIdentifier: "macbook-pro-e2e-tester",
      deviceName: "Admin MacBook Pro",
      deviceType: "desktop",
    },
  });
  if (loginRes.statusCode !== 200) {
    throw new Error(`Login failed with status ${loginRes.statusCode}: ${loginRes.body}`);
  }
  const loginBody = loginRes.json();
  const sessionId = loginBody.data?.session?.id || loginBody.session?.id;
  process.stdout.write(`Login succeeded with 200 OK. Session ID: ${sessionId}\n`);

  // Verify session in DB
  const sessionDbRes = await pool.query("SELECT id, user_id, revoked_at FROM sessions WHERE id = $1", [sessionId]);
  if (sessionDbRes.rows.length === 0 || sessionDbRes.rows[0].revoked_at !== null) {
    throw new Error("Active session was not found in sessions table");
  }
  process.stdout.write("Active session verified in sessions table\n");

  process.stdout.write("\n--- Step 6: Testing Password Reset and Session Revocation ---\n");
  const resetReqRes = await app.inject({
    method: "POST",
    url: "/api/v1/auth/request-password-reset",
    payload: { email: recipient },
  });
  if (resetReqRes.statusCode !== 200) {
    throw new Error(`Password reset request failed: ${resetReqRes.body}`);
  }
  process.stdout.write("POST /api/v1/auth/request-password-reset returned 200 OK\n");

  const resetRawToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = hashToken(resetRawToken);
  await pool.query(
    "INSERT INTO auth_tokens (user_id, type, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
    [initialTokenRecord.user_id, "password_reset", resetTokenHash, new Date(Date.now() + 3600000)],
  );

  const resetActionRes = await app.inject({
    method: "POST",
    url: "/api/v1/auth/reset-password",
    payload: {
      token: resetRawToken,
      newPassword: "BrandNewSecurePassword456!",
    },
  });
  if (resetActionRes.statusCode !== 200) {
    throw new Error(`Password reset failed with status ${resetActionRes.statusCode}: ${resetActionRes.body}`);
  }
  process.stdout.write("POST /api/v1/auth/reset-password returned 200 OK\n");

  // Verify all sessions for user were revoked
  const revokedSessionsRes = await pool.query(
    "SELECT id, revoked_at FROM sessions WHERE user_id = $1 AND revoked_at IS NULL",
    [initialTokenRecord.user_id],
  );
  if (revokedSessionsRes.rows.length > 0) {
    throw new Error("Active sessions were NOT revoked after password reset!");
  }
  process.stdout.write("All prior user sessions confirmed revoked in database\n");

  // Verify old password fails login
  const oldLoginRes = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: {
      email: recipient,
      password: "StrongPassword123!",
    },
  });
  if (oldLoginRes.statusCode !== 401) {
    throw new Error(`Expected old password login to fail with 401, got ${oldLoginRes.statusCode}`);
  }
  process.stdout.write("Old password login correctly rejected with 401 Unauthorized\n");

  // Verify new password succeeds login
  const newLoginRes = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: {
      email: recipient,
      password: "BrandNewSecurePassword456!",
    },
  });
  if (newLoginRes.statusCode !== 200) {
    throw new Error(`Expected new password login to succeed, got ${newLoginRes.statusCode}`);
  }
  process.stdout.write("New password login successfully authenticated with 200 OK\n");

  process.stdout.write("\n--- Step 7: Testing Central Account Status Enforcement ---\n");
  // Set user to suspended
  await pool.query("UPDATE users SET status = 'suspended' WHERE id = $1", [initialTokenRecord.user_id]);
  const suspendedLoginRes = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: {
      email: recipient,
      password: "BrandNewSecurePassword456!",
    },
  });
  if (suspendedLoginRes.statusCode !== 403) {
    throw new Error(`Expected suspended account to return 403 Forbidden, got ${suspendedLoginRes.statusCode}`);
  }
  process.stdout.write(`Suspended account correctly rejected with 403: ${JSON.stringify(suspendedLoginRes.json())}\n`);

  // Set user to deactivated
  await pool.query("UPDATE users SET status = 'deactivated' WHERE id = $1", [initialTokenRecord.user_id]);
  const deactivatedLoginRes = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: {
      email: recipient,
      password: "BrandNewSecurePassword456!",
    },
  });
  if (deactivatedLoginRes.statusCode !== 403) {
    throw new Error(`Expected deactivated account to return 403 Forbidden, got ${deactivatedLoginRes.statusCode}`);
  }
  process.stdout.write(`Deactivated account correctly rejected with 403: ${JSON.stringify(deactivatedLoginRes.json())}\n`);

  // Restore user to active
  await pool.query("UPDATE users SET status = 'active' WHERE id = $1", [initialTokenRecord.user_id]);
  process.stdout.write("Restored user status to active\n");

  await app.close();
  await pool.end();

  process.stdout.write("\n=======================================================\n");
  process.stdout.write("PHASE 2 AUTHENTICATION & EMAIL E2E VERIFICATION COMPLETE: ALL PASS\n");
  process.stdout.write("=======================================================\n");
}

run().catch((err) => {
  process.stderr.write(`FATAL E2E ERROR: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
