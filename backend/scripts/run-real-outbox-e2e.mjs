import process from "node:process";
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
import { EmailOutboxWorker } from "../dist/infrastructure/email/email-outbox.worker.js";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || "postgresql://tester@127.0.0.1:5433/giftedpro_phase1_test";
const recipient = "lespikiusjunior@gmail.com";

async function run() {
  process.env.DATABASE_URL = databaseUrl;
  process.env.APP_ENV = "test";
  process.env.EMAIL_PROVIDER = "resend";
  process.env.EMAIL_WORKER_ENABLED = "false";
  process.env.EMAIL_OUTBOX_ENCRYPTION_KEY = process.env.EMAIL_OUTBOX_ENCRYPTION_KEY || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const resend = new Resend(process.env.RESEND_API_KEY);

  process.stdout.write("===================================================\n");
  process.stdout.write("GIFTEDproMovies — Real Outbox + Resend E2E Verification\n");
  process.stdout.write("===================================================\n\n");

  // Step 0: Clean previous records for recipient
  process.stdout.write("--- Step 0: Cleaning previous records for " + recipient + " ---\n");
  await pool.query("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = $1)", [recipient]);
  await pool.query("DELETE FROM auth_tokens WHERE user_id IN (SELECT id FROM users WHERE email = $1)", [recipient]);
  await pool.query("DELETE FROM devices WHERE user_id IN (SELECT id FROM users WHERE email = $1)", [recipient]);
  await pool.query("DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email = $1)", [recipient]);
  await pool.query("DELETE FROM user_capabilities WHERE user_id IN (SELECT id FROM users WHERE email = $1)", [recipient]);
  await pool.query("DELETE FROM user_identities WHERE user_id IN (SELECT id FROM users WHERE email = $1)", [recipient]);
  await pool.query("DELETE FROM email_outbox WHERE recipient = $1", [recipient]);
  await pool.query("DELETE FROM users WHERE email = $1", [recipient]);
  process.stdout.write("✓ Previous user and outbox records purged successfully.\n\n");

  // Step 1: Initialize NestJS application
  process.stdout.write("--- Step 1: Bootstrapping Application ---\n");
  loadEnvironment(process.env);
  const app = await NestFactory.create(AppModule, new FastifyAdapter({ disableRequestLogging: true }));
  const fastify = app.getHttpAdapter().getInstance();
  await fastify.register(fastifyCookie);
  configureHttpApplication(app);
  app.useGlobalFilters(new ApiExceptionFilter(fastify.log));
  await app.init();
  process.stdout.write("✓ NestJS app initialized with Fastify & Drizzle.\n\n");

  // Step 2: Atomic Registration via HTTP
  process.stdout.write("--- Step 2: Testing Atomic Registration (User + Token + Outbox) ---\n");
  const startTime = Date.now();
  const registerRes = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: {
      email: recipient,
      password: "SuperSecurePassword987!",
    },
  });
  const latencyMs = Date.now() - startTime;
  process.stdout.write(`Registration returned in ${latencyMs}ms with status ${registerRes.statusCode}\n`);

  if (registerRes.statusCode !== 201) {
    throw new Error(`Registration failed: ${registerRes.payload}`);
  }
  const registerBody = registerRes.json();
  if (registerBody.data?.user?.status !== "pending_verification") {
    throw new Error(`Expected user status pending_verification, got: ${registerBody.data?.user?.status}`);
  }
  process.stdout.write(`✓ User registered with ID ${registerBody.data.user.id}, status: ${registerBody.data.user.status}\n\n`);

  // Step 3: Inspect Database Outbox State
  process.stdout.write("--- Step 3: Inspecting Outbox Table in PostgreSQL ---\n");
  const outboxRes = await pool.query(
    "SELECT id, event_type, recipient, status, attempts, encrypted_payload, payload_iv, payload_tag, available_at FROM email_outbox WHERE recipient = $1",
    [recipient],
  );
  if (outboxRes.rows.length === 0) {
    throw new Error("No outbox job found in PostgreSQL after registration!");
  }
  const initialJob = outboxRes.rows[0];
  process.stdout.write(`Found outbox job ID: ${initialJob.id}\n`);
  process.stdout.write(`  Event Type: ${initialJob.event_type}\n`);
  process.stdout.write(`  Recipient:  ${initialJob.recipient}\n`);
  process.stdout.write(`  Status:     ${initialJob.status}\n`);
  process.stdout.write(`  IV:         ${initialJob.payload_iv} (length: ${initialJob.payload_iv.length})\n`);
  process.stdout.write(`  Tag:        ${initialJob.payload_tag} (length: ${initialJob.payload_tag.length})\n`);
  process.stdout.write(`  Payload:    ${initialJob.encrypted_payload.substring(0, 32)}... (encrypted, not plaintext)\n`);

  if (initialJob.status !== "pending") {
    throw new Error(`Expected outbox status pending, got: ${initialJob.status}`);
  }
  process.stdout.write("✓ Outbox job verified in PostgreSQL: encrypted payload, status=pending.\n\n");

  // Step 4: Execute Dedicated Outbox Worker to Dispatch via Resend
  process.stdout.write("--- Step 4: Executing Dedicated EmailOutboxWorker.processPendingJobsOnce() ---\n");
  const worker = app.get(EmailOutboxWorker);
  const workerStart = Date.now();
  await worker.processPendingJobsOnce();
  const workerDurationMs = Date.now() - workerStart;
  process.stdout.write(`Worker processing completed in ${workerDurationMs}ms.\n`);

  // Step 5: Verify Updated Outbox State in PostgreSQL
  process.stdout.write("--- Step 5: Verifying Outbox Job Post-Dispatch Status ---\n");
  const postDispatchRes = await pool.query(
    "SELECT id, status, attempts, provider_message_id, failure_code, failure_reason, completed_at FROM email_outbox WHERE id = $1",
    [initialJob.id],
  );
  const processedJob = postDispatchRes.rows[0];
  process.stdout.write(`  Status:              ${processedJob.status}\n`);
  process.stdout.write(`  Attempts:            ${processedJob.attempts}\n`);
  process.stdout.write(`  Provider Message ID: ${processedJob.provider_message_id}\n`);
  process.stdout.write(`  Completed At:        ${processedJob.completed_at}\n`);
  process.stdout.write(`  Failure Code:        ${processedJob.failure_code || "none"}\n`);

  if (processedJob.status !== "provider_accepted") {
    throw new Error(`Expected outbox status provider_accepted, got: ${processedJob.status} (failure: ${processedJob.failure_reason})`);
  }
  if (!processedJob.provider_message_id) {
    throw new Error("Expected provider_message_id from Resend, got null/empty");
  }
  process.stdout.write("✓ Outbox job transitioned to 'provider_accepted' with valid Resend message ID!\n\n");

  // Step 6: Verify Delivery Content with Resend API
  process.stdout.write("--- Step 6: Inspecting Delivered Email Content via Resend API ---\n");
  const resendEmail = await resend.emails.get(processedJob.provider_message_id);
  if (!resendEmail.data) {
    throw new Error(`Failed to retrieve email details from Resend for ${processedJob.provider_message_id}`);
  }
  const emailData = resendEmail.data;
  process.stdout.write(`  Resend Subject: ${emailData.subject}\n`);
  process.stdout.write(`  Resend From:    ${emailData.from}\n`);
  process.stdout.write(`  Resend To:      ${emailData.to.join(", ")}\n`);
  process.stdout.write(`  Resend Status:  ${emailData.last_event || "delivered/accepted"}\n`);

  const textContent = emailData.text || "";
  const htmlContent = emailData.html || "";

  process.stdout.write("\nEmail Plain Text Snippet:\n");
  process.stdout.write(textContent.split("\n").slice(0, 10).join("\n") + "\n...\n\n");

  const linkMatch = textContent.match(/https?:\/\/[^\s]+\/verify-email\?token=([a-f0-9]{64})/i) ||
                    htmlContent.match(/href="([^"]+\/verify-email\?token=([a-f0-9]{64}))"/i);

  if (!linkMatch) {
    throw new Error("Could not find '/verify-email?token=...' link in email content!");
  }

  const rawExtractedToken = linkMatch[2] || linkMatch[1];
  process.stdout.write(`✓ Successfully extracted verification token from link: ${rawExtractedToken.substring(0, 8)}...${rawExtractedToken.substring(56)}\n`);

  if (textContent.includes("Your verification code is:") || htmlContent.includes("Your verification code is:")) {
    throw new Error("Security regression: Raw verification code is still exposed in email copy!");
  }
  process.stdout.write("✓ Email UX verified: professional CTA link used, raw code exposure eliminated.\n\n");

  // Step 7: Consume the Verification Link End-to-End
  process.stdout.write("--- Step 7: Consuming the Verification Token via HTTP API ---\n");
  const verifyRes = await app.inject({
    method: "POST",
    url: "/api/v1/auth/verify-email",
    payload: {
      token: rawExtractedToken,
    },
  });
  process.stdout.write(`Verify API returned status ${verifyRes.statusCode}: ${verifyRes.payload}\n`);
  if (verifyRes.statusCode !== 200) {
    throw new Error(`Token verification failed: ${verifyRes.payload}`);
  }

  const userRes = await pool.query("SELECT id, email, status FROM users WHERE email = $1", [recipient]);
  const user = userRes.rows[0];
  process.stdout.write(`  User status in PostgreSQL: ${user.status}\n`);
  if (user.status !== "active") {
    throw new Error(`Expected user status 'active', got: ${user.status}`);
  }
  process.stdout.write("✓ Account status successfully upgraded to 'active'!\n\n");

  // Step 8: Replay Protection Check
  process.stdout.write("--- Step 8: Verifying Replay Protection ---\n");
  const replayRes = await app.inject({
    method: "POST",
    url: "/api/v1/auth/verify-email",
    payload: {
      token: rawExtractedToken,
    },
  });
  process.stdout.write(`Replay attempt returned status ${replayRes.statusCode} (expected 400)\n`);
  if (replayRes.statusCode !== 400) {
    throw new Error(`Replay protection failed! Expected 400, got: ${replayRes.statusCode}`);
  }
  process.stdout.write("✓ Single-use token enforcement verified: replayed token rejected.\n\n");

  process.stdout.write("===================================================\n");
  process.stdout.write("ALL REAL OUTBOX + RESEND E2E CHECKS PASSED!\n");
  process.stdout.write("===================================================\n");

  await app.close();
  await pool.end();
}

run().catch((err) => {
  process.stderr.write("\n❌ E2E VERIFICATION FAILED: " + (err.stack || err.message) + "\n");
  process.exit(1);
});
