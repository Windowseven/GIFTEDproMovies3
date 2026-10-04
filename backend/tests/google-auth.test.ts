import assert from "node:assert/strict";
import test from "node:test";
import { GoogleAuthService } from "../src/modules/identity/services/google-auth.service.js";
import type { EnvironmentConfig } from "../src/config/environment.js";
import type { GoogleOAuthClient } from "../src/modules/identity/services/google-oauth-client.interface.js";
import type { ApplicationDatabase } from "../src/infrastructure/database/database.module.js";
import type { AuditService } from "../src/modules/audit/audit.service.js";
import type { SessionService } from "../src/modules/identity/services/session.service.js";
import type { SafeUser } from "../src/modules/identity/services/auth.service.js";
import type { SessionRecord } from "../src/infrastructure/database/schemas/sessions.schema.js";
import {
  parseAndVerifyOAuthState,
  serializeOAuthState,
  type OAuthStatePayload,
} from "../src/modules/identity/utils/oauth-state.js";
import { usersTable } from "../src/infrastructure/database/schemas/users.schema.js";

const testConfig: EnvironmentConfig = {
  appEnvironment: "test",
  port: 8000,
  databaseUrl: "postgresql://tester:tester@127.0.0.1:5433/giftedpro_phase1_test",
  databasePoolMax: 5,
  corsOrigins: ["http://localhost:3000"],
  trustedProxyCidrs: [],
  requestBodyLimitBytes: 1048576,
  logLevel: "debug",
  emailFrom: "onboarding@resend.dev",
  emailProvider: "in_memory",
  googleClientId: "test-google-client-id.apps.googleusercontent.com",
  googleClientSecret: "test-google-client-secret-123",
  googleCallbackUrl: "http://localhost:8000/api/v1/auth/google/callback",
  frontendUrl: "http://localhost:3000",
  emailOutboxEncryptionKey: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  emailWorkerEnabled: false,
  emailWorkerPollIntervalMs: 2000,
  emailWorkerLeaseMs: 300000,
  emailWorkerMaxAttempts: 5,
  emailWorkerBaseBackoffMs: 2000,
  emailWorkerMaxBackoffMs: 60000,
  emailWorkerJitterMs: 500,
};

function createMockAuditService(): AuditService {
  return {
    recordEvent: async () => {},
  } as unknown as AuditService;
}

function createMockSessionService(): SessionService {
  return {
    createSession: async (userId: string) => ({
      session: {
        id: "mock-session-id",
        userId,
        deviceId: null,
        tokenHash: "mock_hash",
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
        revokedReason: null,
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
        createdAt: new Date(),
      } as SessionRecord,
      rawToken: "raw_mock_session_token_1234567890",
    }),
  } as unknown as SessionService;
}

test("GoogleAuthService.getAuthorizationUrl constructs valid URL with PKCE and signed state", () => {
  const service = new GoogleAuthService(
    testConfig,
    {} as ApplicationDatabase,
    {} as GoogleOAuthClient,
    createMockSessionService(),
    createMockAuditService(),
  );

  const { authorizationUrl, stateCookie } = service.getAuthorizationUrl("/catalog?genre=drama");
  const parsed = new URL(authorizationUrl);

  assert.equal(parsed.origin, "https://accounts.google.com");
  assert.equal(parsed.pathname, "/o/oauth2/v2/auth");
  assert.equal(parsed.searchParams.get("client_id"), testConfig.googleClientId);
  assert.equal(parsed.searchParams.get("redirect_uri"), testConfig.googleCallbackUrl);
  assert.equal(parsed.searchParams.get("response_type"), "code");
  assert.equal(parsed.searchParams.get("scope"), "openid email profile");
  assert.equal(parsed.searchParams.get("code_challenge_method"), "S256");
  assert.ok(parsed.searchParams.get("code_challenge"));
  assert.ok(parsed.searchParams.get("state"));
  assert.ok(parsed.searchParams.get("nonce"));

  const stateParam = parsed.searchParams.get("state")!;
  const signingSecret = `${testConfig.databaseUrl}:${testConfig.googleClientSecret}`;
  const verifiedState = parseAndVerifyOAuthState(stateCookie, stateParam, signingSecret);
  assert.ok(verifiedState);
  assert.equal(verifiedState?.state, stateParam);
  assert.equal(verifiedState?.returnTo, "http://localhost:3000/catalog?genre=drama");
});

test("GoogleAuthService.handleCallback rejects provider errors with safe redirect", async () => {
  let auditRecorded = false;
  const mockAudit = {
    recordEvent: async (event: { action: string }) => {
      if (event.action === "auth.google.callback.failed") auditRecorded = true;
    },
  } as unknown as AuditService;

  const service = new GoogleAuthService(
    testConfig,
    {} as ApplicationDatabase,
    {} as GoogleOAuthClient,
    createMockSessionService(),
    mockAudit,
  );

  const result = await service.handleCallback({
    error: "access_denied",
  });

  assert.equal(result.redirectUrl, "http://localhost:3000/auth/login?error=google_auth_failed");
  assert.equal(auditRecorded, true);
  assert.equal(result.session, undefined);
});

test("GoogleAuthService.handleCallback rejects tampered or expired state cookie", async () => {
  const service = new GoogleAuthService(
    testConfig,
    {} as ApplicationDatabase,
    {} as GoogleOAuthClient,
    createMockSessionService(),
    createMockAuditService(),
  );

  // Missing state cookie
  const res1 = await service.handleCallback({ code: "test_code", state: "test_state" });
  assert.equal(res1.redirectUrl, "http://localhost:3000/auth/login?error=invalid_state");

  // Mismatching state cookie
  const payload: OAuthStatePayload = {
    state: "valid_state",
    codeVerifier: "verifier",
    nonce: "nonce",
    returnTo: "http://localhost:3000",
    createdAt: Date.now(),
  };
  const cookie = serializeOAuthState(payload, `${testConfig.databaseUrl}:${testConfig.googleClientSecret}`);
  const res2 = await service.handleCallback({
    code: "test_code",
    state: "attacker_state",
    stateCookie: cookie,
  });
  assert.equal(res2.redirectUrl, "http://localhost:3000/auth/login?error=invalid_state");
});

test("GoogleAuthService.handleCallback rejects unverified Google account emails", async () => {
  const payload: OAuthStatePayload = {
    state: "valid_state",
    codeVerifier: "verifier",
    nonce: "nonce",
    returnTo: "http://localhost:3000",
    createdAt: Date.now(),
  };
  const cookie = serializeOAuthState(payload, `${testConfig.databaseUrl}:${testConfig.googleClientSecret}`);

  const mockGoogleClient: GoogleOAuthClient = {
    exchangeCode: async () => ({ idToken: "id_tok", accessToken: "acc_tok" }),
    verifyIdToken: async () => ({
      iss: "https://accounts.google.com",
      aud: testConfig.googleClientId!,
      sub: "123456789",
      email: "unverified@example.com",
      email_verified: false, // NOT VERIFIED
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  };

  const service = new GoogleAuthService(
    testConfig,
    {} as ApplicationDatabase,
    mockGoogleClient,
    createMockSessionService(),
    createMockAuditService(),
  );

  const res = await service.handleCallback({
    code: "code123",
    state: "valid_state",
    stateCookie: cookie,
  });

  assert.equal(res.redirectUrl, "http://localhost:3000/auth/login?error=email_not_verified");
  assert.equal(res.session, undefined);
});

test("GoogleAuthService.handleCallback Case C: detects existing email and redirects without auto-linking", async () => {
  const payload: OAuthStatePayload = {
    state: "valid_state",
    codeVerifier: "verifier",
    nonce: "nonce",
    returnTo: "http://localhost:3000",
    createdAt: Date.now(),
  };
  const cookie = serializeOAuthState(payload, `${testConfig.databaseUrl}:${testConfig.googleClientSecret}`);

  const mockGoogleClient: GoogleOAuthClient = {
    exchangeCode: async () => ({ idToken: "id_tok", accessToken: "acc_tok" }),
    verifyIdToken: async () => ({
      iss: "https://accounts.google.com",
      aud: testConfig.googleClientId!,
      sub: "new_google_sub_999",
      email: "existing_user@example.com",
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  };

  let conflictAudited = false;
  const mockAudit = {
    recordEvent: async (e: { action: string }) => {
      if (e.action === "auth.google.link.conflict") conflictAudited = true;
    },
  } as unknown as AuditService;

  // Mock DB where Google sub does not exist, but user with email exists
  const mockDb = {
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          limit: () => {
            // If querying usersTable, return existing user to simulate conflict
            if (table === usersTable) {
              return [{ id: "existing-user-uuid", email: "existing_user@example.com", status: "active" }];
            }
            // If querying userIdentitiesTable, return empty
            return [];
          },
        }),
      }),
    }),
  } as unknown as ApplicationDatabase;

  const service = new GoogleAuthService(
    testConfig,
    mockDb,
    mockGoogleClient,
    createMockSessionService(),
    mockAudit,
  );

  const res = await service.handleCallback({
    code: "code123",
    state: "valid_state",
    stateCookie: cookie,
  });

  assert.equal(res.redirectUrl, "http://localhost:3000/auth/login?error=account_exists_link_required");
  assert.equal(conflictAudited, true);
  assert.equal(res.session, undefined);
});

test("GoogleAuthService.unlinkAccount rejects unlinking if user has no password set (lockout defense)", async () => {
  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => [{ passwordHash: null }], // No password set!
        }),
      }),
    }),
  } as unknown as ApplicationDatabase;

  const service = new GoogleAuthService(
    testConfig,
    mockDb,
    {} as GoogleOAuthClient,
    createMockSessionService(),
    createMockAuditService(),
  );

  const safeUser: SafeUser = {
    id: "user-123",
    email: "oauth_only@example.com",
    role: "customer",
    status: "active",
    emailVerifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await assert.rejects(
    async () => await service.unlinkAccount(safeUser),
    (err: unknown) =>
      err instanceof Error &&
      err.message.includes("Cannot unlink Google account without a password set"),
  );
});
