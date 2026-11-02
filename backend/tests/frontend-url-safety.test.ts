import assert from "node:assert/strict";
import test from "node:test";
import { InvalidEnvironmentError, loadEnvironment } from "../src/config/environment.js";
import { EmailTemplateService } from "../src/infrastructure/email/email-template.service.js";

const BASE_VALID_ENV: NodeJS.ProcessEnv = {
  APP_ENV: "production",
  DATABASE_URL: "postgresql://tester:tester@127.0.0.1:5432/giftedpro_prod",
  CORS_ORIGINS: "https://giftedpromovies.com,https://admin.giftedpromovies.com",
  DB_POOL_MAX: "20",
  EMAIL_OUTBOX_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  EMAIL_FROM: "no-reply@giftedpromovies.com",
  EMAIL_PROVIDER: "resend",
  RESEND_API_KEY: "re_prod_test_key_12345",
  CLOUDFLARE_ACCOUNT_ID: "07e862129ce4083b383e85e2bf2ff0f8",
  R2_ACCESS_KEY_ID: "test-r2-access-key-id",
  R2_SECRET_ACCESS_KEY: "test-r2-secret-access-key",
  R2_BUCKET_NAME: "giftedpro-staging-media-downloads",
  R2_ENDPOINT: "https://07e862129ce4083b383e85e2bf2ff0f8.r2.cloudflarestorage.com",
};

test("Production URL Safety — Missing or Empty FRONTEND_URL fails closed in production", () => {
  assert.throws(
    () => loadEnvironment({ ...BASE_VALID_ENV, FRONTEND_URL: undefined }),
    (err: unknown) =>
      err instanceof InvalidEnvironmentError &&
      err.message.includes("FRONTEND_URL") &&
      err.message.includes("is required in production"),
  );

  assert.throws(
    () => loadEnvironment({ ...BASE_VALID_ENV, FRONTEND_URL: "" }),
    (err: unknown) =>
      err instanceof InvalidEnvironmentError &&
      err.message.includes("FRONTEND_URL"),
  );

  assert.throws(
    () => loadEnvironment({ ...BASE_VALID_ENV, FRONTEND_URL: "   " }),
    (err: unknown) =>
      err instanceof InvalidEnvironmentError &&
      err.message.includes("FRONTEND_URL"),
  );
});

test("Production URL Safety — Insecure HTTP is strictly rejected in production", () => {
  assert.throws(
    () =>
      loadEnvironment({
        ...BASE_VALID_ENV,
        FRONTEND_URL: "http://giftedpromovies.com",
      }),
    (err: unknown) =>
      err instanceof InvalidEnvironmentError &&
      err.message.includes("FRONTEND_URL") &&
      err.message.includes("must use HTTPS in production"),
  );
});

test("Production URL Safety — Localhost / loopback is strictly prohibited in production", () => {
  const dangerousLocalHosts = [
    "http://localhost:3000",
    "https://localhost:3000",
    "https://localhost",
    "https://127.0.0.1:3000",
    "https://127.0.0.1",
    "https://app.localhost",
    "https://cinema.local",
  ];

  for (const host of dangerousLocalHosts) {
    assert.throws(
      () => loadEnvironment({ ...BASE_VALID_ENV, FRONTEND_URL: host }),
      (err: unknown) =>
        err instanceof InvalidEnvironmentError &&
        err.message.includes("FRONTEND_URL"),
      `Should reject localhost/loopback in production: ${host}`,
    );
  }
});

test("Production URL Safety — Origin must be listed in CORS_ORIGINS in production", () => {
  assert.throws(
    () =>
      loadEnvironment({
        ...BASE_VALID_ENV,
        FRONTEND_URL: "https://untrusted-external-site.com",
      }),
    (err: unknown) =>
      err instanceof InvalidEnvironmentError &&
      err.message.includes("FRONTEND_URL") &&
      err.message.includes("must be included in CORS_ORIGINS"),
  );
});

test("Production URL Safety — URL credentials, queries, fragments, and sub-paths are rejected", () => {
  // Credentials injection
  assert.throws(
    () =>
      loadEnvironment({
        ...BASE_VALID_ENV,
        FRONTEND_URL: "https://user:password@giftedpromovies.com",
      }),
    /cannot contain username or password credentials/,
  );

  // Query parameter injection
  assert.throws(
    () =>
      loadEnvironment({
        ...BASE_VALID_ENV,
        FRONTEND_URL: "https://giftedpromovies.com?redirect=attacker.com",
      }),
    /cannot contain query strings or URL fragments/,
  );

  // URL fragment injection
  assert.throws(
    () =>
      loadEnvironment({
        ...BASE_VALID_ENV,
        FRONTEND_URL: "https://giftedpromovies.com#evil-hash",
      }),
    /cannot contain query strings or URL fragments/,
  );

  // Sub-path manipulation
  assert.throws(
    () =>
      loadEnvironment({
        ...BASE_VALID_ENV,
        FRONTEND_URL: "https://giftedpromovies.com/admin/redirect",
      }),
    /must be an origin URL without sub-paths/,
  );
});

test("Production URL Safety — Malicious schemes and control characters are neutralized", () => {
  const attacks = [
    "javascript:alert(document.cookie)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "//giftedpromovies.com",
    "https://giftedpromovies.com\r\nInjected-Header: evil",
    "ftp://giftedpromovies.com",
  ];

  for (const attack of attacks) {
    assert.throws(
      () => loadEnvironment({ ...BASE_VALID_ENV, FRONTEND_URL: attack }),
      (err: unknown) =>
        err instanceof InvalidEnvironmentError &&
        err.message.includes("FRONTEND_URL"),
      `Should reject attack scheme: ${attack}`,
    );
  }
});

test("Development & Test Environment Separation — Safe defaults in non-production", () => {
  // Development default
  const devConfig = loadEnvironment({
    ...BASE_VALID_ENV,
    APP_ENV: "development",
    DATABASE_URL: "postgresql://tester:tester@127.0.0.1:5432/giftedpro_dev",
    EMAIL_OUTBOX_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  });
  assert.equal(devConfig.frontendUrl, "http://localhost:3000");

  // Test default
  const testConfig = loadEnvironment({
    ...BASE_VALID_ENV,
    APP_ENV: "test",
    DATABASE_URL: "postgresql://tester:tester@127.0.0.1:5432/giftedpro_test",
  });
  assert.equal(testConfig.frontendUrl, "http://localhost:3000");

  // Trailing slash normalization in valid production config
  const prodConfig = loadEnvironment({
    ...BASE_VALID_ENV,
    FRONTEND_URL: "https://giftedpromovies.com/",
  });
  assert.equal(prodConfig.frontendUrl, "https://giftedpromovies.com");
});

test("EmailTemplateService — Generates strictly normalized RFC 3986 URLs without double slashes", () => {
  const dummyConfig = {
    frontendUrl: "https://giftedpromovies.com",
  } as any;

  const service = new EmailTemplateService(dummyConfig);
  const sampleToken = "c82db342198bec583eab132749e227f7424a977a4e57536edc24f03e1be23c88";

  const verification = service.generateVerificationEmail("user@example.com", sampleToken);
  assert.ok(
    verification.text.includes(
      "https://giftedpromovies.com/verify-email?token=c82db342198bec583eab132749e227f7424a977a4e57536edc24f03e1be23c88",
    ),
  );
  assert.ok(!verification.text.includes("//verify-email"));

  const reset = service.generatePasswordResetEmail("user@example.com", sampleToken);
  assert.ok(
    reset.text.includes(
      "https://giftedpromovies.com/reset-password?token=c82db342198bec583eab132749e227f7424a977a4e57536edc24f03e1be23c88",
    ),
  );
  assert.ok(!reset.text.includes("//reset-password"));
});

test("Production Email Sender — Missing or Empty EMAIL_FROM fails closed in production", () => {
  assert.throws(
    () => loadEnvironment({ ...BASE_VALID_ENV, FRONTEND_URL: "https://giftedpromovies.com", EMAIL_FROM: undefined }),
    (err: unknown) =>
      err instanceof InvalidEnvironmentError &&
      err.message.includes("EMAIL_FROM") &&
      err.message.includes("is required in production"),
  );

  assert.throws(
    () => loadEnvironment({ ...BASE_VALID_ENV, FRONTEND_URL: "https://giftedpromovies.com", EMAIL_FROM: "  " }),
    (err: unknown) =>
      err instanceof InvalidEnvironmentError &&
      err.message.includes("EMAIL_FROM"),
  );
});

test("Production Email Sender — @resend.dev development sender is strictly rejected in production", () => {
  assert.throws(
    () => loadEnvironment({
      ...BASE_VALID_ENV,
      FRONTEND_URL: "https://giftedpromovies.com",
      EMAIL_FROM: "onboarding@resend.dev",
    }),
    (err: unknown) =>
      err instanceof InvalidEnvironmentError &&
      err.message.includes("EMAIL_FROM") &&
      err.message.includes("cannot use development sender (@resend.dev) in production"),
  );

  assert.throws(
    () => loadEnvironment({
      ...BASE_VALID_ENV,
      FRONTEND_URL: "https://giftedpromovies.com",
      EMAIL_FROM: "GIFTEDpro <custom@resend.dev>",
    }),
    (err: unknown) =>
      err instanceof InvalidEnvironmentError &&
      err.message.includes("EMAIL_FROM"),
  );
});

test("Production Email Sender — Valid project-owned domain sender is accepted", () => {
  const config = loadEnvironment({
    ...BASE_VALID_ENV,
    FRONTEND_URL: "https://giftedpromovies.com",
    EMAIL_FROM: "GIFTEDpro Movies <auth@mail.giftedpromovies.com>",
  });

  assert.equal(config.emailFrom, "GIFTEDpro Movies <auth@mail.giftedpromovies.com>");
});

test("Production Email Provider — in_memory is strictly rejected in production", () => {
  assert.throws(
    () => loadEnvironment({
      ...BASE_VALID_ENV,
      FRONTEND_URL: "https://giftedpromovies.com",
      EMAIL_PROVIDER: "in_memory",
    }),
    (err: unknown) =>
      err instanceof InvalidEnvironmentError &&
      err.message.includes("EMAIL_PROVIDER") &&
      err.message.includes("cannot be 'in_memory' in production"),
  );
});

test("Development & Test Email Sender — Defaults to onboarding@resend.dev when unset", () => {
  const devConfig = loadEnvironment({
    ...BASE_VALID_ENV,
    APP_ENV: "development",
    DATABASE_URL: "postgresql://tester:tester@127.0.0.1:5432/giftedpro_dev",
    EMAIL_OUTBOX_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    EMAIL_FROM: undefined,
  });
  assert.equal(devConfig.emailFrom, "onboarding@resend.dev");

  const testConfig = loadEnvironment({
    ...BASE_VALID_ENV,
    APP_ENV: "test",
    DATABASE_URL: "postgresql://tester:tester@127.0.0.1:5432/giftedpro_test",
    EMAIL_FROM: undefined,
  });
  assert.equal(testConfig.emailFrom, "onboarding@resend.dev");
});
