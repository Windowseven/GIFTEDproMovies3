import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import { Test } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import fastifyCookie from "@fastify/cookie";
import { AppModule } from "../src/app.module.js";
import { configureHttpApplication } from "../src/http/configure-http-application.js";
import { ApiExceptionFilter } from "../src/http/api-exception.filter.js";
import { GOOGLE_OAUTH_CLIENT, type GoogleOAuthClient } from "../src/modules/identity/services/google-oauth-client.interface.js";
import { parseAndVerifyOAuthState, serializeOAuthState, type OAuthStatePayload } from "../src/modules/identity/utils/oauth-state.js";

const DATABASE_URL =
  process.env.PHASE1_TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://tester@127.0.0.1:5433/giftedpro_phase1_test";

test("Google Auth HTTP Integration & Security Attack Suite", async (t) => {
  let pool: pg.Pool;
  try {
    pool = new pg.Pool({ connectionString: DATABASE_URL });
    await pool.query("SELECT 1");
  } catch {
    t.skip("PostgreSQL test database not available");
    return;
  }

  // Setup test users & cleanup
  const testSub = "google_sub_integration_test_001";
  const testEmail = "google_user_test@example.com";
  const staffSub = "google_sub_staff_002";
  const staffEmail = "google_staff_test@example.com";

  const testEmails = [
    testEmail,
    staffEmail,
    "conflict_target@example.com",
  ];
  await pool.query(
    "DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1::text[]))",
    [testEmails],
  );
  await pool.query(
    "DELETE FROM auth_tokens WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1::text[]))",
    [testEmails],
  );
  await pool.query(
    "DELETE FROM user_identities WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1::text[]))",
    [testEmails],
  );
  await pool.query(
    "DELETE FROM users WHERE email = ANY($1::text[])",
    [testEmails],
  );

  const currentMockClaims = {
    iss: "https://accounts.google.com",
    aud: "test-google-client-id.apps.googleusercontent.com",
    sub: testSub,
    email: testEmail,
    email_verified: true,
    exp: Math.floor(Date.now() / 1000) + 3600,
    nonce: undefined as string | undefined,
  };

  const mockGoogleClient: GoogleOAuthClient = {
    exchangeCode: async () => ({ idToken: "mock_id_token", accessToken: "mock_access_token" }),
    verifyIdToken: async (_token, _aud, nonce) => ({
      ...currentMockClaims,
      nonce: nonce || currentMockClaims.nonce,
    }),
  };

  process.env.DATABASE_URL = DATABASE_URL;
  process.env.APP_ENV = "test";
  process.env.GOOGLE_CLIENT_ID = "test-google-client-id.apps.googleusercontent.com";
  process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(GOOGLE_OAUTH_CLIENT)
    .useValue(mockGoogleClient)
    .compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter({ disableRequestLogging: true }),
  );

  const fastify = app.getHttpAdapter().getInstance();
  await fastify.register(fastifyCookie);
  configureHttpApplication(app);
  app.useGlobalFilters(new ApiExceptionFilter(fastify.log));
  await app.init();

  const signingSecret = `${DATABASE_URL}:test-google-client-secret`;

  interface CookieRecord {
    name: string;
    value: string;
    httpOnly?: boolean;
    path?: string;
  }

  function getCookie(
    res: { cookies: CookieRecord[] },
    name: string,
  ): CookieRecord | undefined {
    return res.cookies.find((c: CookieRecord) => c.name === name);
  }

  await t.test("1. GET /api/v1/auth/google initiates flow, sets signed cookie and redirects", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/google?returnTo=/dashboard",
    });

    assert.equal(res.statusCode, 302);
    const location = res.headers.location;
    assert.ok(location?.startsWith("https://accounts.google.com/o/oauth2/v2/auth"));

    const stateCookie = getCookie(res, "gp_oauth_state");
    assert.ok(stateCookie, "gp_oauth_state cookie must be set");
    assert.equal(stateCookie?.httpOnly, true);
    assert.equal(stateCookie?.path, "/api/v1/auth/google");

    const parsedUrl = new URL(location!);
    const stateParam = parsedUrl.searchParams.get("state");
    assert.ok(stateParam);

    const verified = parseAndVerifyOAuthState(stateCookie?.value, stateParam, signingSecret);
    assert.ok(verified);
    assert.equal(verified?.returnTo, "http://localhost:3000/dashboard");
  });

  await t.test("2. Open Redirect Attack: GET /api/v1/auth/google?returnTo=https://evil.com is neutralized", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/google?returnTo=https://evil.com",
    });

    assert.equal(res.statusCode, 302);
    const stateCookie = getCookie(res, "gp_oauth_state");
    const parsedUrl = new URL(res.headers.location!);
    const stateParam = parsedUrl.searchParams.get("state")!;

    const verified = parseAndVerifyOAuthState(stateCookie?.value, stateParam, signingSecret);
    assert.ok(verified);
    assert.equal(
      verified?.returnTo,
      "http://localhost:3000",
      "Evil redirect must be neutralized to frontendUrl",
    );
  });

  await t.test("3. Case B: GET /api/v1/auth/google/callback registers new user atomically and sets session", async () => {
    currentMockClaims.sub = testSub;
    currentMockClaims.email = testEmail;

    const payload: OAuthStatePayload = {
      state: "valid_state_b",
      codeVerifier: "valid_code_verifier_b",
      nonce: "valid_nonce_b",
      returnTo: "http://localhost:3000/catalog",
      createdAt: Date.now(),
    };
    const cookieValue = serializeOAuthState(payload, signingSecret);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/google/callback?code=test_auth_code&state=valid_state_b",
      cookies: {
        gp_oauth_state: cookieValue,
      },
    });

    assert.equal(res.statusCode, 302);
    assert.equal(res.headers.location, "http://localhost:3000/catalog");

    // Verify session cookie was set
    const sessionCookie = getCookie(res, "gifted_session");
    assert.ok(sessionCookie, "gifted_session cookie must be set");
    assert.equal(sessionCookie?.httpOnly, true);

    // Verify state cookie was cleared
    const clearedStateCookie = getCookie(res, "gp_oauth_state");
    assert.ok(clearedStateCookie, "gp_oauth_state cookie must be cleared");

    // Verify database record
    const userRes = await pool.query(
      "SELECT id, email, role, status, email_verified_at, password_hash FROM users WHERE email = $1",
      [testEmail],
    );
    assert.equal(userRes.rows.length, 1);
    const user = userRes.rows[0];
    assert.equal(user.role, "customer");
    assert.equal(user.status, "active");
    assert.equal(user.password_hash, null);
    assert.ok(user.email_verified_at !== null);

    const identityRes = await pool.query(
      "SELECT id, user_id, provider, provider_subject FROM user_identities WHERE user_id = $1",
      [user.id],
    );
    assert.equal(identityRes.rows.length, 1);
    assert.equal(identityRes.rows[0].provider, "google");
    assert.equal(identityRes.rows[0].provider_subject, testSub);
  });

  await t.test("4. Case A: GET /api/v1/auth/google/callback logs in existing Google identity", async () => {
    currentMockClaims.sub = testSub;
    currentMockClaims.email = testEmail;

    const payload: OAuthStatePayload = {
      state: "valid_state_a",
      codeVerifier: "valid_code_verifier_a",
      nonce: "valid_nonce_a",
      returnTo: "http://localhost:3000/account",
      createdAt: Date.now(),
    };
    const cookieValue = serializeOAuthState(payload, signingSecret);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/google/callback?code=test_code_existing&state=valid_state_a",
      cookies: {
        gp_oauth_state: cookieValue,
      },
    });

    assert.equal(res.statusCode, 302);
    assert.equal(res.headers.location, "http://localhost:3000/account");
    const sessionCookie = getCookie(res, "gifted_session");
    assert.ok(sessionCookie);

    // Verify user count did not increase
    const userCount = await pool.query("SELECT COUNT(*) FROM users WHERE email = $1", [testEmail]);
    assert.equal(userCount.rows[0].count, "1");
  });

  await t.test("5. Case D: Staff role preservation during Google login", async () => {
    // Create staff user manually in DB
    const staffUserRes = await pool.query(
      "INSERT INTO users (email, role, status, email_verified_at) VALUES ($1, $2, $3, NOW()) RETURNING id",
      [staffEmail, "admin", "active"],
    );
    const staffId = staffUserRes.rows[0].id;

    // Link staff to Google
    await pool.query(
      "INSERT INTO user_identities (user_id, provider, provider_subject, email_at_link_time) VALUES ($1, $2, $3, $4)",
      [staffId, "google", staffSub, staffEmail],
    );

    currentMockClaims.sub = staffSub;
    currentMockClaims.email = staffEmail;

    const payload: OAuthStatePayload = {
      state: "valid_state_staff",
      codeVerifier: "verifier",
      nonce: "nonce",
      returnTo: "http://localhost:3000/admin",
      createdAt: Date.now(),
    };
    const cookieValue = serializeOAuthState(payload, signingSecret);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/google/callback?code=staff_code&state=valid_state_staff",
      cookies: {
        gp_oauth_state: cookieValue,
      },
    });

    assert.equal(res.statusCode, 302);
    const updatedStaff = await pool.query("SELECT role FROM users WHERE id = $1", [staffId]);
    assert.equal(updatedStaff.rows[0].role, "admin", "Staff role MUST NOT be changed by Google auth");
  });

  await t.test("6. Account Status Enforcement: Suspended & Deactivated accounts blocked", async () => {
    // Suspend user
    await pool.query("UPDATE users SET status = 'suspended' WHERE email = $1", [testEmail]);

    currentMockClaims.sub = testSub;
    currentMockClaims.email = testEmail;

    const payload: OAuthStatePayload = {
      state: "state_suspended",
      codeVerifier: "verifier",
      nonce: "nonce",
      returnTo: "http://localhost:3000",
      createdAt: Date.now(),
    };
    const cookieValue = serializeOAuthState(payload, signingSecret);

    const resSuspended = await app.inject({
      method: "GET",
      url: "/api/v1/auth/google/callback?code=code_suspended&state=state_suspended",
      cookies: {
        gp_oauth_state: cookieValue,
      },
    });

    assert.equal(resSuspended.statusCode, 302);
    assert.equal(resSuspended.headers.location, "http://localhost:3000/auth/login?error=account_suspended");
    assert.equal(
      getCookie(resSuspended, "gifted_session"),
      undefined,
      "Suspended user must NOT receive session cookie",
    );

    // Deactivate user
    await pool.query("UPDATE users SET status = 'deactivated' WHERE email = $1", [testEmail]);
    const payloadDeactivated: OAuthStatePayload = {
      state: "state_deactivated",
      codeVerifier: "verifier",
      nonce: "nonce",
      returnTo: "http://localhost:3000",
      createdAt: Date.now(),
    };
    const cookieDeactivated = serializeOAuthState(payloadDeactivated, signingSecret);

    const resDeactivated = await app.inject({
      method: "GET",
      url: "/api/v1/auth/google/callback?code=code_deactivated&state=state_deactivated",
      cookies: {
        gp_oauth_state: cookieDeactivated,
      },
    });

    assert.equal(resDeactivated.statusCode, 302);
    assert.equal(resDeactivated.headers.location, "http://localhost:3000/auth/login?error=account_deactivated");
    assert.equal(
      getCookie(resDeactivated, "gifted_session"),
      undefined,
      "Deactivated user must NOT receive session cookie",
    );

    // Restore user to active
    await pool.query("UPDATE users SET status = 'active' WHERE email = $1", [testEmail]);
  });

  await t.test("7. Case C Attack: Google login matching existing password account redirects without linking", async () => {
    // Create password user
    await pool.query(
      "INSERT INTO users (email, password_hash, role, status, email_verified_at) VALUES ($1, $2, $3, $4, NOW())",
      ["conflict_target@example.com", "argon2id_hash_123", "customer", "active"],
    );

    // Google returns this email with a NEW subject
    currentMockClaims.sub = "unlinked_google_sub_99999";
    currentMockClaims.email = "conflict_target@example.com";

    const payload: OAuthStatePayload = {
      state: "state_conflict",
      codeVerifier: "verifier",
      nonce: "nonce",
      returnTo: "http://localhost:3000",
      createdAt: Date.now(),
    };
    const cookieValue = serializeOAuthState(payload, signingSecret);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/google/callback?code=code_conflict&state=state_conflict",
      cookies: {
        gp_oauth_state: cookieValue,
      },
    });

    assert.equal(res.statusCode, 302);
    assert.equal(res.headers.location, "http://localhost:3000/auth/login?error=account_exists_link_required");
    assert.equal(getCookie(res, "gifted_session"), undefined);

    // Verify identity was NOT linked
    const linkCheck = await pool.query(
      "SELECT * FROM user_identities WHERE provider_subject = 'unlinked_google_sub_99999'",
    );
    assert.equal(linkCheck.rows.length, 0, "Must NOT auto-link on email collision");
  });

  await t.test("8. Lockout Defense: DELETE /api/v1/auth/google/unlink rejected when user has no password", async () => {
    // testEmail has password_hash = NULL (OAuth-only account)
    // First log in as testEmail to obtain session cookie
    currentMockClaims.sub = testSub;
    currentMockClaims.email = testEmail;

    const payload: OAuthStatePayload = {
      state: "state_unlink_test",
      codeVerifier: "verifier",
      nonce: "nonce",
      returnTo: "http://localhost:3000",
      createdAt: Date.now(),
    };
    const cookieValue = serializeOAuthState(payload, signingSecret);

    const loginRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/google/callback?code=code_unlink&state=state_unlink_test",
      cookies: {
        gp_oauth_state: cookieValue,
      },
    });

    const sessionCookie = getCookie(loginRes, "gifted_session")?.value;
    assert.ok(sessionCookie);

    // Attempt to unlink Google
    const unlinkRes = await app.inject({
      method: "DELETE",
      url: "/api/v1/auth/google/unlink",
      cookies: {
        gifted_session: sessionCookie,
      },
    });

    assert.equal(unlinkRes.statusCode, 400);
    const errorJson = JSON.parse(unlinkRes.body);
    assert.equal(errorJson.error.code, "BAD_REQUEST");

    // Verify identity is still in database
    const idCheck = await pool.query(
      "SELECT * FROM user_identities WHERE provider_subject = $1",
      [testSub],
    );
    assert.equal(idCheck.rows.length, 1, "Identity must not be deleted");
  });

  // Cleanup
  await pool.query(
    "DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1::text[]))",
    [testEmails],
  );
  await pool.query(
    "DELETE FROM auth_tokens WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1::text[]))",
    [testEmails],
  );
  await pool.query(
    "DELETE FROM user_identities WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1::text[]))",
    [testEmails],
  );
  await pool.query(
    "DELETE FROM users WHERE email = ANY($1::text[])",
    [testEmails],
  );

  await app.close();
  await pool.end();
});
