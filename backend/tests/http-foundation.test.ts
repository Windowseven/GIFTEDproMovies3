import assert from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import type { Http2ServerRequest } from "node:http2";
import { Writable } from "node:stream";
import test, { after, before } from "node:test";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import type { DestinationStream } from "pino";
import { AppModule } from "../src/app.module.js";
import { loadEnvironment } from "../src/config/environment.js";
import { ENVIRONMENT_CONFIG } from "../src/config/tokens.js";
import { DATABASE_POOL, DRIZZLE_DATABASE } from "../src/infrastructure/database/database.tokens.js";
import { createStructuredLogger } from "../src/infrastructure/logging/structured-logger.js";
import { ApiExceptionFilter } from "../src/http/api-exception.filter.js";
import { configureHttpApplication } from "../src/http/configure-http-application.js";
import { FoundationValidationFixtureController } from "./fixtures/foundation-validation.controller.js";

const logLines: string[] = [];
const logDestination: DestinationStream = new Writable({
  write(chunk: Buffer, _encoding, callback): void {
    logLines.push(chunk.toString("utf8"));
    callback();
  },
});

let app: NestFastifyApplication;
let testingModule: TestingModule;

before(async () => {
  const environment = loadEnvironment({
    APP_ENV: "test",
    DATABASE_URL:
      "postgresql://tester:tester@127.0.0.1:5432/giftedpro_phase1_test",
    REQUEST_BODY_LIMIT_BYTES: "1024",
    CLOUDFLARE_ACCOUNT_ID: "07e862129ce4083b383e85e2bf2ff0f8",
    R2_ACCESS_KEY_ID: "test-r2-access-key-id",
    R2_SECRET_ACCESS_KEY: "test-r2-secret-access-key",
    R2_BUCKET_NAME: "giftedpro-staging-media-downloads",
    R2_ENDPOINT: "https://07e862129ce4083b383e85e2bf2ff0f8.r2.cloudflarestorage.com",
  });

  testingModule = await Test.createTestingModule({
    imports: [AppModule],
    controllers: [FoundationValidationFixtureController],
  })
    .overrideProvider(ENVIRONMENT_CONFIG)
    .useValue(environment)
    .overrideProvider(DATABASE_POOL)
    .useValue({
      query: async () => ({ rows: [{ "?column?": 1 }] }),
      end: async () => undefined,
    })
    .overrideProvider(DRIZZLE_DATABASE)
    .useValue({ execute: async () => ({ rows: [{ "?column?": 1 }] }) })
    .compile();

  app = testingModule.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter({
      loggerInstance: createStructuredLogger("debug", logDestination),
      requestIdHeader: false,
      genReqId: (request: IncomingMessage | Http2ServerRequest): string => {
        const candidate = request.headers["x-request-id"];
        return typeof candidate === "string" &&
          candidate.length > 0 &&
          candidate.length <= 128 &&
          /^[A-Za-z0-9._:-]+$/.test(candidate)
          ? candidate
          : "test-generated-id";
      },
      trustProxy: false,
      bodyLimit: environment.requestBodyLimitBytes,
      disableRequestLogging: true,
    }),
  );

  const fastify = app.getHttpAdapter().getInstance();
  app.useLogger({
    log: () => undefined,
    error: () => undefined,
    warn: () => undefined,
    debug: () => undefined,
    verbose: () => undefined,
    fatal: () => undefined,
  });
  await fastify.register((await import("@fastify/helmet")).default);
  await fastify.register((await import("@fastify/cors")).default, {
    origin: [...environment.corsOrigins],
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "x-request-id"],
  });
  fastify.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });
  configureHttpApplication(app);
  app.useGlobalFilters(new ApiExceptionFilter(fastify.log));
  await app.init();
});

after(async () => {
  await app?.close();
  await testingModule?.close();
});

test("health endpoints use their foundation paths and readiness reflects the database", async () => {
  const live = await app.inject({ method: "GET", url: "/health/live" });
  assert.equal(live.statusCode, 200);
  assert.deepEqual(live.json(), {
    success: true,
    data: { status: "alive" },
  });

  const ready = await app.inject({ method: "GET", url: "/health/ready" });
  assert.equal(ready.statusCode, 200);
  assert.deepEqual(ready.json(), {
    success: true,
    data: { status: "ready" },
  });
});

test("request validation accepts valid fields and rejects unknown, malformed, or invalid fields", async () => {
  const valid = await app.inject({
    method: "POST",
    url: "/api/v1/phase1-test/validation",
    headers: { "content-type": "application/json" },
    payload: { name: "probe", count: 2 },
  });
  assert.equal(valid.statusCode, 201);
  assert.deepEqual(valid.json(), {
    success: true,
    data: { name: "probe", count: 2 },
  });

  const invalid = await app.inject({
    method: "POST",
    url: "/api/v1/phase1-test/validation",
    headers: { "content-type": "application/json" },
    payload: { name: "probe", count: 99, unexpected: "discard me" },
  });
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.json().success, false);
  assert.equal(invalid.json().error.code, "BAD_REQUEST");
  assert.ok(Array.isArray(invalid.json().error.details));
});

test("errors use the standard envelope and do not disclose unexpected exception messages", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/api/v1/phase1-test/unexpected-error",
  });
  assert.equal(response.statusCode, 500);
  assert.equal(response.json().success, false);
  assert.equal(response.json().error.code, "INTERNAL_ERROR");
  assert.equal(response.json().error.requestId, response.headers["x-request-id"]);
  assert.ok(!response.body.includes("private diagnostic marker"));
});

test("request IDs are validated and propagated to responses and errors", async () => {
  const trusted = await app.inject({
    method: "POST",
    url: "/api/v1/phase1-test/validation",
    headers: {
      "content-type": "application/json",
      "x-request-id": "client.trace-42",
    },
    payload: { name: "probe", count: 0 },
  });
  assert.equal(trusted.headers["x-request-id"], "client.trace-42");
  assert.equal(trusted.json().error.requestId, "client.trace-42");

  const untrusted = await app.inject({
    method: "GET",
    url: "/health/live",
    headers: { "x-request-id": "bad value forged" },
  });
  assert.equal(untrusted.statusCode, 200);
  assert.equal(untrusted.headers["x-request-id"], "test-generated-id");
});

test("CORS allows configured origins and omits permission for other origins", async () => {
  const allowed = await app.inject({
    method: "OPTIONS",
    url: "/api/v1/phase1-test/validation",
    headers: {
      origin: "http://localhost:3000",
      "access-control-request-method": "POST",
      "access-control-request-headers": "content-type",
    },
  });
  assert.equal(allowed.headers["access-control-allow-origin"], "http://localhost:3000");
  assert.equal(allowed.headers["access-control-allow-credentials"], "true");

  const denied = await app.inject({
    method: "OPTIONS",
    url: "/api/v1/phase1-test/validation",
    headers: {
      origin: "https://untrusted.example",
      "access-control-request-method": "POST",
    },
  });
  assert.equal(denied.headers["access-control-allow-origin"], undefined);
});

test("body size is bounded and malformed JSON is handled without parser details", async () => {
  const oversized = await app.inject({
    method: "POST",
    url: "/api/v1/phase1-test/validation",
    headers: { "content-type": "application/json" },
    payload: { name: "x".repeat(1_100), count: 1 },
  });
  assert.equal(oversized.statusCode, 413);
  assert.equal(oversized.json().error.code, "PAYLOAD_TOO_LARGE");

  const malformed = await app.inject({
    method: "POST",
    url: "/api/v1/phase1-test/validation",
    headers: { "content-type": "application/json" },
    payload: "{not-json",
  });
  assert.equal(malformed.statusCode, 400);
  assert.equal(malformed.json().success, false);
  assert.ok(!malformed.body.includes("Unexpected token"));
});

test("security headers are present and structured logger redacts sensitive fields", async () => {
  const response = await app.inject({ method: "GET", url: "/health/live" });
  assert.equal(response.headers["x-content-type-options"], "nosniff");

  app.getHttpAdapter().getInstance().log.info(
    {
      token: "fixture-token-secret",
      user: { password: "fixture-password-secret" },
    },
    "redaction fixture",
  );

  const logText = logLines.join("");
  assert.ok(logText.includes("[REDACTED]"));
  assert.ok(!logText.includes("fixture-token-secret"));
  assert.ok(!logText.includes("fixture-password-secret"));
});
