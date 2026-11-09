import { apiFetch } from './client';

export interface AuditEventItem {
  id: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface PaginatedAuditEventsResponse {
  items: AuditEventItem[];
  nextCursor: string | null;
}

export interface QueryAuditEventsParams {
  limit?: number;
  cursor?: string;
  actorId?: string;
  action?: string;
  resourceType?: string;
}

export interface AccessPlanRecord {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanVersionRecord {
  id: string;
  accessPlanId: string;
  versionNumber: number;
  durationValue: number;
  durationUnit: 'HOUR' | 'DAY';
  downloadLimit?: number;
  downloadLimitType?: string;
  deviceLimit?: number;
  concurrentStreamLimit?: number;
  createdAt: string;
}

export interface OfferRecord {
  id: string;
  code: string;
  name: string;
  status: 'draft' | 'active' | 'inactive' | 'archived';
  startsAt: string;
  endsAt?: string | null;
  targetKind: 'MOVIE' | 'SERIES' | 'SEASON' | 'EPISODE' | 'CATALOG';
  targetMovieContentId?: string | null;
  planVersionId: string;
  priceTzs: number;
  catalogPolicyType?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const adminApi = {
  // Audit Logs
  async getAuditEvents(params: QueryAuditEventsParams = {}): Promise<PaginatedAuditEventsResponse> {
    const qs = new URLSearchParams();
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.cursor) qs.set('cursor', params.cursor);
    if (params.actorId) qs.set('actorId', params.actorId);
    if (params.action) qs.set('action', params.action);
    if (params.resourceType) qs.set('resourceType', params.resourceType);

    const queryStr = qs.toString();
    return apiFetch<PaginatedAuditEventsResponse>(`/admin/audit${queryStr ? `?${queryStr}` : ''}`);
  },

  // Commercial Access Plans
  async listAccessPlans(): Promise<AccessPlanRecord[]> {
    return apiFetch<AccessPlanRecord[]>('/admin/commercial/access-plans');
  },
  async createAccessPlan(body: { code: string; name: string }): Promise<AccessPlanRecord> {
    return apiFetch<AccessPlanRecord>('/admin/commercial/access-plans', {
      method: 'POST',
      body,
    });
  },

  // Commercial Plan Versions
  async listPlanVersions(accessPlanId?: string): Promise<PlanVersionRecord[]> {
    const query = accessPlanId ? `?accessPlanId=${encodeURIComponent(accessPlanId)}` : '';
    return apiFetch<PlanVersionRecord[]>(`/admin/commercial/plan-versions${query}`);
  },
  async createPlanVersion(body: Record<string, unknown>): Promise<PlanVersionRecord> {
    return apiFetch<PlanVersionRecord>('/admin/commercial/plan-versions', {
      method: 'POST',
      body,
    });
  },

  // Commercial Offers
  async listOffers(): Promise<OfferRecord[]> {
    return apiFetch<OfferRecord[]>('/admin/commercial/offers');
  },
  async createOffer(body: Record<string, unknown>): Promise<OfferRecord> {
    return apiFetch<OfferRecord>('/admin/commercial/offers', {
      method: 'POST',
      body,
    });
  },
  async updateOfferStatus(id: string, status: string): Promise<OfferRecord> {
    return apiFetch<OfferRecord>(`/admin/commercial/offers/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: { status },
    });
  },

  // User Administration
  async getUser(id: string) {
    return apiFetch(`/admin/users/${encodeURIComponent(id)}`);
  },
  async updateUserStatus(id: string, status: string) {
    return apiFetch(`/admin/users/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: { status },
    });
  },
  async updateUserRole(id: string, role: string) {
    return apiFetch(`/admin/users/${encodeURIComponent(id)}/role`, {
      method: 'PATCH',
      body: { role },
    });
  },
};
