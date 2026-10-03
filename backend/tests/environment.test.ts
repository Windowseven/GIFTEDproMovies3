import assert from "node:assert/strict";
import test from "node:test";
import { InvalidEnvironmentError, loadEnvironment } from "../src/config/environment.js";

const validBaseEnvironment: NodeJS.ProcessEnv = {
  APP_ENV: "test",
  DATABASE_URL: "postgresql://tester:tester@127.0.0.1:5432/giftedpro_phase1_test",
};

test("loads a valid non-production configuration with safe proxy defaults", () => {
  const config = loadEnvironment(validBaseEnvironment);

  assert.equal(config.appEnvironment, "test");
  assert.equal(config.port, 8000);
  assert.equal(config.databasePoolMax, 5);
  assert.deepEqual(config.corsOrigins, ["http://localhost:3000"]);
  assert.deepEqual(config.trustedProxyCidrs, []);
  assert.equal(config.requestBodyLimitBytes, 1_048_576);
});

test("requires a PostgreSQL URL and redacts its value from validation errors", () => {
  assert.throws(
    () => loadEnvironment({ ...validBaseEnvironment, DATABASE_URL: undefined }),
    (error: unknown) =>
      error instanceof InvalidEnvironmentError &&
      error.message.includes("DATABASE_URL") &&
      !error.message.includes("tester"),
  );
  assert.throws(
    () => loadEnvironment({ ...validBaseEnvironment, DATABASE_URL: "mysql://user:secret@host/db" }),
    (error: unknown) =>
      error instanceof InvalidEnvironmentError && !error.message.includes("secret"),
  );
});

test("requires explicit production CORS origins and database pool capacity", () => {
  assert.throws(
    () => loadEnvironment({ APP_ENV: "production", DATABASE_URL: validBaseEnvironment.DATABASE_URL }),
    /CORS_ORIGINS/,
  );
  assert.throws(
    () => loadEnvironment({
      APP_ENV: "production",
      DATABASE_URL: validBaseEnvironment.DATABASE_URL,
      CORS_ORIGINS: "https://app.example.test",
    }),
    /DB_POOL_MAX/,
  );
});

test("rejects invalid origins, request limits, and untrusted proxy values", () => {
  assert.throws(
    () => loadEnvironment({ ...validBaseEnvironment, CORS_ORIGINS: "*" }),
    /CORS_ORIGINS/,
  );
  assert.throws(
    () => loadEnvironment({ ...validBaseEnvironment, REQUEST_BODY_LIMIT_BYTES: "10" }),
    /REQUEST_BODY_LIMIT_BYTES/,
  );
  assert.throws(
    () => loadEnvironment({ ...validBaseEnvironment, TRUSTED_PROXY_CIDRS: "all" }),
    /TRUSTED_PROXY_CIDRS/,
  );
});
