import { apiFetch } from './client';

export interface CreateCategoryPayload {
  name: string;
  slug: string;
  description?: string;
  displayOrder?: number;
}

export interface UpdateCategoryPayload {
  name?: string;
  slug?: string;
  description?: string;
  displayOrder?: number;
}

export interface CreateCountryPayload {
  code: string;
  name: string;
  flagEmoji?: string;
}

export interface UpdateCountryPayload {
  code?: string;
  name?: string;
  flagEmoji?: string;
}

export interface CreateDjPayload {
  name: string;
  stageName: string;
  slug: string;
  avatarUrl?: string;
  bio?: string;
  colorHex?: string;
}

export interface UpdateDjPayload {
  name?: string;
  stageName?: string;
  slug?: string;
  avatarUrl?: string;
  bio?: string;
  colorHex?: string;
}

export interface CreateContentPayload {
  codeId: string;
  contentType: 'movie' | 'series';
  title: string;
  originalTitle?: string;
  slug: string;
  releaseYear?: number;
  description?: string;
  posterUrl?: string;
  backdropUrl?: string;
  trailerUrl?: string;
  durationMinutes?: number;
  categoryIds?: string[];
  countryIds?: string[];
}

export interface UpdateContentPayload {
  title?: string;
  originalTitle?: string;
  slug?: string;
  releaseYear?: number;
  description?: string;
  posterUrl?: string;
  backdropUrl?: string;
  trailerUrl?: string;
  durationMinutes?: number;
  categoryIds?: string[];
  countryIds?: string[];
}

export interface CreateMovieEditionPayload {
  djId: string;
  isDefault?: boolean;
}

export const staffCatalogApi = {
  // Taxonomies: Categories
  async createCategory(payload: CreateCategoryPayload) {
    return apiFetch('/staff/taxonomies/categories', {
      method: 'POST',
      body: payload,
    });
  },
  async updateCategory(id: string, payload: UpdateCategoryPayload) {
    return apiFetch(`/staff/taxonomies/categories/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: payload,
    });
  },
  async deactivateCategory(id: string) {
    return apiFetch(`/staff/taxonomies/categories/${encodeURIComponent(id)}/deactivate`, {
      method: 'POST',
    });
  },
  async deleteCategory(id: string) {
    return apiFetch(`/staff/taxonomies/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // Taxonomies: Countries
  async createCountry(payload: CreateCountryPayload) {
    return apiFetch('/staff/taxonomies/countries', {
      method: 'POST',
      body: payload,
    });
  },
  async updateCountry(id: string, payload: UpdateCountryPayload) {
    return apiFetch(`/staff/taxonomies/countries/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: payload,
    });
  },
  async deactivateCountry(id: string) {
    return apiFetch(`/staff/taxonomies/countries/${encodeURIComponent(id)}/deactivate`, {
      method: 'POST',
    });
  },
  async deleteCountry(id: string) {
    return apiFetch(`/staff/taxonomies/countries/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // Taxonomies: DJs
  async createDj(payload: CreateDjPayload) {
    return apiFetch('/staff/taxonomies/djs', {
      method: 'POST',
      body: payload,
    });
  },
  async updateDj(id: string, payload: UpdateDjPayload) {
    return apiFetch(`/staff/taxonomies/djs/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: payload,
    });
  },
  async deactivateDj(id: string) {
    return apiFetch(`/staff/taxonomies/djs/${encodeURIComponent(id)}/deactivate`, {
      method: 'POST',
    });
  },
  async deleteDj(id: string) {
    return apiFetch(`/staff/taxonomies/djs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // Content Lifecycle
  async createContent(payload: CreateContentPayload) {
    return apiFetch('/staff/catalog', {
      method: 'POST',
      body: payload,
    });
  },
  async updateContent(id: string, payload: UpdateContentPayload) {
    return apiFetch(`/staff/catalog/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: payload,
    });
  },
  async submitForReview(id: string) {
    return apiFetch(`/staff/catalog/${encodeURIComponent(id)}/submit`, {
      method: 'POST',
    });
  },
  async publishContent(id: string) {
    return apiFetch(`/staff/catalog/${encodeURIComponent(id)}/publish`, {
      method: 'POST',
    });
  },
  async unpublishContent(id: string) {
    return apiFetch(`/staff/catalog/${encodeURIComponent(id)}/unpublish`, {
      method: 'POST',
    });
  },
  async archiveContent(id: string) {
    return apiFetch(`/staff/catalog/${encodeURIComponent(id)}/archive`, {
      method: 'POST',
    });
  },
  async rejectContent(id: string, rejectionReason: string) {
    return apiFetch(`/staff/catalog/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      body: { rejectionReason },
    });
  },
  async attachMovieEdition(movieId: string, payload: CreateMovieEditionPayload) {
    return apiFetch(`/staff/catalog/movies/${encodeURIComponent(movieId)}/editions`, {
      method: 'POST',
      body: payload,
    });
  },
};
