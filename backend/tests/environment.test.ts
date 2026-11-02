import assert from "node:assert/strict";
import test from "node:test";
import { InvalidEnvironmentError, loadEnvironment } from "../src/config/environment.js";

const validBaseEnvironment: NodeJS.ProcessEnv = {
  APP_ENV: "test",
  DATABASE_URL: "postgresql://tester:tester@127.0.0.1:5432/giftedpro_phase1_test",
  CLOUDFLARE_ACCOUNT_ID: "07e862129ce4083b383e85e2bf2ff0f8",
  R2_ACCESS_KEY_ID: "test-r2-access-key-id",
  R2_SECRET_ACCESS_KEY: "test-r2-secret-access-key",
  R2_BUCKET_NAME: "giftedpro-staging-media-downloads",
  R2_ENDPOINT: "https://07e862129ce4083b383e85e2bf2ff0f8.r2.cloudflarestorage.com",
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

test("media storage enforces mandatory Cloudflare R2 configuration in all environments and rejects simulator", () => {
  // 1. Valid R2 configuration succeeds
  const validCfg = loadEnvironment(validBaseEnvironment);
  assert.equal(validCfg.r2AccountId, "07e862129ce4083b383e85e2bf2ff0f8");
  assert.equal(validCfg.r2AccessKeyId, "test-r2-access-key-id");
  assert.equal(validCfg.r2SecretAccessKey, "test-r2-secret-access-key");
  assert.equal(validCfg.r2BucketName, "giftedpro-staging-media-downloads");
  assert.equal(
    validCfg.r2Endpoint,
    "https://07e862129ce4083b383e85e2bf2ff0f8.r2.cloudflarestorage.com",
  );

  // 2. Reject legacy MEDIA_STORAGE_PROVIDER setting
  assert.throws(
    () =>
      loadEnvironment({
        ...validBaseEnvironment,
        MEDIA_STORAGE_PROVIDER: "simulator",
      }),
    /MEDIA_STORAGE_PROVIDER.*is no longer supported; Cloudflare R2 is the sole media storage provider/,
  );

  assert.throws(
    () =>
      loadEnvironment({
        ...validBaseEnvironment,
        MEDIA_STORAGE_PROVIDER: "r2",
      }),
    /MEDIA_STORAGE_PROVIDER.*is no longer supported; Cloudflare R2 is the sole media storage provider/,
  );

  // 3. Mandatory field validations (missing or empty) in non-production
  assert.throws(
    () => loadEnvironment({ ...validBaseEnvironment, CLOUDFLARE_ACCOUNT_ID: undefined }),
    /CLOUDFLARE_ACCOUNT_ID.*is required/,
  );
  assert.throws(
    () => loadEnvironment({ ...validBaseEnvironment, CLOUDFLARE_ACCOUNT_ID: "   " }),
    /CLOUDFLARE_ACCOUNT_ID.*is required/,
  );

  assert.throws(
    () => loadEnvironment({ ...validBaseEnvironment, R2_ACCESS_KEY_ID: undefined }),
    /R2_ACCESS_KEY_ID.*is required/,
  );
  assert.throws(
    () => loadEnvironment({ ...validBaseEnvironment, R2_ACCESS_KEY_ID: "" }),
    /R2_ACCESS_KEY_ID.*is required/,
  );

  assert.throws(
    () => loadEnvironment({ ...validBaseEnvironment, R2_SECRET_ACCESS_KEY: undefined }),
    /R2_SECRET_ACCESS_KEY.*is required/,
  );
  assert.throws(
    () => loadEnvironment({ ...validBaseEnvironment, R2_SECRET_ACCESS_KEY: "   " }),
    /R2_SECRET_ACCESS_KEY.*is required/,
  );

  assert.throws(
    () => loadEnvironment({ ...validBaseEnvironment, R2_BUCKET_NAME: undefined }),
    /R2_BUCKET_NAME.*is required/,
  );
  assert.throws(
    () => loadEnvironment({ ...validBaseEnvironment, R2_BUCKET_NAME: "  " }),
    /R2_BUCKET_NAME.*is required/,
  );

  assert.throws(
    () => loadEnvironment({ ...validBaseEnvironment, R2_ENDPOINT: undefined }),
    /R2_ENDPOINT.*is required/,
  );
  assert.throws(
    () => loadEnvironment({ ...validBaseEnvironment, R2_ENDPOINT: "" }),
    /R2_ENDPOINT.*is required/,
  );

  // 4. Invalid endpoint format
  assert.throws(
    () => loadEnvironment({ ...validBaseEnvironment, R2_ENDPOINT: "not-a-valid-url" }),
    /R2_ENDPOINT.*must be a valid HTTP or HTTPS URL/,
  );
  assert.throws(
    () => loadEnvironment({ ...validBaseEnvironment, R2_ENDPOINT: "ftp://storage.example.com" }),
    /R2_ENDPOINT.*must be a valid HTTP or HTTPS URL/,
  );

  // 5. Production fail-fast when R2 configuration is missing or incomplete
  const prodBase = {
    ...validBaseEnvironment,
    APP_ENV: "production",
    CORS_ORIGINS: "https://giftedpromovies.com",
    DB_POOL_MAX: "10",
    EMAIL_OUTBOX_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    FRONTEND_URL: "https://giftedpromovies.com",
    RESEND_API_KEY: "re_test_key_12345",
    EMAIL_FROM: "notifications@giftedpromovies.com",
    PLAYBACK_SIGNING_SECRET: "prod-playback-signing-secret-minimum-32-chars-long",
  };

  assert.throws(
    () => loadEnvironment({ ...prodBase, CLOUDFLARE_ACCOUNT_ID: undefined }),
    /CLOUDFLARE_ACCOUNT_ID.*is required/,
  );
  assert.throws(
    () => loadEnvironment({ ...prodBase, R2_ACCESS_KEY_ID: undefined }),
    /R2_ACCESS_KEY_ID.*is required/,
  );
  assert.throws(
    () => loadEnvironment({ ...prodBase, R2_SECRET_ACCESS_KEY: undefined }),
    /R2_SECRET_ACCESS_KEY.*is required/,
  );
  assert.throws(
    () => loadEnvironment({ ...prodBase, R2_BUCKET_NAME: undefined }),
    /R2_BUCKET_NAME.*is required/,
  );
  assert.throws(
    () => loadEnvironment({ ...prodBase, R2_ENDPOINT: undefined }),
    /R2_ENDPOINT.*is required/,
  );
});

