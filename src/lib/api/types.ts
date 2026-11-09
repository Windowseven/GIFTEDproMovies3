/**
 * Authoritative Backend API Data Types
 * Coordinated with backend Fastify/NestJS schemas
 */

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
}

export class ApiError extends Error {
  statusCode: number;
  errorName: string;
  retryAfter?: number;
  details?: string | string[];

  constructor(statusCode: number, errorName: string, message: string | string[], retryAfter?: number) {
    const formattedMsg = Array.isArray(message) ? message.join(', ') : message;
    super(formattedMsg);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorName = errorName;
    this.retryAfter = retryAfter;
    this.details = message;
  }
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'customer' | 'media_team' | 'admin';
  status: 'active' | 'pending_verification' | 'suspended' | 'deactivated';
  emailVerified: boolean;
  createdAt?: string;
}

export interface SessionInfo {
  id: string;
  expiresAt: string;
  lastActiveAt: string;
}

export interface AuthMeResponse {
  user: UserProfile;
  session: SessionInfo;
  capabilities: string[];
}

export interface DeviceRecord {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: string;
  deviceIdentifier?: string;
  lastActiveAt?: string;
  createdAt: string;
}

export interface DeviceListResponse {
  devices: DeviceRecord[];
  effectiveLimit: number;
  currentCount: number;
  remainingSlots: number;
}

export interface TaxonomyCategory {
  id: string;
  name: string;
  slug: string;
}

export interface TaxonomyCountry {
  id: string;
  code: string;
  name: string;
  flagEmoji?: string;
}

export interface TaxonomyVoiceArtist {
  id: string;
  stageName: string;
  slug: string;
  avatarUrl?: string | null;
}

export interface PublicTaxonomiesResponse {
  categories: TaxonomyCategory[];
  countries: TaxonomyCountry[];
  voiceArtists: TaxonomyVoiceArtist[];
}

export interface TitleEdition {
  id: string;
  isDefault: boolean;
  dj: TaxonomyVoiceArtist;
}

export interface CustomerTitleCard {
  id: string;
  codeId: string;
  contentType: 'movie' | 'series';
  title: string;
  originalTitle?: string | null;
  slug: string;
  releaseYear: number;
  description?: string | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  trailerUrl?: string | null;
  durationMinutes: number;
  publishedAt: string;
  categories: TaxonomyCategory[];
  countries: TaxonomyCountry[];
}

export interface CustomerMovieDetail extends CustomerTitleCard {
  editions: TitleEdition[];
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string | null;
  hasMore: boolean;
}

export interface CustomerLibraryItem {
  id: string;
  targetKind: 'MOVIE' | 'SERIES' | 'SEASON' | 'EPISODE' | 'CATALOG';
  targetMovieContentId: string | null;
  targetSeriesContentId: string | null;
  targetSeasonId: string | null;
  targetEpisodeId: string | null;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  startsAt: string;
  expiresAt: string;
}

export interface CustomerCatalogGrantItem {
  id: string;
  orderId: string;
  validFrom: string;
  validUntil: string;
  policyType: string;
  status: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'REVOKED';
  revocationReason?: string | null;
}

export interface CustomerLibraryResponse {
  customerId: string;
  exactEntitlements: CustomerLibraryItem[];
  catalogGrants: CustomerCatalogGrantItem[];
  hasActiveCatalogAccess: boolean;
}

export interface AccessDecision {
  granted: boolean;
  decision: string;
  reason: string;
  periodEnd?: string;
}

export interface OrderItemRecord {
  id: string;
  orderId: string;
  offerId: string;
  priceAmountTzs: number;
}

export interface OrderRecord {
  id: string;
  customerId: string;
  orderReference: string;
  status: 'PENDING_PAYMENT' | 'PAID' | 'FAILED' | 'CANCELLED';
  totalAmountTzs: number;
  currency: string;
  createdAt: string;
}

export interface InitiateCheckoutResult {
  attemptId: string;
  attemptNumber: number;
  orderId: string;
  orderReference: string;
  paymentMode: 'HOSTED_CHECKOUT' | 'ASYNC_PROMPT';
  checkoutUrl?: string;
  statusUrl?: string;
  providerOrderId?: string;
  amountTzs: number;
  currency: 'TZS';
  status: string;
  expiresAt: string;
}

export interface DownloadAuthorizeResult {
  authorized: boolean;
  downloadUrl: string;
  downloadToken: string;
  expiresAt: string;
  expiresInSeconds: number;
  attemptId: string;
  targetKind: string;
  isRetry: boolean;
  fileName?: string;
  fileSizeBytes?: number;
  contentId?: string;
  editionId?: string;
  downloadLimit?: number;
  downloadLimitType?: string;
}

export interface DownloadLicenseItem {
  entitlementId: string;
  orderId: string;
  targetKind: string;
  contentId: string;
  title: string;
  slug: string;
  posterUrl?: string | null;
  startsAt: string;
  expiresAt: string;
  downloadLimit: number | null;
  downloadLimitType: string | null;
  quotaRemaining: number | null;
  hasCompletedDownload: boolean;
  latestAttemptStatus?: string | null;
}

export interface DownloadLicensesResponse {
  licenses: DownloadLicenseItem[];
}

export interface ReportDownloadDeliveryResult {
  attemptId: string;
  status: 'COMPLETED' | 'FAILED';
  retryEligible: boolean;
  retryGraceExpiresAt?: string | null;
}

export interface CustomerOrderSummary {
  id: string;
  status: 'PENDING_PAYMENT' | 'PAID' | 'FAILED' | 'CANCELLED';
  planName?: string;
  planCode?: string;
  targetKind: string;
  targetMovieContentId: string | null;
  targetSeriesContentId: string | null;
  targetSeasonId: string | null;
  targetEpisodeId: string | null;
  planVersionId: string;
  amountTzs: number;
  durationValue: number;
  durationUnit: string;
  createdAt: string;
  updatedAt: string;
  paymentAttempt?: {
    status: string;
    providerName: string;
    amountTzs: number;
  } | null;
  fulfillment?: {
    status: string;
    completedAt: string | null;
  } | null;
}

export interface PaginatedOrdersResponse {
  items: CustomerOrderSummary[];
  nextCursor: string | null;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationsListResponse {
  notifications: NotificationItem[];
}

export interface UnreadCountResponse {
  unreadCount: number;
}

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
