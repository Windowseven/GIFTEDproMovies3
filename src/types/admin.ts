export type PaymentMethod = 'mpesa' | 'tigo' | 'airtel' | 'halopesa' | 'card';

export type PaymentStatus = 'successful' | 'pending' | 'failed' | 'refunded';

export type OrderStatus = 'completed' | 'processing' | 'pending' | 'cancelled';

export type PurchaseType =
  | 'subscription'
  | 'vip_pass'
  | 'ppv_stream'
  | 'ppv_download'
  | 'series_episode'
  | 'series_season'
  | 'series_bundle';

export type CustomerStatus = 'active' | 'suspended' | 'flagged';
export type UserStatus = CustomerStatus; // alias for backwards compatibility

export type ContentPublishStatus = 'published' | 'draft' | 'archived' | 'pending_review';
export type ContentStatus = 'live' | 'draft' | 'archived'; // alias for compatibility

export type MediaReadyStatus = 'streaming_ready' | 'download_ready' | 'processing' | 'unavailable';

export interface AdminKPIs {
  revenueToday: number;
  revenueTodayGrowthPercent: number;
  revenueThisMonth: number;
  revenueThisMonthGrowthPercent?: number;
  revenueMonthlyTarget: number;
  monthlyTargetPercent: number;
  totalOrders: number;
  orderSuccessRatePercent: number;
  activeSubscriptions: number;
  totalCustomers: number;
  totalMovies: number;
  totalSeries: number;
  totalDjs: number;
  totalViews: number;
  totalDownloads: number;
  // Compatibility helpers
  successfulTransactions?: number;
  successRatePercent?: number;
  pendingSettlementAmount?: number;
  totalDjTracks?: number;
}

export interface RevenueMixItem {
  key: string;
  label: string;
  amountTsh: number;
  percent: number;
  colorHex: string;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhoneMasked: string;
  itemTitle: string;
  itemType: PurchaseType;
  purchaseTypeLabel: string;
  amountTsh: number;
  paymentMethod: PaymentMethod;
  paymentMethodLabel: string;
  status: OrderStatus;
  statusLabel: string;
  createdAt: string;
  djName?: string;
  accessExpiresAt?: string;
}

export interface AdminPaymentRecord {
  id: string;
  referenceNo: string;
  orderNumber: string;
  customerName: string;
  customerPhoneMasked: string;
  amountTsh: number;
  method: PaymentMethod;
  methodLabel: string;
  status: PaymentStatus;
  statusLabel: string;
  timestamp: string;
}

// Backwards compatibility alias for TransactionRecord
export interface TransactionRecord {
  id: string;
  referenceNo: string;
  customerPhoneMasked: string;
  customerName?: string;
  contentTitle?: string;
  purchaseType: PurchaseType;
  purchaseTypeName: string;
  provider: PaymentMethod | string;
  providerName: string;
  amountTsh: number;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  statusText: string;
  timestampFormatted: string;
  djName?: string;
}

export interface MovieVersion {
  id: string;
  djId: string;
  djName: string;
  streamingPriceTsh: number;
  downloadPriceTsh: number;
  accessDurationHours: number;
  streamingStatus: MediaReadyStatus;
  downloadStatus: MediaReadyStatus;
  streamingFileName?: string;
  downloadFileName?: string;
  isDefault: boolean;
}

export interface AdminMovie {
  id: string;
  title: string;
  originalTitle: string;
  slug: string;
  releaseYear: number;
  durationMinutes: number;
  posterUrl: string;
  backdropUrl: string;
  trailerUrl?: string;
  description: string;
  genres: string[];
  countries: string[];
  ageRating: string;
  rating: number;
  streamingStatus: MediaReadyStatus;
  downloadStatus: MediaReadyStatus;
  status: ContentPublishStatus;
  isFeatured: boolean;
  isTrending: boolean;
  versions: MovieVersion[];
  viewsCount: number;
  purchasesCount: number;
  downloadsCount: number;
  publishedAt: string;
  // Compatibility
  streamPriceTsh?: number;
  downloadPriceTsh?: number;
  availableDjs?: string[];
  isFeaturedBillboard?: boolean;
  isTrendingRank1?: boolean;
  isDjFavorite?: boolean;
  publishedDateFormatted?: string;
  hlsStatus?: 'tayari' | 'inachakata' | 'hitilafu';
  hlsResolution?: string;
  uploadedBy?: {
    id: string;
    name: string;
    email: string;
    at: string;
  };
  lastEditedBy?: {
    id: string;
    name: string;
    at: string;
  };
  approvedBy?: {
    id: string;
    name: string;
    at: string;
  };
}

// Backwards compatibility alias
export type AdminMovieItem = AdminMovie;

export interface AdminEpisode {
  id: string;
  episodeNumber: number;
  title: string;
  durationMinutes: number;
  description: string;
  thumbnailUrl?: string;
  streamingStatus: MediaReadyStatus;
  downloadStatus: MediaReadyStatus;
  streamPriceTsh: number;
  downloadPriceTsh: number;
  status: ContentPublishStatus;
  viewsCount?: number;
}

export interface AdminSeason {
  id: string;
  seasonNumber: number;
  title: string;
  seasonPassPriceTsh: number;
  episodes: AdminEpisode[];
}

export interface AdminSeries {
  id: string;
  title: string;
  slug: string;
  releaseYear: number;
  seasonsCount: number;
  episodesCount: number;
  posterUrl: string;
  backdropUrl: string;
  genres: string[];
  countries: string[];
  pricingModel: 'per_episode' | 'per_season' | 'full_series' | 'combination';
  status: ContentPublishStatus;
  isFeatured: boolean;
  isTrending: boolean;
  totalStreams: number;
  publishedAt: string;
  leadDjName?: string;
  defaultEpisodeStreamPriceTsh?: number;
  defaultEpisodeDownloadPriceTsh?: number;
  seasons?: AdminSeason[];
  uploadedBy?: {
    id: string;
    name: string;
    email: string;
    at: string;
  };
  lastEditedBy?: {
    id: string;
    name: string;
    at: string;
  };
  approvedBy?: {
    id: string;
    name: string;
    at: string;
  };
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  displayOrder: number;
  contentCount: number;
  isActive: boolean;
}

export interface AdminCountry {
  id: string;
  code: string;
  name: string;
  flagEmoji: string;
  contentCount: number;
  isActive: boolean;
}

export interface AdminDJ {
  id: string;
  name: string;
  stageName: string;
  slug: string;
  avatarUrl: string;
  bio: string;
  tier: string;
  contractType: string;
  activeTitlesCount: number;
  totalStreams: number;
  status: 'active' | 'inactive';
  colorHex: string;
}

// Backwards compatibility alias
export interface DJRoyaltyConfig {
  djId: string;
  djName: string;
  tagline: string;
  tier: string;
  contractType: string;
  sharePercent: number;
  colorHex: string;
  moviesCount?: number;
  totalListens?: number;
  rating?: number;
}

export interface FeaturedItem {
  id: string;
  contentId: string;
  contentType: 'movie' | 'series';
  title: string;
  backdropUrl: string;
  posterUrl: string;
  category: string;
  displayOrder: number;
  placement: 'billboard' | 'spotlight' | 'rail';
  isActive: boolean;
  startedAt: string;
}

export interface TrendingItem {
  id: string;
  contentId: string;
  contentType: 'movie' | 'series';
  title: string;
  posterUrl: string;
  rank: number;
  viewsVelocity: number;
  isManuallyPromoted: boolean;
  category: string;
}

export interface CustomerDevice {
  id: string;
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'tv' | 'desktop';
  lastActive: string;
  isCurrent?: boolean;
}

// Backwards compatibility alias
export type DeviceRecord = CustomerDevice;

export interface AdminCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatarUrl?: string;
  vipTier: 'VIP Ultra' | 'Weekly Pass' | 'Daily Pass' | 'Free User' | string;
  isVip: boolean;
  activePassName?: string;
  passExpiresAt?: string;
  totalSpentTsh: number;
  moviesPurchasedCount: number;
  ordersCount: number;
  registeredDateFormatted: string;
  lastActiveFormatted: string;
  status: CustomerStatus;
  primaryPaymentMethod: PaymentMethod;
  devices: CustomerDevice[];
  purchasedMovieIds: string[];
  // Compatibility
  primaryTelco?: string;
}

export interface MediaTeamStaff {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  status: 'active' | 'inactive';
  assignedContentCount: number;
  isFullAccess?: boolean;
  canUpload: boolean;
  canEditMetadata: boolean;
  canManagePricing?: boolean;
  canPublish: boolean;
  lastActive: string;
}

export type MediaAuditAction =
  | 'UPLOAD_MASTER'
  | 'UPDATE_METADATA'
  | 'UPDATE_PRICING'
  | 'SUBMIT_REVIEW'
  | 'PUBLISH_LIVE'
  | 'REJECT'
  | 'STATUS_CHANGE';

export interface MediaAuditLog {
  id: string;
  timestamp: string;
  operatorId: string;
  operatorName: string;
  operatorAvatar?: string;
  action: MediaAuditAction;
  actionLabel: string;
  contentId: string;
  contentTitle: string;
  contentType: 'movie' | 'series';
  details: string;
}

export interface SubscriptionPlanConfig {
  id: string;
  name: string;
  badge?: string;
  durationDays: number;
  durationLabel: string;
  priceTsh: number;
  isPopular?: boolean;
  isBestValue?: boolean;
  features: string[];
  status: 'active' | 'inactive';
  // Compatibility
  currentPriceTsh?: number;
  specs?: string;
  durationCode?: string;
}

// Backwards compatibility alias
export type SubscriptionPassConfig = SubscriptionPlanConfig;

export interface PPVRateTier {
  id: string;
  categoryName: string;
  badge?: string;
  streamPriceTsh: number;
  downloadPriceTsh: number;
  accessDurationHours: number;
  unitLabel?: string;
  description: string;
  status: 'active' | 'inactive';
  isFreePromotion?: boolean;
  freeCount?: number;
}

// Backwards compatibility alias
export type PPVRateConfig = PPVRateTier;

export interface SalesTrend {
  period: string;
  revenueTsh: number;
  ordersCount: number;
  subscriptionRevenueTsh: number;
  ppvRevenueTsh: number;
  moviesRevenueTsh?: number;
  seriesRevenueTsh?: number;
}

export interface MonthSalesData {
  monthId: string; // e.g. "2026-09"
  monthLabel: string; // e.g. "September 2026"
  isCurrent?: boolean;
  totalIncomeTsh: number;
  growthPercentVsLastMonth?: number;
  vipPassesIncomeTsh: number;
  vipPassesPercent: number;
  moviesIncomeTsh: number;
  moviesPercent: number;
  seriesIncomeTsh: number;
  seriesPercent: number;
  totalOrders: number;
  weeks: SalesTrend[];
}

export interface ContentPerformance {
  id: string;
  title: string;
  contentType: 'movie' | 'series';
  posterUrl: string;
  leadDj: string;
  totalStreams: number;
  totalDownloads: number;
  totalRevenueTsh: number;
  completionRatePercent: number;
}

export interface AttentionItem {
  id: string;
  title: string;
  description: string;
  type: 'warning' | 'info' | 'action';
  actionLabel: string;
  actionHref: string;
  timestamp: string;
}

export interface AdminPlatformSettings {
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  defaultCurrency: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  defaultStreamingPriceTsh: number;
  defaultDownloadPriceTsh: number;
  defaultAccessDurationHours: number;
  maxActiveDevicesPerUser: number;
  publishingRequiresApproval: boolean;
  allowOfflineDownloads: boolean;
}

// Backwards compatibility aliases
export interface SystemPolicySettings {
  paywallEnforced: boolean;
  promoCodesActive: boolean;
  activePromoCampaignsCount: number;
  allowOfflineDownloads?: boolean;
  publishingRequiresApproval?: boolean;
  traVat18AutoDeduction?: boolean;
  botComplianceActive?: boolean;
  sslEncrypted?: boolean;
  lastSyncSecondsAgo?: number;
}

export interface MasterPlatformControls {
  maintenanceMode: boolean;
  globalPaywall: boolean;
  systemName: string;
  systemCurrency: string;
  traAutoFiscalization?: boolean;
  widevineDrmL1?: boolean;
  dynamicWatermarking?: boolean;
  freeTrialAllocatedCount?: number;
  traVfdMachineCode?: string;
  botClearingAccount?: string;
  cdnStatus?: string;
  cdnLatencyMs?: number;
}

export interface AudienceAnalytics {
  totalRegistered: number;
  activeSubscribers: number;
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  churnRatePercent: number;
  retentionRatePercent: number;
  averageRevenuePerUserTsh: number;
  deviceBreakdown: {
    mobilePercent: number;
    tabletPercent: number;
    tvPercent: number;
    desktopPercent: number;
    // Compatibility
    tecnoPercent?: number;
    samsungPercent?: number;
    iphonePercent?: number;
    smartTvPercent?: number;
    otherPercent?: number;
  };
  growthTrend: {
    month: string;
    subscribers: number;
    revenueTsh: number;
  }[];
}

export interface ContentAnalytics {
  topStreamedMovies: {
    id: string;
    title: string;
    djLead: string;
    streamsCount: number;
    completionRatePercent: number;
  }[];
  topDownloadedMovies: {
    id: string;
    title: string;
    djLead: string;
    downloadsCount: number;
    revenueTsh?: number;
    storageBandwidthGb?: number;
  }[];
  djListenershipShare: {
    djId: string;
    djName: string;
    sharePercent: number;
    totalListens: number;
    colorHex: string;
  }[];
}

export interface TelcoGateway {
  id: string;
  name: string;
  code: string;
  sharePercent: number;
  volumeTsh: number;
  latencySeconds?: number;
  uptimePercent?: number;
  status: string;
  statusText: string;
  colorHex: string;
}
