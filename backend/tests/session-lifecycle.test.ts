import assert from "node:assert/strict";
import test from "node:test";
import { SessionService } from "../src/modules/identity/services/session.service.js";
import { hashToken } from "../src/modules/identity/utils/token.utils.js";
import type { SessionRecord } from "../src/infrastructure/database/schemas/sessions.schema.js";
import type { UserRecord } from "../src/infrastructure/database/schemas/users.schema.js";

function createMockAuditService() {
  const events: any[] = [];
  return {
    events,
    recordEvent: async (event: any) => {
      events.push(event);
    },
  };
}

test("SessionService.createSession generates 256-bit token, persists hash, and sets 30-day absolute expiry", async () => {
  let insertedValues: any = null;
  const mockDb = {
    insert: () => ({
      values: (vals: any) => {
        insertedValues = vals;
        return {
          returning: async () => [
            {
              id: "session-uuid-1",
              ...vals,
              createdAt: new Date(),
            },
          ],
        };
      },
    }),
  } as any;

  const mockAudit = createMockAuditService();
  const service = new SessionService(mockDb, mockAudit as any);

  const { session, rawToken } = await service.createSession(
    "user-uuid-1",
    "device-uuid-1",
    "127.0.0.1",
    "TestBrowser/1.0",
  );

  assert.equal(typeof rawToken, "string");
  assert.equal(rawToken.length, 64);
  assert.equal(session.id, "session-uuid-1");
  assert.equal(insertedValues.tokenHash, hashToken(rawToken));
  assert.equal(insertedValues.userId, "user-uuid-1");
  assert.equal(insertedValues.deviceId, "device-uuid-1");
  assert.equal(insertedValues.ipAddress, "127.0.0.1");

  // Verify 30-day absolute expiration
  const diffMs = session.expiresAt.getTime() - session.lastActiveAt.getTime();
  assert.ok(diffMs >= 30 * 24 * 60 * 60 * 1000 - 5000);
  assert.ok(diffMs <= 30 * 24 * 60 * 60 * 1000 + 5000);

  assert.equal(mockAudit.events.length, 1);
  assert.equal(mockAudit.events[0].action, "session.created");
});

test("SessionService.resolveSession enforces 14-day inactivity timeout", async () => {
  const rawToken = "sample-raw-token-1234567890123456";
  const now = new Date();
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
  const futureAbsolute = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

  const mockSession: SessionRecord = {
    id: "session-uuid-inactive",
    userId: "user-1",
    deviceId: null,
    tokenHash: hashToken(rawToken),
    lastActiveAt: fifteenDaysAgo,
    expiresAt: futureAbsolute,
    revokedAt: null,
    revokedReason: null,
    ipAddress: null,
    userAgent: null,
    createdAt: fifteenDaysAgo,
  };

  const mockUser: UserRecord = {
    id: "user-1",
    email: "user@example.com",
    passwordHash: "hash",
    role: "customer",
    status: "active",
    emailVerifiedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  let updateCalledWithReason: string | null = null;
  const mockDb = {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            limit: async () => [{ session: mockSession, user: mockUser }],
          }),
        }),
      }),
    }),
    update: () => ({
      set: (vals: any) => {
        updateCalledWithReason = vals.revokedReason;
        return {
          where: () => ({
            returning: async () => [{ ...mockSession, ...vals }],
          }),
        };
      },
    }),
  } as any;

  const mockAudit = createMockAuditService();
  const service = new SessionService(mockDb, mockAudit as any);

  const resolved = await service.resolveSession(rawToken);
  assert.equal(resolved, null);
  assert.equal(updateCalledWithReason, "inactivity_timeout_expired");
});

test("SessionService.resolveSession enforces non-extensible 30-day absolute timeout", async () => {
  const rawToken = "sample-raw-token-active-recently";
  const now = new Date();
  const pastAbsolute = new Date(now.getTime() - 1000); // Expired absolute timeout
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000); // Active recently

  const mockSession: SessionRecord = {
    id: "session-uuid-absolute-expired",
    userId: "user-1",
    deviceId: null,
    tokenHash: hashToken(rawToken),
    lastActiveAt: oneMinuteAgo, // active recently!
    expiresAt: pastAbsolute, // but absolute expiry reached!
    revokedAt: null,
    revokedReason: null,
    ipAddress: null,
    userAgent: null,
    createdAt: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000),
  };

  const mockUser: UserRecord = {
    id: "user-1",
    email: "user@example.com",
    passwordHash: "hash",
    role: "customer",
    status: "active",
    emailVerifiedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  let updateCalledWithReason: string | null = null;
  const mockDb = {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            limit: async () => [{ session: mockSession, user: mockUser }],
          }),
        }),
      }),
    }),
    update: () => ({
      set: (vals: any) => {
        updateCalledWithReason = vals.revokedReason;
        return {
          where: () => ({
            returning: async () => [{ ...mockSession, ...vals }],
          }),
        };
      },
    }),
  } as any;

  const mockAudit = createMockAuditService();
  const service = new SessionService(mockDb, mockAudit as any);

  const resolved = await service.resolveSession(rawToken);
  assert.equal(resolved, null);
  assert.equal(updateCalledWithReason, "absolute_timeout_expired");
});

test("SessionService.touchSession throttles updates to 15 minutes", async () => {
  let updateCalled = false;
  const mockDb = {
    update: () => ({
      set: () => ({
        where: async () => {
          updateCalled = true;
        },
      }),
    }),
  } as any;

  const service = new SessionService(mockDb, createMockAuditService() as any);

  // 1. Touch within 5 minutes -> no-op
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  await service.touchSession("session-1", fiveMinutesAgo);
  assert.equal(updateCalled, false);

  // 2. Touch after 16 minutes -> updates
  const sixteenMinutesAgo = new Date(Date.now() - 16 * 60 * 1000);
  await service.touchSession("session-1", sixteenMinutesAgo);
  assert.equal(updateCalled, true);
});

test("SessionService.rotateSession revokes old session and returns fresh session", async () => {
  const oldSession: SessionRecord = {
    id: "session-old",
    userId: "user-1",
    deviceId: "device-1",
    tokenHash: "old-hash",
    lastActiveAt: new Date(),
    expiresAt: new Date(Date.now() + 100000),
    revokedAt: null,
    revokedReason: null,
    ipAddress: "1.1.1.1",
    userAgent: "UA",
    createdAt: new Date(),
  };

  let revokedId: string | null = null;
  let newSessionInserted: any = null;

  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [oldSession],
        }),
      }),
    }),
    update: () => ({
      set: (vals: any) => ({
        where: () => ({
          returning: async () => {
            revokedId = oldSession.id;
            return [{ ...oldSession, ...vals }];
          },
        }),
      }),
    }),
    insert: () => ({
      values: (vals: any) => {
        newSessionInserted = vals;
        return {
          returning: async () => [
            {
              id: "session-new",
              ...vals,
              createdAt: new Date(),
            },
          ],
        };
      },
    }),
  } as any;

  const mockAudit = createMockAuditService();
  const service = new SessionService(mockDb, mockAudit as any);

  const { session: newSession, rawToken } = await service.rotateSession(
    "session-old",
    "privilege_elevation",
  );

  assert.equal(revokedId, "session-old");
  assert.equal(newSession.id, "session-new");
  assert.equal(newSessionInserted.userId, "user-1");
  assert.equal(newSessionInserted.deviceId, "device-1");
  assert.ok(typeof rawToken === "string");
});
