import assert from "node:assert/strict";
import test from "node:test";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "../src/modules/identity/services/auth.service.js";
import { AccountService } from "../src/modules/identity/services/account.service.js";
import type { UserRecord } from "../src/infrastructure/database/schemas/users.schema.js";

function createMockEmailSender() {
  const sentEmails: any[] = [];
  return {
    sentEmails,
    sendVerificationEmail: async (to: string, token: string) => {
      sentEmails.push({ type: "verification", to, token });
    },
    sendPasswordResetEmail: async (to: string, token: string) => {
      sentEmails.push({ type: "password_reset", to, token });
    },
  };
}

function createMockAuditService() {
  const events: any[] = [];
  return {
    events,
    recordEvent: async (event: any) => {
      events.push(event);
    },
  };
}

test("AuthService.register forces role=customer and status=pending_verification", async () => {
  let insertedUser: any = null;
  let insertedToken: any = null;

  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [], // No existing user
        }),
      }),
    }),
    insert: () => ({
      values: (vals: any) => {
        if (vals.email) {
          insertedUser = vals;
          return {
            returning: async () => [
              {
                id: "user-new-1",
                ...vals,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          };
        }
        insertedToken = vals;
        return {
          values: () => ({}),
        };
      },
    }),
  } as any;

  const mockEmail = createMockEmailSender();
  const mockAudit = createMockAuditService();
  const mockHasher = {
    hashPassword: async () => "argon2id$mockhash",
  } as any;
  const mockSessionService = {} as any;
  const mockDeviceService = {} as any;

  const authService = new AuthService(
    mockDb,
    mockEmail as any,
    mockHasher,
    mockSessionService,
    mockDeviceService,
    mockAudit as any,
  );

  const safeUser = await authService.register("NewUser@Example.COM", "Password123!");

  assert.equal(insertedUser.email, "newuser@example.com");
  assert.equal(insertedUser.role, "customer");
  assert.equal(insertedUser.status, "pending_verification");
  assert.equal((safeUser as any).passwordHash, undefined); // sanitized!
  assert.equal(safeUser.email, "newuser@example.com");
  assert.equal(safeUser.role, "customer");

  assert.equal(mockEmail.sentEmails.length, 1);
  assert.equal(mockEmail.sentEmails[0].to, "newuser@example.com");
  assert.ok(insertedToken.tokenHash);
});

test("AuthService.register rejects already registered email", async () => {
  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: "existing-id" }],
        }),
      }),
    }),
  } as any;

  const authService = new AuthService(
    mockDb,
    createMockEmailSender() as any,
    {} as any,
    {} as any,
    {} as any,
    createMockAuditService() as any,
  );

  await assert.rejects(
    async () => await authService.register("already@exists.com", "Password123!"),
    (err: unknown) => err instanceof ConflictException,
  );
});

test("AuthService.login rejects incorrect password with generic UnauthorizedException", async () => {
  const mockUser: UserRecord = {
    id: "user-1",
    email: "user@example.com",
    passwordHash: "argon2id$hash",
    role: "customer",
    status: "active",
    emailVerifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [mockUser],
        }),
      }),
    }),
  } as any;

  const mockHasher = {
    verifyPassword: async () => false, // incorrect
  } as any;

  const authService = new AuthService(
    mockDb,
    createMockEmailSender() as any,
    mockHasher,
    {} as any,
    {} as any,
    createMockAuditService() as any,
  );

  await assert.rejects(
    async () => await authService.login("user@example.com", "WrongPassword"),
    (err: unknown) =>
      err instanceof UnauthorizedException &&
      err.message.includes("Invalid email or password"),
  );
});

test("AuthService.resetPassword revokes all active user sessions", async () => {
  let revokedUserId: string | null = null;
  let updateCalled = false;

  const mockToken = {
    id: "token-1",
    userId: "user-target-id",
    type: "password_reset",
    tokenHash: "somehash",
    expiresAt: new Date(Date.now() + 100000),
    usedAt: null,
  };

  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [mockToken],
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: async () => {
          updateCalled = true;
        },
      }),
    }),
  } as any;

  const mockHasher = {
    hashPassword: async () => "argon2id$newhash",
  } as any;

  const mockSessionService = {
    revokeAllUserSessions: async (userId: string, reason: string) => {
      revokedUserId = userId;
      assert.equal(reason, "password_reset");
    },
  } as any;

  const mockAudit = createMockAuditService();

  const authService = new AuthService(
    mockDb,
    createMockEmailSender() as any,
    mockHasher,
    mockSessionService,
    {} as any,
    mockAudit as any,
  );

  await authService.resetPassword("token123", "NewSecretPassword123!");

  assert.equal(updateCalled, true);
  assert.equal(revokedUserId, "user-target-id");
  assert.equal(mockAudit.events.length, 1);
  assert.equal(mockAudit.events[0].action, "auth.password_reset.completed");
  assert.equal(mockAudit.events[0].failClosed, true);
});

test("AccountService.grantCapability rejects customer accounts", async () => {
  const customerUser: UserRecord = {
    id: "customer-1",
    email: "cust@example.com",
    passwordHash: "hash",
    role: "customer",
    status: "active",
    emailVerifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [customerUser],
        }),
      }),
    }),
  } as any;

  const service = new AccountService(mockDb, {} as any, createMockAuditService() as any);

  await assert.rejects(
    async () => await service.grantCapability("admin-1", "customer-1", "CONTENT_UPLOAD"),
    (err: unknown) =>
      err instanceof ForbiddenException &&
      err.message.includes("Capabilities can only be granted to media_team staff"),
  );
});

test("AccountService.updateAccountStatus rejects reactivating deactivated accounts", async () => {
  const deactivatedUser: UserRecord = {
    id: "user-deactivated",
    email: "deact@example.com",
    passwordHash: "hash",
    role: "customer",
    status: "deactivated",
    emailVerifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [deactivatedUser],
        }),
      }),
    }),
  } as any;

  const service = new AccountService(mockDb, {} as any, createMockAuditService() as any);

  await assert.rejects(
    async () => await service.updateAccountStatus("admin-1", "user-deactivated", "active"),
    (err: unknown) =>
      err instanceof BadRequestException &&
      err.message.includes("Deactivated accounts cannot be modified"),
  );
});
