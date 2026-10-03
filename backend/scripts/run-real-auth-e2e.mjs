import process from "node:process";
import dotenv from "dotenv";
import pg from "pg";
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

async function run() {
  process.env.DATABASE_URL = databaseUrl;
  process.env.APP_ENV = "test";
  process.env.EMAIL_PROVIDER = "resend";

  const pool = new pg.Pool({ connectionString: databaseUrl });
  // Clean previous test user if exists
  await pool.query("DELETE FROM users WHERE email = $1", [recipient]);

  loadEnvironment(process.env);
  const app = await NestFactory.create(AppModule, new FastifyAdapter({ disableRequestLogging: true }));
  const fastify = app.getHttpAdapter().getInstance();
  await fastify.register(fastifyCookie);
  configureHttpApplication(app);
  app.useGlobalFilters(new ApiExceptionFilter(fastify.log));
  await app.init();

  process.stdout.write(
    JSON.stringify({
      level: "info",
      event: "triggering_real_registration",
      email: recipient,
    }) + "\n",
  );

  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: {
      email: recipient,
      password: "StrongPassword123!",
    },
  });

  const responseBody = res.json();

  if (res.statusCode !== 201) {
    process.stderr.write(
      JSON.stringify({
        level: "error",
        event: "registration_failed",
        statusCode: res.statusCode,
        error: responseBody,
      }) + "\n",
    );
    await app.close();
    await pool.end();
    process.exit(1);
  }

  // Inspect database
  const userRes = await pool.query("SELECT id, email, role, status, email_verified_at FROM users WHERE email = $1", [recipient]);
  const user = userRes.rows[0];

  const tokensRes = await pool.query(
    "SELECT id, type, token_hash, used_at, expires_at FROM auth_tokens WHERE user_id = $1",
    [user.id],
  );
  const tokenRecord = tokensRes.rows[0];

  process.stdout.write(
    JSON.stringify({
      level: "info",
      event: "real_registration_complete",
      statusCode: res.statusCode,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerifiedAt: user.email_verified_at,
      },
      tokenRecord: {
        id: tokenRecord.id,
        type: tokenRecord.type,
        tokenHashLength: tokenRecord.token_hash?.length,
        usedAt: tokenRecord.used_at,
        expiresAt: tokenRecord.expires_at,
      },
      auditCount: (await pool.query("SELECT COUNT(*) FROM audit_events WHERE actor_id = $1", [user.id])).rows[0].count,
    }) + "\n",
  );

  await app.close();
  await pool.end();
}

run().catch((err) => {
  process.stderr.write(
    JSON.stringify({
      level: "error",
      event: "e2e_run_crashed",
      error: err instanceof Error ? err.message : String(err),
    }) + "\n",
  );
  process.exit(1);
});
