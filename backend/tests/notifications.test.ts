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

test("NotificationsService.createNotification publishes notification.created event to EventBusService", async () => {
  const publishedEvents: any[] = [];
  const mockEventBus = {
    publish: (event: any) => {
      publishedEvents.push(event);
    },
  } as any;

  const mockDb = {
    insert: () => ({
      values: (vals: any) => ({
        returning: async () => [
          {
            id: "notif-realtime-1",
            ...vals,
            readAt: null,
            createdAt: new Date(),
          },
        ],
      }),
    }),
  } as any;

  const service = new NotificationsService(mockDb, mockEventBus);
  const created = await service.createNotification(
    "user-1",
    "TEST_ALERT",
    "Real-time alert",
    "Testing SSE delivery",
  );

  assert.equal(created.id, "notif-realtime-1");
  assert.equal(publishedEvents.length, 1);
  assert.equal(publishedEvents[0].eventName, "notification.created");
  assert.equal(publishedEvents[0].payload.userId, "user-1");
  assert.equal(publishedEvents[0].payload.title, "Real-time alert");
});

test("NotificationsController.streamNotifications emits connected event and isolates by userId", async () => {
  const { NotificationsController } = await import("../src/modules/notifications/notifications.controller.js");
  const listeners: Record<string, ((event: any) => void)[]> = {};
  let unsubscribed = false;

  const mockEventBus = {
    subscribe: (eventName: string, handler: (event: any) => void) => {
      if (!listeners[eventName]) listeners[eventName] = [];
      listeners[eventName].push(handler);
      return () => {
        unsubscribed = true;
      };
    },
  } as any;

  const mockService = {} as any;
  const controller = new NotificationsController(mockService, mockEventBus);

  const currentUser = { id: "user-target-1", email: "user@example.com", role: "customer", status: "active", emailVerifiedAt: new Date() } as any;
  const observable = controller.streamNotifications(currentUser);

  const receivedEvents: any[] = [];
  const subscription = observable.subscribe({
    next: (event) => receivedEvents.push(event),
  });

  // 1. Initial event is connected
  assert.equal(receivedEvents.length, 1);
  assert.equal(receivedEvents[0].type, "connected");
  assert.equal(receivedEvents[0].data.connected, true);
  assert.equal(receivedEvents[0].data.userId, "user-target-1");

  // 2. Dispatch event for another user (should be filtered out)
  const handlers = listeners["notification.created"] || [];
  for (const h of handlers) {
    h({
      eventName: "notification.created",
      occurredAt: new Date(),
      payload: { id: "n-other", userId: "user-different-2", title: "Wrong user" },
    });
  }
  assert.equal(receivedEvents.length, 1, "Foreign user event must be ignored");

  // 3. Dispatch event for matching user (should be received)
  for (const h of handlers) {
    h({
      eventName: "notification.created",
      occurredAt: new Date(),
      payload: { id: "n-mine", userId: "user-target-1", title: "My alert" },
    });
  }
  assert.equal(receivedEvents.length, 2);
  assert.equal(receivedEvents[1].type, "notification");
  assert.equal(receivedEvents[1].data.title, "My alert");

  // 4. Teardown
  subscription.unsubscribe();
  assert.equal(unsubscribed, true, "Teardown must unsubscribe from event bus");
});

