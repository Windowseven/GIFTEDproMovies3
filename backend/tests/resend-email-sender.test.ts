import assert from "node:assert/strict";
import test from "node:test";
import { ResendEmailSender } from "../src/infrastructure/email/resend-email-sender.js";
import type { EnvironmentConfig } from "../src/config/environment.js";

const baseConfig: EnvironmentConfig = {
  appEnvironment: "test",
  port: 8000,
  databaseUrl: "postgresql://tester:tester@127.0.0.1:5432/giftedpro_phase1_test",
  databasePoolMax: 5,
  corsOrigins: ["http://localhost:3000"],
  trustedProxyCidrs: [],
  requestBodyLimitBytes: 1048576,
  logLevel: "debug",
  emailFrom: "onboarding@resend.dev",
  emailProvider: "resend",
};

test("ResendEmailSender throws if sendEmail called without RESEND_API_KEY", async () => {
  const sender = new ResendEmailSender(baseConfig);
  await assert.rejects(
    async () =>
      await sender.sendEmail({
        to: "test@example.com",
        subject: "Subject",
        text: "Body",
      }),
    (err: unknown) =>
      err instanceof Error &&
      err.message.includes("RESEND_API_KEY is not configured"),
  );
});

test("ResendEmailSender formats verification email properly", async () => {
  const sender = new ResendEmailSender({
    ...baseConfig,
    resendApiKey: "mock_re_key",
  });

  let sentPayload: any = null;
  (sender as any).resend = {
    emails: {
      send: async (payload: any) => {
        sentPayload = payload;
        return { data: { id: "resend-msg-123" }, error: null };
      },
    },
  };

  await sender.sendVerificationEmail("customer@example.com", "token_12345");

  assert.equal(sentPayload.to, "customer@example.com");
  assert.equal(sentPayload.from, "onboarding@resend.dev");
  assert.ok(sentPayload.subject.includes("Verify your GIFTEDproMovies"));
  assert.ok(sentPayload.text.includes("token_12345"));
  assert.ok(sentPayload.html.includes("token_12345"));
});

test("ResendEmailSender formats password reset email properly", async () => {
  const sender = new ResendEmailSender({
    ...baseConfig,
    resendApiKey: "mock_re_key",
  });

  let sentPayload: any = null;
  (sender as any).resend = {
    emails: {
      send: async (payload: any) => {
        sentPayload = payload;
        return { data: { id: "resend-msg-456" }, error: null };
      },
    },
  };

  await sender.sendPasswordResetEmail("customer@example.com", "reset_token_67890");

  assert.equal(sentPayload.to, "customer@example.com");
  assert.ok(sentPayload.subject.includes("Reset your GIFTEDproMovies password"));
  assert.ok(sentPayload.text.includes("reset_token_67890"));
  assert.ok(sentPayload.html.includes("reset_token_67890"));
});

test("ResendEmailSender translates provider errors safely without leaking credentials", async () => {
  const sender = new ResendEmailSender({
    ...baseConfig,
    resendApiKey: "mock_re_key",
  });

  (sender as any).resend = {
    emails: {
      send: async () => ({
        data: null,
        error: {
          name: "validation_error",
          message: "Domain not verified",
        },
      }),
    },
  };

  await assert.rejects(
    async () =>
      await sender.sendEmail({
        to: "customer@example.com",
        subject: "Test",
        text: "Content",
      }),
    (err: unknown) =>
      err instanceof Error &&
      err.message.includes("Domain not verified") &&
      !err.message.includes("mock_re_key"),
  );
});
