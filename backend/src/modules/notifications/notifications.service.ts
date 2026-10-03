import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { DRIZZLE_DATABASE } from "../../infrastructure/database/database.tokens.js";
import type { ApplicationDatabase } from "../../infrastructure/database/database.module.js";
import {
  notificationsTable,
  type NotificationRecord,
} from "../../infrastructure/database/schemas/notifications.schema.js";

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
  ) {}

  async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    data?: Record<string, unknown> | null,
  ): Promise<NotificationRecord> {
    const [record] = await this.db
      .insert(notificationsTable)
      .values({
        userId,
        type,
        title,
        message,
        data: data ?? null,
      })
      .returning();

    return record!;
  }

  async listNotifications(
    userId: string,
    limit = 50,
    offset = 0,
    unreadOnly = false,
  ): Promise<NotificationRecord[]> {
    const conditions = [eq(notificationsTable.userId, userId)];
    if (unreadOnly) {
      conditions.push(isNull(notificationsTable.readAt));
    }

    return await this.db
      .select()
      .from(notificationsTable)
      .where(and(...conditions))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(Math.min(limit, 100))
      .offset(offset);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, userId),
          isNull(notificationsTable.readAt),
        ),
      );

    return Number(result[0]?.count ?? 0);
  }

  async markAsRead(userId: string, notificationId: string): Promise<NotificationRecord> {
    const [existing] = await this.db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.id, notificationId),
          eq(notificationsTable.userId, userId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException("Notification not found or access denied");
    }

    const [updated] = await this.db
      .update(notificationsTable)
      .set({ readAt: new Date() })
      .where(eq(notificationsTable.id, notificationId))
      .returning();

    return updated!;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const now = new Date();
    const updated = await this.db
      .update(notificationsTable)
      .set({ readAt: now })
      .where(
        and(
          eq(notificationsTable.userId, userId),
          isNull(notificationsTable.readAt),
        ),
      )
      .returning();

    return updated.length;
  }
}
