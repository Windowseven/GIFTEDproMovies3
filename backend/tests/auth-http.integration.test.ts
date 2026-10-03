import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { Test, type TestingModule } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import fastifyCookie from "@fastify/cookie";
import { AppModule } from "../src/app.module.js";
import { loadEnvironment } from "../src/config/environment.js";
import { ENVIRONMENT_CONFIG } from "../src/config/tokens.js";
import { DATABASE_POOL, DRIZZLE_DATABASE } from "../src/infrastructure/database/database.tokens.js";
import { configureHttpApplication } from "../src/http/configure-http-application.js";
import { ApiExceptionFilter } from "../src/http/api-exception.filter.js";
import { AuthService } from "../src/modules/identity/services/auth.service.js";
import { SessionService } from "../src/modules/identity/services/session.service.js";
import { AccountService } from "../src/modules/identity/services/account.service.js";
import type { UserRecord } from "../src/infrastructure/database/schemas/users.schema.js";
import type { SessionRecord } from "../src/infrastructure/database/schemas/sessions.schema.js";

let app: NestFastifyApplication;
let testingModule: TestingModule;

const mockUser: UserRecord = {
  id: "user-123",
  email: "tester@giftedpromovies.com",
  passwordHash: "argon2id$hashed",
  role: "customer",
  status: "active",
  emailVerifiedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSession: SessionRecord = {
  id: "sess-456",
  userId: "user-123",
  deviceId: null,
  tokenHash: "hash-456",
  lastActiveAt: new Date(),
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  revokedAt: null,
  revokedReason: null,
  ipAddress: "127.0.0.1",
  userAgent: "IntegrationTester",
  createdAt: new Date(),
};

before(async () => {
  const environment = loadEnvironment({
    APP_ENV: "test",
    DATABASE_URL: "postgresql://tester:tester@127.0.0.1:5432/giftedpro_phase1_test",
  });

  const mockAuthService = {
    register: async (email: string) => ({
      id: "user-new",
      email: email.toLowerCase(),
      role: "customer",
      status: "pending_verification",
      emailVerifiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    login: async () => ({
      user: {
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        status: mockUser.status,
        emailVerifiedAt: mockUser.emailVerifiedAt,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      },
      session: mockSession,
      rawToken: "valid-raw-token-abcdef123456",
    }),
    logout: async () => undefined,
    logoutAll: async () => undefined,
    verifyEmail: async () => undefined,
    resendVerification: async () => undefined,
    requestPasswordReset: async () => undefined,
    resetPassword: async () => undefined,
  };

  const mockSessionService = {
    resolveSession: async (token: string) => {
      if (token === "valid-raw-token-abcdef123456") {
        return { session: mockSession, user: mockUser };
      }
      return null;
    },
    touchSession: async () => undefined,
  };

  const mockAccountService = {
    getUserCapabilities: async () => [],
    getSafeUserById: async () => mockUser,
  };

  testingModule = await Test.createTestingModule({
    imports: [AppModule],
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
    .overrideProvider(AuthService)
    .useValue(mockAuthService)
    .overrideProvider(SessionService)
    .useValue(mockSessionService)
    .overrideProvider(AccountService)
    .useValue(mockAccountService)
    .compile();

  app = testingModule.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter({ disableRequestLogging: true }),
  );

  const fastify = app.getHttpAdapter().getInstance();
  await fastify.register(fastifyCookie);
  configureHttpApplication(app);
  app.useGlobalFilters(new ApiExceptionFilter(fastify.log));
  await app.init();
});

after(async () => {
  await app?.close();
  await testingModule?.close();
});

test("POST /api/v1/auth/register validates payload and returns 201 with sanitized user", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: {
      email: "testuser@example.com",
      password: "ValidPassword123!",
    },
  });

  assert.equal(res.statusCode, 201);
  const body = res.json();
  assert.equal(body.success, true);
  assert.equal(body.data.user.email, "testuser@example.com");
  assert.equal(body.data.user.role, "customer");
  assert.equal(body.data.user.status, "pending_verification");
  assert.equal(body.data.user.passwordHash, undefined);
});

test("POST /api/v1/auth/register rejects weak password with 400 Bad Request", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: {
      email: "testuser@example.com",
      password: "weak",
    },
  });

  assert.equal(res.statusCode, 400);
  const body = res.json();
  assert.equal(body.success, false);
  assert.equal(body.error.code, "BAD_REQUEST");
  assert.ok(Array.isArray(body.error.details));
});

test("POST /api/v1/auth/login sets HTTP-only session cookie", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: {
      email: "tester@giftedpromovies.com",
      password: "ValidPassword123!",
    },
  });

  assert.equal(res.statusCode, 200);
  const setCookie = res.headers["set-cookie"];
  assert.ok(setCookie);
  assert.ok(String(setCookie).includes("gifted_session=valid-raw-token-abcdef123456"));
  assert.ok(String(setCookie).includes("HttpOnly"));
  assert.ok(String(setCookie).includes("SameSite=Lax"));
});

test("GET /api/v1/auth/me returns current user context when authenticated via cookie", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/api/v1/auth/me",
    headers: {
      cookie: "gifted_session=valid-raw-token-abcdef123456",
    },
  });

  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.success, true);
  assert.equal(body.data.user.email, "tester@giftedpromovies.com");
  assert.equal(body.data.session.id, "sess-456");
});

test("GET /api/v1/auth/me returns 401 when no session cookie or token provided", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/api/v1/auth/me",
  });

  assert.equal(res.statusCode, 401);
  const body = res.json();
  assert.equal(body.success, false);
});

test("POST /api/v1/auth/logout clears session cookie", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/logout",
    headers: {
      cookie: "gifted_session=valid-raw-token-abcdef123456",
    },
  });

  assert.equal(res.statusCode, 200);
  const setCookie = String(res.headers["set-cookie"]);
  assert.ok(setCookie.includes("gifted_session="));
  assert.ok(setCookie.includes("Max-Age=0") || setCookie.includes("Expires="));
});
