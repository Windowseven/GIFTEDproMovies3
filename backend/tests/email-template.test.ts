import assert from "node:assert/strict";
import test from "node:test";
import {
  EmailTemplateService,
  escapeHtml,
} from "../src/infrastructure/email/email-template.service.js";
import type { EnvironmentConfig } from "../src/config/environment.js";

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
  emailOutboxEncryptionKey: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  emailWorkerEnabled: false,
  emailWorkerPollIntervalMs: 2000,
  emailWorkerLeaseMs: 300000,
  emailWorkerMaxAttempts: 5,
  emailWorkerBaseBackoffMs: 2000,
  emailWorkerMaxBackoffMs: 60000,
  emailWorkerJitterMs: 500,
};

test("escapeHtml neutralizes dangerous HTML characters", () => {
  const dangerous = `<script>alert("XSS & 'injection'")</script>`;
  const safe = escapeHtml(dangerous);

  assert.equal(
    safe,
    "&lt;script&gt;alert(&quot;XSS &amp; &#039;injection&#039;&quot;)&lt;/script&gt;",
  );
  assert.ok(!safe.includes("<script>"));
  assert.ok(!safe.includes("</script>"));
});

test("EmailTemplateService.generateVerificationEmail formats accessible CTA link and escapes input", () => {
  const service = new EmailTemplateService(mockConfig);
  const recipient = "user+<script>@example.com";
  const rawToken = "raw_verification_token_12345";

  const message = service.generateVerificationEmail(recipient, rawToken);

  assert.equal(message.to, recipient);
  assert.equal(message.subject, "Verify your GIFTEDproMovies email address");

  // Verify URL formation
  const expectedUrl = "https://giftedpromovies.com/verify-email?token=raw_verification_token_12345";
  assert.ok(message.text.includes(expectedUrl));
  assert.ok(message.html?.includes(expectedUrl));

  // Verify accessible CTA button exists
  assert.ok(message.html?.includes("Verify Email Address"));
  assert.ok(message.html?.includes(`href="${expectedUrl}"`));

  // Verify HTML escaping of recipient
  assert.ok(!message.html?.includes("<script>"));
  assert.ok(message.html?.includes("&lt;script&gt;"));

  // Verify text fallback does not have HTML tags
  assert.ok(!message.text.includes("<table"));
  assert.ok(!message.text.includes("</a>"));
  assert.ok(message.text.includes("This link expires in 24 hours and can only be used once."));
});

test("EmailTemplateService.generatePasswordResetEmail formats accessible CTA link and security note", () => {
  const service = new EmailTemplateService(mockConfig);
  const recipient = "account_owner@example.com";
  const rawToken = "raw_reset_token_67890";

  const message = service.generatePasswordResetEmail(recipient, rawToken);

  assert.equal(message.to, recipient);
  assert.equal(message.subject, "Reset your GIFTEDproMovies password");

  const expectedUrl = "https://giftedpromovies.com/reset-password?token=raw_reset_token_67890";
  assert.ok(message.text.includes(expectedUrl));
  assert.ok(message.html?.includes(expectedUrl));

  // Verify CTA button exists
  assert.ok(message.html?.includes("Reset Password"));
  assert.ok(message.html?.includes(`href="${expectedUrl}"`));

  // Verify security invariants mentioned in copy
  assert.ok(message.text.includes("This link expires in 1 hour and can only be used once."));
  assert.ok(message.text.includes("Completing the reset will sign out your existing sessions."));
  assert.ok(message.html?.includes("Completing the reset will sign out your existing sessions"));
});

test("EmailTemplateService handles frontendUrl trailing slashes cleanly", () => {
  const service = new EmailTemplateService({
    ...mockConfig,
    frontendUrl: "https://giftedpromovies.com///",
  });

  const message = service.generateVerificationEmail("test@example.com", "token123");
  assert.ok(message.text.includes("https://giftedpromovies.com/verify-email?token=token123"));
  assert.ok(!message.text.includes("com///verify-email"));
});
