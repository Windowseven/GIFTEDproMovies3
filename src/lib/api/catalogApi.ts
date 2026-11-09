import { apiFetch } from './client';
import {
  CustomerMovieDetail,
  CustomerTitleCard,
  PaginatedResult,
  PublicTaxonomiesResponse,
} from './types';

export interface CatalogTitlesQuery {
  cursor?: string;
  limit?: number;
  type?: 'movie' | 'series';
  kind?: 'movie' | 'series';
  categoryId?: string;
  countryId?: string;
  djId?: string;
  djProfileId?: string;
}

export const catalogApi = {
  async listTitles(query: CatalogTitlesQuery = {}): Promise<PaginatedResult<CustomerTitleCard>> {
    const params = new URLSearchParams();
    if (query.cursor) params.set('cursor', query.cursor);
    if (query.limit) params.set('limit', String(query.limit));
    const typeVal = query.type || query.kind;
    if (typeVal) params.set('type', typeVal);
    if (query.categoryId) params.set('categoryId', query.categoryId);
    if (query.countryId) params.set('countryId', query.countryId);
    const djVal = query.djId || query.djProfileId;
    if (djVal) params.set('djId', djVal);

    const qs = params.toString();
    return apiFetch<PaginatedResult<CustomerTitleCard>>(`/catalog/titles${qs ? `?${qs}` : ''}`);
  },

  async getTitleBySlug(slug: string): Promise<CustomerMovieDetail> {
    return apiFetch<CustomerMovieDetail>(`/catalog/titles/${encodeURIComponent(slug)}`);
  },

  async getTaxonomies(): Promise<PublicTaxonomiesResponse> {
    return apiFetch<PublicTaxonomiesResponse>('/catalog/taxonomies');
  },

  async searchTitles(q: string, limit = 20, cursor?: string): Promise<PaginatedResult<CustomerTitleCard>> {
    const params = new URLSearchParams({ q });
    if (limit) params.set('limit', String(limit));
    if (cursor) params.set('cursor', cursor);

    return apiFetch<PaginatedResult<CustomerTitleCard>>(`/catalog/search?${params.toString()}`);
  },
};
