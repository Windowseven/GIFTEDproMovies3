import { apiFetch } from './client';
import type { PaginatedAuditEventsResponse } from './types';

export interface QueryAuditEventsParams {
  limit?: number;
  cursor?: string;
  actorId?: string;
  resourceType?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}

export const auditApi = {
  async getAuditEvents(params: QueryAuditEventsParams = {}): Promise<PaginatedAuditEventsResponse> {
    const searchParams = new URLSearchParams();
    if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params.cursor) searchParams.set('cursor', params.cursor);
    if (params.actorId) searchParams.set('actorId', params.actorId);
    if (params.resourceType) searchParams.set('resourceType', params.resourceType);
    if (params.action) searchParams.set('action', params.action);
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);

    const qs = searchParams.toString();
    const endpoint = `/admin/audit${qs ? `?${qs}` : ''}`;
    return apiFetch<PaginatedAuditEventsResponse>(endpoint);
  },
};
