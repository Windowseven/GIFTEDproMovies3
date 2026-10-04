import process from "node:process";
import { setTimeout } from "node:timers/promises";
import dotenv from "dotenv";
import pg from "pg";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import fastifyCookie from "@fastify/cookie";
import { AppModule } from "../dist/app.module.js";
import { loadEnvironment } from "../dist/config/environment.js";
import { configureHttpApplication } from "../dist/http/configure-http-application.js";
import { ApiExceptionFilter } from "../dist/http/api-exception.filter.js";
import { EMAIL_SENDER } from "../dist/infrastructure/email/email.tokens.js";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || "postgresql://tester@127.0.0.1:5433/giftedpro_phase1_test";

async function run() {
  process.env.DATABASE_URL = databaseUrl;
  process.env.APP_ENV = "test";
  process.env.EMAIL_PROVIDER = "in_memory";
  process.env.EMAIL_WORKER_ENABLED = "false";
  process.env.EMAIL_OUTBOX_ENCRYPTION_KEY = process.env.EMAIL_OUTBOX_ENCRYPTION_KEY || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  const pool = new pg.Pool({ connectionString: databaseUrl });

  process.stdout.write("===================================================\n");
  process.stdout.write("GIFTEDproMovies — Registration Latency Isolation Benchmark\n");
  process.stdout.write("===================================================\n\n");

  loadEnvironment(process.env);
  const app = await NestFactory.create(AppModule, new FastifyAdapter({ disableRequestLogging: true }));
  const fastify = app.getHttpAdapter().getInstance();
  await fastify.register(fastifyCookie);
  configureHttpApplication(app);
  app.useGlobalFilters(new ApiExceptionFilter(fastify.log));
  await app.init();

  const sender = app.get(EMAIL_SENDER);

  const scenarios = [
    {
      name: "1. Normal Provider (Immediate Acceptance)",
      behavior: async () => ({ messageId: "msg-fast" }),
    },
    {
      name: "2. Slow Provider (Artificial 3000ms Latency)",
      behavior: async () => {
        await new Promise((r) => setTimeout(r, 3000));
        return { messageId: "msg-delayed" };
      },
    },
    {
      name: "3. Provider Outage (Immediate Timeout Exception)",
      behavior: async () => {
        throw new Error("ETIMEDOUT: Connection to provider timed out after 5000ms");
      },
    },
  ];

  // Warmup request to allow V8 JIT, argon2 initialization, and DB pool connection creation
  const warmupEmail = `warmup-${Date.now()}@example.com`;
  await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: {
      email: warmupEmail,
      password: "SuperSecureBenchmarkPassword123!",
    },
  });
  await pool.query("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = $1)", [warmupEmail]);
  await pool.query("DELETE FROM auth_tokens WHERE user_id IN (SELECT id FROM users WHERE email = $1)", [warmupEmail]);
  await pool.query("DELETE FROM email_outbox WHERE recipient = $1", [warmupEmail]);
  await pool.query("DELETE FROM users WHERE email = $1", [warmupEmail]);

  const results = [];

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    sender.sendEmail = scenario.behavior;

    const email = `perf-bench-${i}-${Date.now()}@example.com`;

    // Measure HTTP registration latency
    const start = Date.now();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email,
        password: "SuperSecureBenchmarkPassword123!",
      },
    });
    const latencyMs = Date.now() - start;

    if (res.statusCode !== 201) {
      throw new Error(`Registration failed in scenario ${scenario.name}: ${res.payload}`);
    }

    results.push({
      scenario: scenario.name,
      statusCode: res.statusCode,
      latencyMs,
    });

    // Cleanup created benchmark user
    await pool.query("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = $1)", [email]);
    await pool.query("DELETE FROM auth_tokens WHERE user_id IN (SELECT id FROM users WHERE email = $1)", [email]);
    await pool.query("DELETE FROM email_outbox WHERE recipient = $1", [email]);
    await pool.query("DELETE FROM users WHERE email = $1", [email]);
  }

  process.stdout.write("Benchmark Results:\n");
  for (const r of results) {
    process.stdout.write(`- ${r.scenario}: ${r.latencyMs}ms (HTTP ${r.statusCode})\n`);
  }

  // Validate isolation: even under a 3000ms slow provider or outage, registration must remain < 500ms
  for (const r of results) {
    if (r.latencyMs > 500) {
      throw new Error(`Latency violation in ${r.scenario}: ${r.latencyMs}ms exceeds 500ms threshold!`);
    }
  }

  process.stdout.write("\n✓ Verified: Registration latency is completely decoupled from email provider availability and latency.\n");
  process.stdout.write("===================================================\n");

  await app.close();
  await pool.end();
}

run().catch((err) => {
  process.stderr.write("Benchmark failed: " + (err.stack || err.message) + "\n");
  process.exit(1);
});
