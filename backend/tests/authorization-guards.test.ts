import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { SessionAuthGuard } from "../src/modules/identity/guards/session-auth.guard.js";
import { RolesGuard } from "../src/modules/identity/guards/roles.guard.js";
import { CapabilitiesGuard } from "../src/modules/identity/guards/capabilities.guard.js";
import {
  IS_PUBLIC_KEY,
  ALLOW_UNVERIFIED_KEY,
  ROLES_KEY,
  CAPABILITIES_KEY,
} from "../src/modules/identity/decorators/index.js";
import type { UserRecord } from "../src/infrastructure/database/schemas/users.schema.js";
import type { SessionRecord } from "../src/infrastructure/database/schemas/sessions.schema.js";

function createMockReflector(metadata: Record<string, any>) {
  return {
    getAllAndOverride: (key: string) => metadata[key],
  } as any;
}

function createMockExecutionContext(request: any) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

test("SessionAuthGuard allows public routes without authentication", async () => {
  const reflector = createMockReflector({ [IS_PUBLIC_KEY]: true });
  const mockSessionService = {} as any;
  const guard = new SessionAuthGuard(reflector, mockSessionService);

  const req: any = { cookies: {}, headers: {} };
  const context = createMockExecutionContext(req);

  const result = await guard.canActivate(context);
  assert.equal(result, true);
});

test("SessionAuthGuard throws UnauthorizedException when no session token provided", async () => {
  const reflector = createMockReflector({});
  const mockSessionService = {} as any;
  const guard = new SessionAuthGuard(reflector, mockSessionService);

  const req: any = { cookies: {}, headers: {} };
  const context = createMockExecutionContext(req);

  await assert.rejects(
    async () => await guard.canActivate(context),
    (err: unknown) =>
      err instanceof UnauthorizedException &&
      err.message.includes("Authentication required"),
  );
});

test("SessionAuthGuard centrally enforces ACCOUNT_SUSPENDED for all roles including admin", async () => {
  const reflector = createMockReflector({});
  const suspendedAdmin: UserRecord = {
    id: "admin-1",
    email: "admin@giftedpromovies.com",
    passwordHash: "hash",
    role: "admin",
    status: "suspended",
    emailVerifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const session: SessionRecord = {
    id: "session-1",
    userId: "admin-1",
    deviceId: null,
    tokenHash: "hash",
    lastActiveAt: new Date(),
    expiresAt: new Date(Date.now() + 100000),
    revokedAt: null,
    revokedReason: null,
    ipAddress: null,
    userAgent: null,
    createdAt: new Date(),
  };

  const mockSessionService = {
    resolveSession: async () => ({ session, user: suspendedAdmin }),
    touchSession: async () => {},
  } as any;

  const guard = new SessionAuthGuard(reflector, mockSessionService);
  const req: any = { cookies: { gifted_session: "token123" }, headers: {} };
  const context = createMockExecutionContext(req);

  await assert.rejects(
    async () => await guard.canActivate(context),
    (err: unknown) =>
      err instanceof ForbiddenException &&
      err.message.includes("ACCOUNT_SUSPENDED"),
  );
});

test("SessionAuthGuard centrally enforces ACCOUNT_DEACTIVATED", async () => {
  const reflector = createMockReflector({});
  const deactivatedUser: UserRecord = {
    id: "user-1",
    email: "user@example.com",
    passwordHash: "hash",
    role: "customer",
    status: "deactivated",
    emailVerifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const session: SessionRecord = {
    id: "session-1",
    userId: "user-1",
    deviceId: null,
    tokenHash: "hash",
    lastActiveAt: new Date(),
    expiresAt: new Date(Date.now() + 100000),
    revokedAt: null,
    revokedReason: null,
    ipAddress: null,
    userAgent: null,
    createdAt: new Date(),
  };

  const mockSessionService = {
    resolveSession: async () => ({ session, user: deactivatedUser }),
    touchSession: async () => {},
  } as any;

  const guard = new SessionAuthGuard(reflector, mockSessionService);
  const req: any = { cookies: { gifted_session: "token123" }, headers: {} };
  const context = createMockExecutionContext(req);

  await assert.rejects(
    async () => await guard.canActivate(context),
    (err: unknown) =>
      err instanceof ForbiddenException &&
      err.message.includes("ACCOUNT_DEACTIVATED"),
  );
});

test("SessionAuthGuard blocks pending_verification accounts from standard routes without @AllowUnverified", async () => {
  const reflector = createMockReflector({ [ALLOW_UNVERIFIED_KEY]: false });
  const pendingUser: UserRecord = {
    id: "user-pending",
    email: "unverified@example.com",
    passwordHash: "hash",
    role: "customer",
    status: "pending_verification",
    emailVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const session: SessionRecord = {
    id: "session-2",
    userId: "user-pending",
    deviceId: null,
    tokenHash: "hash",
    lastActiveAt: new Date(),
    expiresAt: new Date(Date.now() + 100000),
    revokedAt: null,
    revokedReason: null,
    ipAddress: null,
    userAgent: null,
    createdAt: new Date(),
  };

  const mockSessionService = {
    resolveSession: async () => ({ session, user: pendingUser }),
    touchSession: async () => {},
  } as any;

  const guard = new SessionAuthGuard(reflector, mockSessionService);
  const req: any = { cookies: { gifted_session: "token123" }, headers: {} };
  const context = createMockExecutionContext(req);

  await assert.rejects(
    async () => await guard.canActivate(context),
    (err: unknown) =>
      err instanceof ForbiddenException &&
      err.message.includes("ACCOUNT_PENDING_VERIFICATION"),
  );
});

test("SessionAuthGuard allows pending_verification accounts on routes with @AllowUnverified", async () => {
  const reflector = createMockReflector({ [ALLOW_UNVERIFIED_KEY]: true });
  const pendingUser: UserRecord = {
    id: "user-pending",
    email: "unverified@example.com",
    passwordHash: "hash",
    role: "customer",
    status: "pending_verification",
    emailVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const session: SessionRecord = {
    id: "session-2",
    userId: "user-pending",
    deviceId: null,
    tokenHash: "hash",
    lastActiveAt: new Date(),
    expiresAt: new Date(Date.now() + 100000),
    revokedAt: null,
    revokedReason: null,
    ipAddress: null,
    userAgent: null,
    createdAt: new Date(),
  };

  const mockSessionService = {
    resolveSession: async () => ({ session, user: pendingUser }),
    touchSession: async () => {},
  } as any;

  const guard = new SessionAuthGuard(reflector, mockSessionService);
  const req: any = { cookies: { gifted_session: "token123" }, headers: {} };
  const context = createMockExecutionContext(req);

  const allowed = await guard.canActivate(context);
  assert.equal(allowed, true);
  assert.equal(req.user.email, "unverified@example.com");
  assert.equal(req.session.id, "session-2");
});

test("RolesGuard: Admin role bypasses operational role requirements", () => {
  const reflector = createMockReflector({ [ROLES_KEY]: ["media_team"] });
  const guard = new RolesGuard(reflector);

  const req: any = { user: { role: "admin" } };
  const context = createMockExecutionContext(req);

  assert.equal(guard.canActivate(context), true);
});

test("RolesGuard: Permits user with matching role and rejects non-matching role", () => {
  const reflector = createMockReflector({ [ROLES_KEY]: ["media_team"] });
  const guard = new RolesGuard(reflector);

  const staffReq: any = { user: { role: "media_team" } };
  assert.equal(guard.canActivate(createMockExecutionContext(staffReq)), true);

  const customerReq: any = { user: { role: "customer" } };
  assert.throws(
    () => guard.canActivate(createMockExecutionContext(customerReq)),
    (err: unknown) =>
      err instanceof ForbiddenException && err.message.includes("INSUFFICIENT_ROLE"),
  );
});

test("CapabilitiesGuard: Admin role bypasses operational capability check", async () => {
  const reflector = createMockReflector({ [CAPABILITIES_KEY]: "CONTENT_UPLOAD" });
  const mockAccountService = {
    getUserCapabilities: async () => [],
  } as any;

  const guard = new CapabilitiesGuard(reflector, mockAccountService);
  const req: any = { user: { role: "admin" } };

  assert.equal(await guard.canActivate(createMockExecutionContext(req)), true);
});

test("CapabilitiesGuard: Checks specific capability on media_team staff member", async () => {
  const reflector = createMockReflector({ [CAPABILITIES_KEY]: "CONTENT_UPLOAD" });
  const mockAccountService = {
    getUserCapabilities: async (userId: string) =>
      userId === "staff-with-upload" ? ["CONTENT_UPLOAD", "CONTENT_CREATE"] : ["CONTENT_CREATE"],
  } as any;

  const guard = new CapabilitiesGuard(reflector, mockAccountService);

  // Staff with capability
  const staffWithUpload: any = { user: { id: "staff-with-upload", role: "media_team" } };
  assert.equal(await guard.canActivate(createMockExecutionContext(staffWithUpload)), true);

  // Staff without capability
  const staffWithoutUpload: any = { user: { id: "staff-without-upload", role: "media_team" } };
  await assert.rejects(
    async () => await guard.canActivate(createMockExecutionContext(staffWithoutUpload)),
    (err: unknown) =>
      err instanceof ForbiddenException &&
      err.message.includes("CONTENT_UPLOAD"),
  );

  // Customer attempting access
  const customer: any = { user: { id: "customer-1", role: "customer" } };
  await assert.rejects(
    async () => await guard.canActivate(createMockExecutionContext(customer)),
    (err: unknown) =>
      err instanceof ForbiddenException &&
      err.message.includes("Capabilities apply to staff only"),
  );
});

test("CapabilitiesGuard: Enforces CONTENT_EDIT capability on metadata editing endpoints", async () => {
  const reflector = createMockReflector({ [CAPABILITIES_KEY]: "CONTENT_EDIT" });
  const mockAccountService = {
    getUserCapabilities: async (userId: string) =>
      userId === "staff-editor" ? ["CONTENT_EDIT"] : ["CONTENT_CREATE"],
  } as any;

  const guard = new CapabilitiesGuard(reflector, mockAccountService);

  // Staff with CONTENT_EDIT capability
  const staffEditor: any = { user: { id: "staff-editor", role: "media_team" } };
  assert.equal(await guard.canActivate(createMockExecutionContext(staffEditor)), true);

  // Staff without CONTENT_EDIT capability
  const staffCreatorOnly: any = { user: { id: "staff-creator-only", role: "media_team" } };
  await assert.rejects(
    async () => await guard.canActivate(createMockExecutionContext(staffCreatorOnly)),
    (err: unknown) =>
      err instanceof ForbiddenException &&
      err.message.includes("CONTENT_EDIT"),
  );
});
