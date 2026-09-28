import {
  AdminMovie,
  AdminSeries,
  AdminDJ,
  AdminCategory,
  AdminCountry,
  SubscriptionPlanConfig,
  PaymentMethod,
} from '@/types/admin';

export type MovieItem = AdminMovie;
export type SeriesItem = AdminSeries;
export type DjItem = AdminDJ;
export type CategoryItem = AdminCategory;
export type CountryItem = AdminCountry;
export type SubscriptionPlan = SubscriptionPlanConfig;

export interface ContinueWatchingItem {
  id: string;
  movieId: string;
  title: string;
  posterUrl: string;
  backdropUrl: string;
  slug: string;
  progressPercent: number;
  durationMinutes: number;
  djName: string;
  lastWatchedAt: string;
}

export interface CustomerEntitlement {
  id: string;
  itemTitle: string;
  itemSlug: string;
  itemType: 'movie' | 'series' | 'subscription';
  accessType: 'stream' | 'download' | 'vip_pass';
  djName?: string;
  expiresAt: string;
  isActive: boolean;
  orderNumber: string;
  amountTsh: number;
}

export interface CustomerProfile {
  id: string;
  fullName: string;
  email: string;
  phoneMasked: string;
  isVip: boolean;
  vipTierName?: string;
  vipExpiresAt?: string;
  avatarUrl?: string;
}

export interface SearchResultGroup {
  movies: MovieItem[];
  series: SeriesItem[];
  djs: DjItem[];
  categories: CategoryItem[];
}
