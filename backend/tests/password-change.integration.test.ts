import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { Test, type TestingModule } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import fastifyCookie from "@fastify/cookie";
import { AppModule } from "../src/app.module.js";
import { configureHttpApplication } from "../src/http/configure-http-application.js";
import { ApiExceptionFilter } from "../src/http/api-exception.filter.js";
import { generateSecureToken, hashToken } from "../src/modules/identity/utils/token.utils.js";
import { PasswordHasherService } from "../src/modules/identity/services/password-hasher.service.js";
import { AuthService } from "../src/modules/identity/services/auth.service.js";
import { AuditService } from "../src/modules/audit/audit.service.js";
import { usersTable } from "../src/infrastructure/database/schemas/users.schema.js";
import { sessionsTable } from "../src/infrastructure/database/schemas/sessions.schema.js";
import { auditEventsTable } from "../src/infrastructure/database/schemas/audit-events.schema.js";
import { and, eq } from "drizzle-orm";
import type { ApplicationDatabase } from "../src/infrastructure/database/database.module.js";
import { DRIZZLE_DATABASE } from "../src/infrastructure/database/database.tokens.js";

const DATABASE_URL =
  process.env.PHASE1_TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://tester@127.0.0.1:5433/giftedpro_phase1_test";

let app: NestFastifyApplication;
let pool: pg.Pool;
let db: ApplicationDatabase;
let authService: AuthService;
let auditService: AuditService;
const hasher = new PasswordHasherService();

before(async () => {
  process.env.DATABASE_URL = DATABASE_URL;
  process.env.APP_ENV = "test";

  pool = new pg.Pool({ connectionString: DATABASE_URL, max: 20 });

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const fastifyAdapter = new FastifyAdapter();
  app = moduleFixture.createNestApplication<NestFastifyApplication>(fastifyAdapter);
  const fastifyInstance = app.getHttpAdapter().getInstance();
  await fastifyInstance.register(fastifyCookie);
  configureHttpApplication(app);
  app.useGlobalFilters(new ApiExceptionFilter(fastifyInstance.log));
  await app.init();
  await fastifyInstance.ready();

  db = moduleFixture.get<ApplicationDatabase>(DRIZZLE_DATABASE);
  authService = moduleFixture.get<AuthService>(AuthService);
  auditService = moduleFixture.get<AuditService>(AuditService);
});

after(async () => {
  if (app) {
    await app.close();
  }
  if (pool) {
    await pool.end();
  }
});

async function createTestUserWithPassword(
  email: string,
  plainPassword: string,
  status: "active" | "suspended" | "pending_verification" = "active",
) {
  const passwordHash = await hasher.hashPassword(plainPassword);
  const [user] = await db
    .insert(usersTable)
    .values({
      email: email.toLowerCase(),
      passwordHash,
      role: "customer",
      status,
      emailVerifiedAt: new Date(),
    })
    .returning();
  return user!;
}

async function createOAuthUserWithoutPassword(email: string) {
  const [user] = await db
    .insert(usersTable)
    .values({
      email: email.toLowerCase(),
      passwordHash: null,
      role: "customer",
      status: "active",
      emailVerifiedAt: new Date(),
    })
    .returning();
  return user!;
}

async function createSessionForUser(userId: string, deviceId: string | null = null) {
  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [session] = await db
    .insert(sessionsTable)
    .values({
      userId,
      deviceId,
      tokenHash,
      lastActiveAt: now,
      expiresAt,
      ipAddress: "127.0.0.1",
      userAgent: "TestBrowser/1.0",
    })
    .returning();

  return { session: session!, rawToken, cookie: `gifted_session=${rawToken}` };
}

test("PC-01: Anonymous call without session cookie is rejected with 401 Unauthorized", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/change-password",
    headers: {
      "content-type": "application/json",
    },
    payload: {
      currentPassword: "OldPassword123!",
      newPassword: "NewPassword123!",
    },
  });

  assert.equal(res.statusCode, 401);
  const body = JSON.parse(res.payload);
  assert.equal(body.success, false);
  assert.equal(body.error.code, "REQUEST_REJECTED");
});

test("PC-02: Incorrect current password returns 401 and records failure audit event", async () => {
  const user = await createTestUserWithPassword(
    `pc02_${randomUUID().slice(0, 8)}@example.com`,
    "CorrectPassword123!",
  );
  const { cookie } = await createSessionForUser(user.id);

  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/change-password",
    headers: {
      "content-type": "application/json",
      cookie,
    },
    payload: {
      currentPassword: "WrongPassword123!",
      newPassword: "BrandNewPassword123!",
    },
  });

  assert.equal(res.statusCode, 401);
  const body = JSON.parse(res.payload);
  assert.equal(body.success, false);
  assert.ok(body.error.message.includes("Invalid current password"));

  // Verify failure audit event was recorded
  const auditRecords = await db
    .select()
    .from(auditEventsTable)
    .where(
      and(
        eq(auditEventsTable.actorId, user.id),
        eq(auditEventsTable.action, "auth.password_change.failed"),
      ),
    );
  assert.ok(auditRecords.length >= 1);
  assert.equal((auditRecords[0]!.metadata as any)?.reason, "invalid_current_password");
});

test("PC-03: New password identical to current returns 400 Bad Request", async () => {
  const currentPass = "IdenticalPassword123!";
  const user = await createTestUserWithPassword(
    `pc03_${randomUUID().slice(0, 8)}@example.com`,
    currentPass,
  );
  const { cookie } = await createSessionForUser(user.id);

  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/change-password",
    headers: {
      "content-type": "application/json",
      cookie,
    },
    payload: {
      currentPassword: currentPass,
      newPassword: currentPass,
    },
  });

  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.payload);
  assert.equal(body.success, false);
  assert.ok(body.error.message.includes("cannot be identical"));
});

test("PC-04: Weak new password fails DTO validation pipe with 400 Bad Request", async () => {
  const user = await createTestUserWithPassword(
    `pc04_${randomUUID().slice(0, 8)}@example.com`,
    "ValidPassword123!",
  );
  const { cookie } = await createSessionForUser(user.id);

  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/change-password",
    headers: {
      "content-type": "application/json",
      cookie,
    },
    payload: {
      currentPassword: "ValidPassword123!",
      newPassword: "weak", // < 8 characters, no uppercase, no digit
    },
  });

  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.payload);
  assert.equal(body.success, false);
  assert.equal(body.error.code, "BAD_REQUEST");
  assert.ok(Array.isArray(body.error.details));
});

test("PC-05: OAuth-only account without password returns 400 Bad Request", async () => {
  const oauthUser = await createOAuthUserWithoutPassword(
    `pc05_${randomUUID().slice(0, 8)}@gmail.com`,
  );
  const { cookie } = await createSessionForUser(oauthUser.id);

  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/change-password",
    headers: {
      "content-type": "application/json",
      cookie,
    },
    payload: {
      currentPassword: "SomePassword123!",
      newPassword: "BrandNewPassword123!",
    },
  });

  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.payload);
  assert.equal(body.success, false);
  assert.ok(body.error.message.includes("does not have a password set"));
});

test("PC-06: Successful password change flow rotates session, sets secure cookie, and revokes other sessions", async () => {
  const oldPassword = "OldSecurePassword123!";
  const newPassword = "NewSecurePassword456!";
  const user = await createTestUserWithPassword(
    `pc06_${randomUUID().slice(0, 8)}@example.com`,
    oldPassword,
  );

  // Create current session + 2 concurrent sessions on other devices
  const { session: currentSession, cookie: currentCookie } = await createSessionForUser(user.id);
  const { session: otherSession1 } = await createSessionForUser(user.id);
  const { session: otherSession2 } = await createSessionForUser(user.id);

  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/change-password",
    headers: {
      "content-type": "application/json",
      cookie: currentCookie,
    },
    payload: {
      currentPassword: oldPassword,
      newPassword: newPassword,
    },
  });

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.payload);
  assert.equal(body.success, true);
  assert.equal(body.data.message, "Password has been successfully changed");

  // Verify Set-Cookie header contains new session token
  const setCookie = res.headers["set-cookie"];
  assert.ok(setCookie);
  const setCookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  assert.ok(setCookieStr!.includes("gifted_session="));
  assert.ok(setCookieStr!.includes("HttpOnly"));
  assert.ok(setCookieStr!.includes("SameSite=Lax"));
  assert.ok(setCookieStr!.includes("Path=/"));

  // Verify old session is marked revoked
  const [oldSessDb] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, currentSession.id));
  assert.ok(oldSessDb!.revokedAt !== null);
  assert.equal(oldSessDb!.revokedReason, "password_change");

  // Verify other sessions are also revoked
  const [other1Db] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, otherSession1.id));
  assert.ok(other1Db!.revokedAt !== null);
  assert.equal(other1Db!.revokedReason, "password_change");

  const [other2Db] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, otherSession2.id));
  assert.ok(other2Db!.revokedAt !== null);
  assert.equal(other2Db!.revokedReason, "password_change");

  // Verify user password hash was updated
  const [updatedUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, user.id));
  assert.notEqual(updatedUser!.passwordHash, user.passwordHash);
  assert.equal(await hasher.verifyPassword(updatedUser!.passwordHash!, newPassword), true);
  assert.equal(await hasher.verifyPassword(updatedUser!.passwordHash!, oldPassword), false);

  // Verify success audit event recorded with failClosed
  const [successAudit] = await db
    .select()
    .from(auditEventsTable)
    .where(
      and(
        eq(auditEventsTable.actorId, user.id),
        eq(auditEventsTable.action, "auth.password_change.completed"),
      ),
    );
  assert.ok(successAudit);
  assert.equal((successAudit.metadata as any)?.previousSessionId, "[REDACTED]");
});

test("PC-07: Concurrency safety: simultaneous requests on same session - exactly ONE succeeds", async () => {
  const currentPass = "ConcurrentPass123!";
  const user = await createTestUserWithPassword(
    `pc07_${randomUUID().slice(0, 8)}@example.com`,
    currentPass,
  );
  const { cookie } = await createSessionForUser(user.id);

  // Execute two simultaneous password change requests with the SAME session cookie
  const req1 = app.inject({
    method: "POST",
    url: "/api/v1/auth/change-password",
    headers: {
      "content-type": "application/json",
      cookie,
    },
    payload: {
      currentPassword: currentPass,
      newPassword: "BrandNewPassA123!",
    },
  });

  const req2 = app.inject({
    method: "POST",
    url: "/api/v1/auth/change-password",
    headers: {
      "content-type": "application/json",
      cookie,
    },
    payload: {
      currentPassword: currentPass,
      newPassword: "BrandNewPassB123!",
    },
  });

  const [res1, res2] = await Promise.all([req1, req2]);
  const statusCodes = [res1.statusCode, res2.statusCode].sort();

  // Exactly one request must succeed (200) and the other must fail (401)
  assert.deepEqual(statusCodes, [200, 401]);

  const rejectedRes = res1.statusCode === 401 ? res1 : res2;
  const rejectedBody = JSON.parse(rejectedRes.payload);
  assert.ok(
    rejectedBody.error.message.includes("Session has already been revoked or rotated") ||
      rejectedBody.error.message.includes("Invalid or expired session"),
  );
});

test("PC-08: Transactional rollback: failure during audit logging rolls back password and session", async () => {
  const currentPass = "OriginalPass123!";
  const user = await createTestUserWithPassword(
    `pc08_${randomUUID().slice(0, 8)}@example.com`,
    currentPass,
  );
  const { session } = await createSessionForUser(user.id);

  // Mock auditService.recordEvent to simulate failure when action is auth.password_change.completed
  const originalRecordEvent = auditService.recordEvent.bind(auditService);
  (auditService as any).recordEvent = async (input: any) => {
    if (input.action === "auth.password_change.completed") {
      throw new Error("Simulated database failure during audit insert");
    }
    return originalRecordEvent(input);
  };

  try {
    await assert.rejects(
      async () => {
        await authService.changePassword(
          user.id,
          session.id,
          currentPass,
          "AttemptedNewPass123!",
        );
      },
      (err: any) => err instanceof Error && err.message.includes("Simulated database failure"),
    );

    // Verify rollback: password hash in usersTable must remain unchanged!
    const [userDb] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id));
    assert.equal(userDb!.passwordHash, user.passwordHash);

    // Verify rollback: original session must remain active (unrevoked)!
    const [sessDb] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, session.id));
    assert.equal(sessDb!.revokedAt, null);
  } finally {
    (auditService as any).recordEvent = originalRecordEvent;
  }
});

test("PC-09: CSRF Defense-in-depth: untrusted Origin header is rejected with 403 Forbidden", async () => {
  const user = await createTestUserWithPassword(
    `pc09_${randomUUID().slice(0, 8)}@example.com`,
    "ValidPassword123!",
  );
  const { cookie } = await createSessionForUser(user.id);

  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/change-password",
    headers: {
      "content-type": "application/json",
      cookie,
      origin: "https://malicious-attacker.com",
    },
    payload: {
      currentPassword: "ValidPassword123!",
      newPassword: "BrandNewPassword123!",
    },
  });

  assert.equal(res.statusCode, 403);
  const body = JSON.parse(res.payload);
  assert.equal(body.success, false);
  assert.equal(body.error.code, "REQUEST_REJECTED");
});

test("PC-10: Failure-audit resilience: incorrect password attempt returns 401 even if audit write fails", async () => {
  const currentPass = "MyActualSecretPassword123!";
  const user = await createTestUserWithPassword(
    `pc10_${randomUUID().slice(0, 8)}@example.com`,
    currentPass,
  );
  const { cookie } = await createSessionForUser(user.id);

  // Mock auditService.recordEvent to throw specifically on auth.password_change.failed
  const originalRecordEvent = auditService.recordEvent.bind(auditService);
  (auditService as any).recordEvent = async (input: any) => {
    if (input.action === "auth.password_change.failed") {
      throw new Error("Simulated database failure during failure audit persistence");
    }
    return originalRecordEvent(input);
  };

  try {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/change-password",
      headers: {
        "content-type": "application/json",
        cookie,
      },
      payload: {
        currentPassword: "CompletelyWrongPassword123!",
        newPassword: "BrandNewValidPassword123!",
      },
    });

    // 1. Must still return 401 Unauthorized
    assert.equal(res.statusCode, 401);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "REQUEST_REJECTED");
    assert.ok(body.error.message.includes("Invalid current password"));

    // 2. Must not expose passwords, session tokens, or internal database exception details in response
    const payloadStr = res.payload;
    assert.equal(payloadStr.includes("MyActualSecretPassword123!"), false);
    assert.equal(payloadStr.includes("CompletelyWrongPassword123!"), false);
    assert.equal(payloadStr.includes("Simulated database failure"), false);
  } finally {
    (auditService as any).recordEvent = originalRecordEvent;
  }
});

