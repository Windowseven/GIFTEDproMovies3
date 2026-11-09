import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Sse,
  UseGuards,
  type MessageEvent,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { NotificationsService } from "./notifications.service.js";
import { CurrentUser } from "../identity/decorators/index.js";
import { SessionAuthGuard } from "../identity/guards/session-auth.guard.js";
import type { SafeUser } from "../identity/services/auth.service.js";
import type { NotificationRecord } from "../../infrastructure/database/schemas/notifications.schema.js";
import { EventBusService } from "../../infrastructure/events/event-bus.service.js";

@Controller("notifications")
@UseGuards(SessionAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly eventBus: EventBusService,
  ) {}

  @Sse("stream")
  streamNotifications(@CurrentUser() user: SafeUser): Observable<MessageEvent> {
    return new Observable<MessageEvent>((observer) => {
      // 1. Initial connection acknowledgement event with retry directive
      observer.next({
        type: "connected",
        retry: 5000,
        data: {
          connected: true,
          userId: user.id,
          timestamp: new Date().toISOString(),
        },
      });

      // 2. Subscribe to event bus for real-time notification events
      const unsubscribe = this.eventBus.subscribe<{
        eventName: string;
        occurredAt: Date;
        payload: NotificationRecord;
      }>("notification.created", (event) => {
        // Enforce strict tenant isolation / user ownership
        if (event.payload && event.payload.userId === user.id) {
          observer.next({
            type: "notification",
            data: event.payload,
          });
        }
      });

      // 3. Keep-alive heartbeat every 12 seconds to prevent reverse-proxy timeout
      const heartbeatInterval = setInterval(() => {
        try {
          observer.next({
            type: "heartbeat",
            data: { timestamp: new Date().toISOString() },
          });
        } catch {
          // Socket closed
        }
      }, 12000);

      // 4. Teardown logic when client disconnects or stream ends
      return () => {
        clearInterval(heartbeatInterval);
        unsubscribe();
      };
    });
  }

  @Get()
  async listNotifications(
    @CurrentUser() user: SafeUser,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("unreadOnly") unreadOnly?: string,
  ): Promise<{ notifications: NotificationRecord[] }> {
    const parsedLimit = limit ? Math.max(1, parseInt(limit, 10)) : 50;
    const parsedOffset = offset ? Math.max(0, parseInt(offset, 10)) : 0;
    const isUnreadOnly = unreadOnly === "true";

    const notifications = await this.notificationsService.listNotifications(
      user.id,
      parsedLimit,
      parsedOffset,
      isUnreadOnly,
    );

    return { notifications };
  }

  @Get("unread-count")
  async getUnreadCount(@CurrentUser() user: SafeUser): Promise<{ unreadCount: number }> {
    const unreadCount = await this.notificationsService.getUnreadCount(user.id);
    return { unreadCount };
  }

  @Patch(":id/read")
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Param("id") id: string,
    @CurrentUser() user: SafeUser,
  ): Promise<{ notification: NotificationRecord }> {
    const notification = await this.notificationsService.markAsRead(user.id, id);
    return { notification };
  }

  @Post("read-all")
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser() user: SafeUser): Promise<{ markedCount: number }> {
    const markedCount = await this.notificationsService.markAllAsRead(user.id);
    return { markedCount };
  }
}
