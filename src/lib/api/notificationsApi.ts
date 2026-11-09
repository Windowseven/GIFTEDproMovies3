import { apiFetch } from './client';
import type { NotificationItem, NotificationsListResponse, UnreadCountResponse } from './types';

export interface ListNotificationsParams {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

export const notificationsApi = {
  async listNotifications(params: ListNotificationsParams = {}): Promise<NotificationItem[]> {
    const searchParams = new URLSearchParams();
    if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params.offset !== undefined) searchParams.set('offset', String(params.offset));
    if (params.unreadOnly !== undefined) searchParams.set('unreadOnly', String(params.unreadOnly));

    const qs = searchParams.toString();
    const endpoint = `/notifications${qs ? `?${qs}` : ''}`;
    const res = await apiFetch<NotificationsListResponse>(endpoint);
    return res.notifications || [];
  },

  async getUnreadCount(): Promise<number> {
    const res = await apiFetch<UnreadCountResponse>('/notifications/unread-count');
    return res.unreadCount ?? 0;
  },

  async markAsRead(id: string): Promise<NotificationItem> {
    const res = await apiFetch<{ notification: NotificationItem }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
    return res.notification;
  },

  async markAllAsRead(): Promise<number> {
    const res = await apiFetch<{ markedCount: number }>('/notifications/read-all', {
      method: 'POST',
    });
    return res.markedCount ?? 0;
  },

  getStreamUrl(): string {
    return '/api/v1/notifications/stream';
  },
};
