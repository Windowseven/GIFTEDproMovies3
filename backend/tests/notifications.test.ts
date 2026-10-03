import assert from "node:assert/strict";
import test from "node:test";
import { NotFoundException } from "@nestjs/common";
import { NotificationsService } from "../src/modules/notifications/notifications.service.js";
import type { NotificationRecord } from "../src/infrastructure/database/schemas/notifications.schema.js";

test("NotificationsService.createNotification inserts and returns notification record", async () => {
  let inserted: any = null;
  const mockDb = {
    insert: () => ({
      values: (vals: any) => {
        inserted = vals;
        return {
          returning: async () => [
            {
              id: "notif-1",
              ...vals,
              readAt: null,
              createdAt: new Date(),
            },
          ],
        };
      },
    }),
  } as any;

  const service = new NotificationsService(mockDb);
  const result = await service.createNotification(
    "user-1",
    "security_alert",
    "New login",
    "You logged in from a new device",
    { ip: "127.0.0.1" },
  );

  assert.equal(result.id, "notif-1");
  assert.equal(inserted.userId, "user-1");
  assert.equal(inserted.type, "security_alert");
  assert.equal(inserted.title, "New login");
  assert.deepEqual(inserted.data, { ip: "127.0.0.1" });
});

test("NotificationsService.getUnreadCount counts unread notifications for user", async () => {
  const mockDb = {
    select: () => ({
      from: () => ({
        where: async () => [{ count: "5" }],
      }),
    }),
  } as any;

  const service = new NotificationsService(mockDb);
  const count = await service.getUnreadCount("user-1");
  assert.equal(count, 5);
});

test("NotificationsService.markAsRead enforces user ownership to prevent BOLA/IDOR", async () => {
  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [], // Empty: not found or owned by another user
        }),
      }),
    }),
  } as any;

  const service = new NotificationsService(mockDb);

  await assert.rejects(
    async () => await service.markAsRead("user-1", "notif-of-another-user"),
    (err: unknown) =>
      err instanceof NotFoundException &&
      err.message.includes("Notification not found or access denied"),
  );
});

test("NotificationsService.markAsRead updates readAt timestamp for owner", async () => {
  const existing: NotificationRecord = {
    id: "notif-1",
    userId: "user-1",
    type: "info",
    title: "Notice",
    message: "Test message",
    data: null,
    readAt: null,
    createdAt: new Date(),
  };

  let updateSetVals: any = null;
  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [existing],
        }),
      }),
    }),
    update: () => ({
      set: (vals: any) => {
        updateSetVals = vals;
        return {
          where: () => ({
            returning: async () => [{ ...existing, ...vals }],
          }),
        };
      },
    }),
  } as any;

  const service = new NotificationsService(mockDb);
  const updated = await service.markAsRead("user-1", "notif-1");

  assert.ok(updated.readAt instanceof Date);
  assert.ok(updateSetVals.readAt instanceof Date);
});

test("NotificationsService.markAllAsRead updates unread records and returns count", async () => {
  const mockDb = {
    update: () => ({
      set: () => ({
        where: () => ({
          returning: async () => [{ id: "n1" }, { id: "n2" }, { id: "n3" }],
        }),
      }),
    }),
  } as any;

  const service = new NotificationsService(mockDb);
  const count = await service.markAllAsRead("user-1");
  assert.equal(count, 3);
});
