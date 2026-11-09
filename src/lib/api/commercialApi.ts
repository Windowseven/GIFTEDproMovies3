import { apiFetch } from './client';
import {
  AccessDecision,
  CustomerLibraryResponse,
  InitiateCheckoutResult,
  OrderRecord,
  PaginatedOrdersResponse,
} from './types';

export const commercialApi = {
  async getMyLibrary(): Promise<CustomerLibraryResponse> {
    return apiFetch<CustomerLibraryResponse>('/commercial/me/library');
  },

  async checkAccess(contentId: string, seasonId?: string, episodeId?: string): Promise<AccessDecision> {
    const params = new URLSearchParams();
    if (seasonId) params.set('seasonId', seasonId);
    if (episodeId) params.set('episodeId', episodeId);
    const qs = params.toString();
    return apiFetch<AccessDecision>(`/commercial/me/access/${encodeURIComponent(contentId)}${qs ? `?${qs}` : ''}`);
  },

  async createOrder(offerId: string, idempotencyKey?: string): Promise<OrderRecord> {
    const key = idempotencyKey || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return apiFetch<OrderRecord>('/orders', {
      method: 'POST',
      body: { offerId, idempotencyKey: key },
    });
  },

  async getCustomerOrders(cursor?: string, limit = 20): Promise<PaginatedOrdersResponse> {
    const qs = new URLSearchParams();
    if (cursor) qs.set('cursor', cursor);
    if (limit) qs.set('limit', String(limit));
    const query = qs.toString();
    return apiFetch<PaginatedOrdersResponse>(`/orders${query ? `?${query}` : ''}`);
  },

  async getOrder(orderId: string): Promise<OrderRecord> {
    return apiFetch<OrderRecord>(`/orders/${encodeURIComponent(orderId)}`);
  },

  async initiateCheckout(
    orderId: string,
    phoneNumber?: string,
    returnUrl?: string,
    cancelUrl?: string,
  ): Promise<InitiateCheckoutResult> {
    return apiFetch<InitiateCheckoutResult>(`/orders/${encodeURIComponent(orderId)}/checkout`, {
      method: 'POST',
      body: {
        phoneNumber,
        returnUrl: returnUrl || (typeof window !== 'undefined' ? `${window.location.origin}/library` : undefined),
        cancelUrl: cancelUrl || (typeof window !== 'undefined' ? `${window.location.origin}/movies` : undefined),
      },
    });
  },

  async listOffers(): Promise<unknown[]> {
    return apiFetch<unknown[]>('/commercial/offers');
  },
};
