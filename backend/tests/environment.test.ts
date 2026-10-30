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

test("customer streaming lockout defaults to false and enforces strict boolean parsing", () => {
  const defaultCfg = loadEnvironment(validBaseEnvironment);
  assert.equal(defaultCfg.customerStreamingEnabled, false);

  const disabledCfg = loadEnvironment({
    ...validBaseEnvironment,
    CUSTOMER_STREAMING_ENABLED: "false",
  });
  assert.equal(disabledCfg.customerStreamingEnabled, false);

  const enabledCfg = loadEnvironment({
    ...validBaseEnvironment,
    CUSTOMER_STREAMING_ENABLED: "true",
  });
  assert.equal(enabledCfg.customerStreamingEnabled, true);

  assert.throws(
    () =>
      loadEnvironment({
        ...validBaseEnvironment,
        CUSTOMER_STREAMING_ENABLED: "maybe",
      }),
    /CUSTOMER_STREAMING_ENABLED.*must be a boolean/,
  );
});

test("media storage provider defaults to simulator and validates R2 required credentials", () => {
  const defaultCfg = loadEnvironment(validBaseEnvironment);
  assert.equal(defaultCfg.mediaStorageProvider, "simulator");

  assert.throws(
    () =>
      loadEnvironment({
        ...validBaseEnvironment,
        MEDIA_STORAGE_PROVIDER: "invalid_provider",
      }),
    /MEDIA_STORAGE_PROVIDER.*must be either 'simulator' or 'r2'/,
  );

  assert.throws(
    () =>
      loadEnvironment({
        ...validBaseEnvironment,
        MEDIA_STORAGE_PROVIDER: "r2",
      }),
    /CLOUDFLARE_ACCOUNT_ID.*is required when MEDIA_STORAGE_PROVIDER is 'r2'/,
  );

  assert.throws(
    () =>
      loadEnvironment({
        ...validBaseEnvironment,
        MEDIA_STORAGE_PROVIDER: "r2",
        CLOUDFLARE_ACCOUNT_ID: "07e862129ce4083b383e85e2bf2ff0f8",
      }),
    /R2_ACCESS_KEY_ID.*is required when MEDIA_STORAGE_PROVIDER is 'r2'/,
  );

  const validR2Cfg = loadEnvironment({
    ...validBaseEnvironment,
    MEDIA_STORAGE_PROVIDER: "r2",
    CLOUDFLARE_ACCOUNT_ID: "07e862129ce4083b383e85e2bf2ff0f8",
    R2_ACCESS_KEY_ID: "test-access-key-id",
    R2_SECRET_ACCESS_KEY: "test-secret-access-key",
  });
  assert.equal(validR2Cfg.mediaStorageProvider, "r2");
  assert.equal(validR2Cfg.r2AccountId, "07e862129ce4083b383e85e2bf2ff0f8");
  assert.equal(validR2Cfg.r2BucketName, "giftedpro-staging-media-downloads");
  assert.equal(
    validR2Cfg.r2Endpoint,
    "https://07e862129ce4083b383e85e2bf2ff0f8.r2.cloudflarestorage.com",
  );
});

