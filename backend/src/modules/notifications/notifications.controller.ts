import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { NotificationsService } from "./notifications.service.js";
import { CurrentUser } from "../identity/decorators/index.js";
import { SessionAuthGuard } from "../identity/guards/session-auth.guard.js";
import type { SafeUser } from "../identity/services/auth.service.js";
import type { NotificationRecord } from "../../infrastructure/database/schemas/notifications.schema.js";

@Controller("notifications")
@UseGuards(SessionAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

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
