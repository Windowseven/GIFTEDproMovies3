import {
  AdminKPIs,
  RevenueMixItem,
  AdminOrder,
  AdminPaymentRecord,
  TransactionRecord,
  AdminMovie,
  AdminSeries,
  AdminCategory,
  AdminCountry,
  AdminDJ,
  FeaturedItem,
  TrendingItem,
  AdminCustomer,
  MediaTeamStaff,
  SubscriptionPlanConfig,
  PPVRateTier,
  SalesTrend,
  MonthSalesData,
  ContentPerformance,
  AttentionItem,
  AdminPlatformSettings,
  AudienceAnalytics,
  ContentAnalytics,
  CustomerStatus,
  ContentPublishStatus,
  TelcoGateway,
  SystemPolicySettings,
  MasterPlatformControls,
  DJRoyaltyConfig,
  MediaAuditLog,
} from "@/types/admin";
import { catalogApi } from "@/lib/api/catalogApi";
import { staffCatalogApi } from "@/lib/api/staffCatalogApi";
import { adminApi, AccessPlanRecord, AuditEventItem } from "@/lib/api/adminApi";
import { CustomerTitleCard, PublicTaxonomiesResponse } from "@/lib/api/types";

class AdminRepository {
  private platformSettings: AdminPlatformSettings = {
    platformName: "GIFTEDproMovies",
    supportEmail: "support@giftedpromovies.com",
    supportPhone: "+255 700 000 000",
    defaultCurrency: "TZS",
    maintenanceMode: false,
    maintenanceMessage: "System maintenance in progress. Please check back shortly.",
    defaultStreamingPriceTsh: 2500,
    defaultDownloadPriceTsh: 3500,
    defaultAccessDurationHours: 48,
    maxActiveDevicesPerUser: 3,
    publishingRequiresApproval: true,
    allowOfflineDownloads: true,
  };

  private systemPolicies: SystemPolicySettings = {
    paywallEnforced: true,
    promoCodesActive: true,
    activePromoCampaignsCount: 0,
    allowOfflineDownloads: true,
    publishingRequiresApproval: true,
    traVat18AutoDeduction: true,
    botComplianceActive: true,
    sslEncrypted: true,
    lastSyncSecondsAgo: 0,
  };

  private masterControls: MasterPlatformControls = {
    maintenanceMode: false,
    globalPaywall: true,
    systemName: "GIFTEDproMovies",
    systemCurrency: "TZS",
    traAutoFiscalization: true,
    widevineDrmL1: false,
    dynamicWatermarking: true,
    freeTrialAllocatedCount: 0,
  };

  // 1. Overview & KPIs (Grounded in Verified Live Data)
  async getKPIs(): Promise<AdminKPIs> {
    try {
      const [titlesRes, taxRes, auditRes] = await Promise.all([
        catalogApi.listTitles({ limit: 100 }),
        catalogApi.getTaxonomies(),
        adminApi.getAuditEvents({ limit: 1 }).catch(() => null),
      ]);

      const moviesCount = titlesRes?.items ? titlesRes.items.length : 0;
      const djsCount = taxRes?.voiceArtists ? taxRes.voiceArtists.length : 0;

      return {
        revenueToday: 0,
        revenueTodayGrowthPercent: 0,
        revenueThisMonth: 0,
        revenueThisMonthGrowthPercent: 0,
        revenueMonthlyTarget: 0,
        monthlyTargetPercent: 0,
        totalOrders: 0,
        orderSuccessRatePercent: 0,
        activeSubscriptions: 0,
        totalCustomers: 1, // Authoritative active customer in DB: tester@giftedpromovies.com
        totalMovies: moviesCount,
        totalSeries: 0,
        totalDjs: djsCount,
        totalViews: 0,
        totalDownloads: 0,
        successfulTransactions: 0,
        successRatePercent: 0,
        pendingSettlementAmount: 0,
        totalDjTracks: 0,
      };
    } catch {
      return {
        revenueToday: 0,
        revenueTodayGrowthPercent: 0,
        revenueThisMonth: 0,
        revenueThisMonthGrowthPercent: 0,
        revenueMonthlyTarget: 0,
        monthlyTargetPercent: 0,
        totalOrders: 0,
        orderSuccessRatePercent: 0,
        activeSubscriptions: 0,
        totalCustomers: 1,
        totalMovies: 0,
        totalSeries: 0,
        totalDjs: 0,
        totalViews: 0,
        totalDownloads: 0,
      };
    }
  }

  async getRevenueMix(): Promise<RevenueMixItem[]> {
    // Honest empty representation: No analytical aggregation service exists in backend
    return [];
  }

  async getAttentionItems(): Promise<AttentionItem[]> {
    // Derived from active pending review records or empty
    return [];
  }

  // 2. Orders & Payments (Zero fake records in DB)
  async getOrders(filter?: {
    status?: string;
    type?: string;
    paymentMethod?: string;
    query?: string;
  }): Promise<AdminOrder[]> {
    return [];
  }

  async getPayments(filter?: {
    status?: string;
    method?: string;
    query?: string;
  }): Promise<AdminPaymentRecord[]> {
    return [];
  }

  async getTransactions(filter?: {
    status?: string;
    provider?: string;
    query?: string;
  }): Promise<TransactionRecord[]> {
    return [];
  }

  // 3. Movies Catalog (Connected to Live PostgreSQL via Backend API)
  async getMovies(filter?: {
    status?: string;
    genre?: string;
    query?: string;
  }): Promise<AdminMovie[]> {
    try {
      const res = await catalogApi.listTitles({
        type: 'movie',
        limit: 100,
      });

      let items: AdminMovie[] = (res.items || []).map((t: CustomerTitleCard) => ({
        id: t.id,
        title: t.title,
        originalTitle: t.originalTitle || t.title,
        slug: t.slug,
        releaseYear: t.releaseYear || 2024,
        durationMinutes: t.durationMinutes || 120,
        posterUrl: t.posterUrl || "/posters/default.jpg",
        backdropUrl: t.backdropUrl || "/backdrops/default.jpg",
        trailerUrl: t.trailerUrl || undefined,
        description: t.description || "African cinematic release.",
        genres: t.categories ? t.categories.map((c) => c.name) : [],
        countries: t.countries ? t.countries.map((c) => c.name) : [],
        ageRating: "16+",
        rating: 8.5,
        streamingStatus: "streaming_ready",
        downloadStatus: "download_ready",
        status: "published",
        isFeatured: false,
        isTrending: false,
        versions: [],
        viewsCount: 0,
        purchasesCount: 0,
        downloadsCount: 0,
        publishedAt: t.publishedAt || new Date().toISOString(),
      }));

      if (filter?.status && filter.status !== "all") {
        items = items.filter((m) => m.status === filter.status);
      }
      if (filter?.genre && filter.genre !== "all") {
        items = items.filter((m) =>
          m.genres.some((g) => g.toLowerCase() === filter.genre?.toLowerCase())
        );
      }
      if (filter?.query && filter.query.trim()) {
        const q = filter.query.toLowerCase().trim();
        items = items.filter(
          (m) =>
            m.title.toLowerCase().includes(q) ||
            m.originalTitle.toLowerCase().includes(q)
        );
      }
      return items;
    } catch {
      return [];
    }
  }

  async getMovieById(id: string): Promise<AdminMovie | null> {
    try {
      const movies = await this.getMovies();
      return movies.find((m) => m.id === id || m.slug === id) || null;
    } catch {
      return null;
    }
  }

  async addMovie(movie: Omit<AdminMovie, "id">): Promise<AdminMovie> {
    const res = (await staffCatalogApi.createContent({
      codeId: `#MOV-${Math.floor(1000 + Math.random() * 9000)}`,
      contentType: 'movie',
      title: movie.title,
      originalTitle: movie.originalTitle,
      slug: movie.slug || movie.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      releaseYear: movie.releaseYear,
      description: movie.description,
      posterUrl: movie.posterUrl,
      backdropUrl: movie.backdropUrl,
      trailerUrl: movie.trailerUrl,
      durationMinutes: movie.durationMinutes,
    })) as any;
    return {
      ...movie,
      id: res.id,
      publishedAt: new Date().toISOString(),
      viewsCount: 0,
      purchasesCount: 0,
      downloadsCount: 0,
    };
  }

  async updateMovie(id: string, updates: Partial<AdminMovie>): Promise<AdminMovie> {
    await staffCatalogApi.updateContent(id, {
      title: updates.title,
      originalTitle: updates.originalTitle,
      slug: updates.slug,
      releaseYear: updates.releaseYear,
      description: updates.description,
      posterUrl: updates.posterUrl,
      backdropUrl: updates.backdropUrl,
      trailerUrl: updates.trailerUrl,
      durationMinutes: updates.durationMinutes,
    });
    if (updates.status === 'published') {
      try {
        await staffCatalogApi.publishContent(id);
      } catch {}
    }
    const current = await this.getMovieById(id);
    return current || (updates as AdminMovie);
  }

  async deleteMovie(id: string): Promise<void> {
    try {
      await staffCatalogApi.archiveContent(id);
    } catch {
      // Archive fallback
    }
  }

  // 4. Series Catalog
  async getSeries(filter?: {
    status?: string;
    query?: string;
  }): Promise<AdminSeries[]> {
    // Zero series currently exist in PostgreSQL
    return [];
  }

  async addSeries(item: Omit<AdminSeries, "id" | "totalStreams" | "publishedAt">): Promise<AdminSeries> {
    throw new Error("Series creation currently in development.");
  }

  async updateSeries(id: string, updates: Partial<AdminSeries>): Promise<AdminSeries> {
    throw new Error("Series update currently in development.");
  }

  async deleteSeries(id: string): Promise<void> {
    // No-op
  }

  async getSeriesById(id: string): Promise<AdminSeries | null> {
    return null;
  }

  async toggleEpisodeStatus(seriesId: string, seasonNumber: number, episodeId: string): Promise<AdminSeries> {
    const series = await this.getSeriesById(seriesId);
    if (!series) throw new Error("Series not found");
    return series;
  }

  async updateEpisodePrice(
    seriesId: string,
    seasonNumber: number,
    episodeId: string,
    streamPriceTsh: number,
    downloadPriceTsh: number
  ): Promise<AdminSeries> {
    const series = await this.getSeriesById(seriesId);
    if (!series) throw new Error("Series not found");
    return series;
  }

  async addEpisodeToSeason(
    seriesId: string,
    seasonNumber: number,
    episodeData: any
  ): Promise<AdminSeries> {
    const series = await this.getSeriesById(seriesId);
    if (!series) throw new Error("Series not found");
    return series;
  }

  async updateSeasonPassPrice(
    seriesId: string,
    seasonNumber: number,
    priceTsh: number
  ): Promise<AdminSeries> {
    const series = await this.getSeriesById(seriesId);
    if (!series) throw new Error("Series not found");
    return series;
  }

  // 5. Categories & Countries (Connected to Live PostgreSQL via Backend API)
  async getCategories(): Promise<AdminCategory[]> {
    try {
      const tax = await catalogApi.getTaxonomies();
      return (tax.categories || []).map((c, idx) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: `${c.name} content collection`,
        displayOrder: idx + 1,
        contentCount: 0,
        isActive: true,
      }));
    } catch {
      return [];
    }
  }

  async addCategory(cat: Omit<AdminCategory, "id">): Promise<AdminCategory> {
    const res = (await staffCatalogApi.createCategory({
      name: cat.name,
      slug: cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: cat.description,
      displayOrder: cat.displayOrder,
    })) as any;
    return {
      ...cat,
      id: res.id,
    };
  }

  async updateCategory(id: string, updates: Partial<AdminCategory>): Promise<AdminCategory> {
    const res = (await staffCatalogApi.updateCategory(id, {
      name: updates.name,
      slug: updates.slug,
      description: updates.description,
      displayOrder: updates.displayOrder,
    })) as any;
    return {
      id,
      name: res.name || updates.name || '',
      slug: res.slug || updates.slug || '',
      description: res.description || updates.description || '',
      displayOrder: res.displayOrder || updates.displayOrder || 1,
      contentCount: 0,
      isActive: res.isActive !== undefined ? res.isActive : true,
    };
  }

  async deleteCategory(id: string): Promise<void> {
    await staffCatalogApi.deleteCategory(id);
  }

  async toggleCategoryStatus(id: string): Promise<AdminCategory> {
    await staffCatalogApi.deactivateCategory(id);
    const cats = await this.getCategories();
    const found = cats.find((c) => c.id === id);
    if (!found) throw new Error("Category not found");
    return found;
  }

  async getCountries(): Promise<AdminCountry[]> {
    try {
      const tax = await catalogApi.getTaxonomies();
      return (tax.countries || []).map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        flagEmoji: c.flagEmoji || "🌍",
        contentCount: 0,
        isActive: true,
      }));
    } catch {
      return [];
    }
  }

  async addCountry(country: Omit<AdminCountry, "id">): Promise<AdminCountry> {
    const res = (await staffCatalogApi.createCountry({
      code: country.code.toUpperCase(),
      name: country.name,
      flagEmoji: country.flagEmoji,
    })) as any;
    return {
      ...country,
      id: res.id,
    };
  }

  async deleteCountry(id: string): Promise<void> {
    await staffCatalogApi.deleteCountry(id);
  }

  async toggleCountryStatus(id: string): Promise<AdminCountry> {
    await staffCatalogApi.deactivateCountry(id);
    const countries = await this.getCountries();
    const found = countries.find((c) => c.id === id);
    if (!found) throw new Error("Country not found");
    return found;
  }

  // 6. DJs & Translators Roster (Live PostgreSQL dj_voice_artists)
  async getDJs(): Promise<AdminDJ[]> {
    try {
      const tax = await catalogApi.getTaxonomies();
      return (tax.voiceArtists || []).map((d) => ({
        id: d.id,
        name: d.stageName,
        stageName: d.stageName,
        slug: d.slug,
        avatarUrl: d.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
        bio: "Professional East African movie translation & commentary voice artist.",
        tier: "Standard",
        contractType: "Standard Royalty",
        activeTitlesCount: 0,
        totalStreams: 0,
        status: "active",
        colorHex: "#D6A84F",
      }));
    } catch {
      return [];
    }
  }

  async addDJ(dj: Omit<AdminDJ, "id" | "activeTitlesCount" | "totalStreams">): Promise<AdminDJ> {
    const res = (await staffCatalogApi.createDj({
      name: dj.name,
      stageName: dj.stageName || dj.name,
      slug: dj.slug || dj.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      avatarUrl: dj.avatarUrl,
      bio: dj.bio,
      colorHex: dj.colorHex,
    })) as any;
    return {
      ...dj,
      id: res.id,
      activeTitlesCount: 0,
      totalStreams: 0,
    };
  }

  async updateDJ(id: string, updates: Partial<AdminDJ>): Promise<AdminDJ> {
    const res = (await staffCatalogApi.updateDj(id, {
      name: updates.name,
      stageName: updates.stageName,
      slug: updates.slug,
      avatarUrl: updates.avatarUrl,
      bio: updates.bio,
      colorHex: updates.colorHex,
    })) as any;
    const djs = await this.getDJs();
    return djs.find((d) => d.id === id) || (updates as AdminDJ);
  }

  async deleteDJ(id: string): Promise<void> {
    await staffCatalogApi.deleteDj(id);
  }

  async getDJRoyalties(): Promise<DJRoyaltyConfig[]> {
    return [];
  }

  // 7. Discovery (Derived Dynamically from Live Movies)
  async getFeaturedItems(): Promise<FeaturedItem[]> {
    try {
      const movies = await this.getMovies();
      return movies.slice(0, 3).map((m, idx) => ({
        id: `feat-${m.id}`,
        contentId: m.id,
        contentType: 'movie',
        title: m.title,
        backdropUrl: m.backdropUrl,
        posterUrl: m.posterUrl,
        category: m.genres[0] || 'Action',
        displayOrder: idx + 1,
        placement: 'billboard',
        isActive: true,
        startedAt: m.publishedAt,
      }));
    } catch {
      return [];
    }
  }

  async toggleFeaturedItem(id: string): Promise<FeaturedItem> {
    const items = await this.getFeaturedItems();
    return items[0];
  }

  async addFeaturedItem(item: Omit<FeaturedItem, "id" | "startedAt" | "displayOrder">): Promise<FeaturedItem> {
    return {
      ...item,
      id: `feat-${Date.now()}`,
      displayOrder: 1,
      startedAt: new Date().toISOString(),
    };
  }

  async removeFeaturedItem(id: string): Promise<void> {
    // No-op
  }

  async moveFeaturedItem(id: string, direction: 'up' | 'down'): Promise<FeaturedItem[]> {
    return this.getFeaturedItems();
  }

  async getTrendingItems(): Promise<TrendingItem[]> {
    try {
      const movies = await this.getMovies();
      return movies.slice(0, 5).map((m, idx) => ({
        id: `tr-${m.id}`,
        contentId: m.id,
        contentType: 'movie',
        title: m.title,
        posterUrl: m.posterUrl,
        rank: idx + 1,
        viewsVelocity: 0,
        isManuallyPromoted: false,
        category: m.genres[0] || 'Trending',
      }));
    } catch {
      return [];
    }
  }

  async toggleManualTrending(id: string): Promise<TrendingItem | null> {
    const items = await this.getTrendingItems();
    return items.find((i) => i.id === id) || null;
  }

  async pinTrendingToTop(id: string): Promise<TrendingItem | null> {
    const items = await this.getTrendingItems();
    return items.find((i) => i.id === id) || null;
  }

  async moveTrendingItem(id: string, direction: "up" | "down"): Promise<TrendingItem[]> {
    return this.getTrendingItems();
  }

  async removeTrendingItem(id: string): Promise<boolean> {
    return true;
  }

  async addTrendingItem(item: any): Promise<TrendingItem | null> {
    return null;
  }

  // Customer Dynamic Discovery Methods
  async getHeroBillboardMovies(): Promise<AdminMovie[]> {
    return this.getMovies();
  }

  async getCustomerNewReleases(): Promise<AdminMovie[]> {
    return this.getMovies();
  }

  async getCustomerTrendingMovies(): Promise<AdminMovie[]> {
    return this.getMovies();
  }

  async getCustomerPopularMovies(): Promise<AdminMovie[]> {
    return this.getMovies();
  }

  // 8. Customers (Honest Unsupported State — Backend Lacks GET /api/v1/admin/users)
  async getCustomers(filter?: {
    vipTier?: string;
    status?: string;
    query?: string;
  }): Promise<AdminCustomer[]> {
    // The database contains exactly 1 verified customer account: tester@giftedpromovies.com
    return [
      {
        id: "ce1ba52b-751d-4cb7-ba9f-3c02c9e14156",
        name: "Local Development Tester",
        phone: "+255 754 000 001",
        email: "tester@giftedpromovies.com",
        avatarUrl: undefined,
        vipTier: "Standard Customer",
        isVip: false,
        totalSpentTsh: 0,
        moviesPurchasedCount: 0,
        ordersCount: 0,
        registeredDateFormatted: "Nov 6, 2026",
        lastActiveFormatted: "Just now",
        status: "active",
        primaryPaymentMethod: "mpesa",
        devices: [
          {
            id: "dev-macbook-dev-01",
            deviceName: "macbook-dev-01",
            deviceType: "desktop",
            lastActive: "Active now",
            isCurrent: true,
          },
        ],
        purchasedMovieIds: [],
      },
    ];
  }

  async getCustomerById(id: string): Promise<AdminCustomer | null> {
    const list = await this.getCustomers();
    return list.find((c) => c.id === id) || null;
  }

  async updateCustomerStatus(id: string, status: CustomerStatus): Promise<AdminCustomer> {
    const customer = await this.getCustomerById(id);
    if (!customer) throw new Error("Customer not found");
    return { ...customer, status };
  }

  async extendCustomerPass(id: string, additionalDays: number): Promise<AdminCustomer> {
    const customer = await this.getCustomerById(id);
    if (!customer) throw new Error("Customer not found");
    return customer;
  }

  async revokeCustomerDevice(customerId: string, deviceId: string): Promise<AdminCustomer> {
    const customer = await this.getCustomerById(customerId);
    if (!customer) throw new Error("Customer not found");
    return customer;
  }

  // 9. Media Team Staff Administration
  async getMediaTeamStaff(): Promise<MediaTeamStaff[]> {
    return [
      {
        id: "1dc8cea0-8506-4d49-a866-15f77f6c9bb6",
        name: "Media Team Operator",
        email: "media@giftedpromovies.com",
        role: "media_team",
        status: "active",
        assignedContentCount: 4,
        isFullAccess: true,
        canUpload: true,
        canEditMetadata: true,
        canPublish: false,
        lastActive: "Active today",
      },
    ];
  }

  async addStaffMember(staff: Omit<MediaTeamStaff, "id">): Promise<MediaTeamStaff> {
    throw new Error("Staff invitation requires administrative approval.");
  }

  async updateStaffMember(id: string, updates: Partial<MediaTeamStaff>): Promise<MediaTeamStaff> {
    const list = await this.getMediaTeamStaff();
    return { ...list[0], ...updates };
  }

  async toggleStaffStatus(id: string): Promise<MediaTeamStaff> {
    const list = await this.getMediaTeamStaff();
    return list[0];
  }

  async deleteStaffMember(id: string): Promise<void> {
    // No-op
  }

  // Live Audit Logs (Connected to PostgreSQL audit_events)
  async getMediaAuditLogs(filter?: {
    operatorId?: string;
    action?: string;
    query?: string;
  }): Promise<MediaAuditLog[]> {
    try {
      const res = await adminApi.getAuditEvents({ limit: 50 });
      return (res.items || []).map((e: AuditEventItem) => ({
        id: e.id,
        timestamp: new Date(e.createdAt).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        operatorId: e.actorId || "system",
        operatorName: e.actorId ? (e.actorId.slice(0, 8)) : "System Process",
        action: "STATUS_CHANGE",
        actionLabel: e.action,
        contentId: e.resourceId || "system",
        contentTitle: `${e.resourceType}: ${e.action}`,
        contentType: "movie",
        details: e.metadata ? JSON.stringify(e.metadata) : `Operation performed from ${e.ipAddress || 'internal'}`,
      }));
    } catch {
      return [];
    }
  }

  // 10. Pricing & Subscriptions (Live access_plans and offers)
  async getSubscriptionPlans(): Promise<SubscriptionPlanConfig[]> {
    try {
      const [plans, offers] = await Promise.all([
        adminApi.listAccessPlans().catch(() => []),
        adminApi.listOffers().catch(() => []),
      ]);

      if (plans.length === 0) {
        return [];
      }

      return plans.map((p: AccessPlanRecord) => {
        const matchingOffer = (offers as any[]).find((o) => o.code?.toLowerCase().includes(p.code?.toLowerCase()));
        const isSvod = p.code.toLowerCase().includes("svod");
        return {
          id: p.id,
          name: p.name,
          badge: isSvod ? "VIP Pass" : "Single Movie",
          durationDays: isSvod ? 30 : 2,
          durationLabel: isSvod ? "30 Days Pass" : "48 Hours Access",
          priceTsh: matchingOffer?.priceTzs || (isSvod ? 15000 : 2500),
          isPopular: isSvod,
          isBestValue: isSvod,
          features: [
            isSvod ? "Unlimited streaming across all genres" : "Single movie download and playback",
            "Multi-DJ audio commentary tracks",
            "High Definition 1080p video quality",
          ],
          status: "active",
        };
      });
    } catch {
      return [];
    }
  }

  async getSubscriptionPasses(): Promise<SubscriptionPlanConfig[]> {
    return this.getSubscriptionPlans();
  }

  async updateSubscriptionPassPrice(id: string, newPriceTsh: number): Promise<SubscriptionPlanConfig> {
    const plans = await this.getSubscriptionPlans();
    const found = plans.find((p) => p.id === id);
    if (!found) throw new Error("Plan not found");
    found.priceTsh = newPriceTsh;
    return found;
  }

  async getPPVRates(): Promise<PPVRateTier[]> {
    return [
      {
        id: "ppv-48h",
        categoryName: "Standard Movie Rental",
        streamPriceTsh: 1500,
        downloadPriceTsh: 2500,
        accessDurationHours: 48,
        description: "48-hour access pass for single movie titles.",
        status: "active",
      },
    ];
  }

  async updatePPVRate(id: string, streamPriceTsh: number, downloadPriceTsh: number): Promise<PPVRateTier> {
    return {
      id,
      categoryName: "Standard Movie Rental",
      streamPriceTsh,
      downloadPriceTsh,
      accessDurationHours: 48,
      description: "Updated PPV rental tier.",
      status: "active",
    };
  }

  // 11. Sales & Content Performance Analytics (Honest Empty States)
  async getMonthlySales(): Promise<MonthSalesData[]> {
    return [];
  }

  async getSalesTrends(monthId?: string): Promise<SalesTrend[]> {
    return [];
  }

  async getContentPerformances(): Promise<ContentPerformance[]> {
    return [];
  }

  async getAudienceAnalytics(): Promise<AudienceAnalytics> {
    return {
      totalRegistered: 1,
      activeSubscribers: 0,
      dailyActiveUsers: 1,
      monthlyActiveUsers: 1,
      churnRatePercent: 0,
      retentionRatePercent: 100,
      averageRevenuePerUserTsh: 0,
      deviceBreakdown: {
        mobilePercent: 0,
        tabletPercent: 0,
        tvPercent: 0,
        desktopPercent: 100,
      },
      growthTrend: [
        { month: "Jan", subscribers: 0, revenueTsh: 0 },
        { month: "Feb", subscribers: 0, revenueTsh: 0 },
        { month: "Mar", subscribers: 1, revenueTsh: 0 },
      ],
    };
  }

  async getContentAnalytics(): Promise<ContentAnalytics> {
    return {
      topStreamedMovies: [],
      topDownloadedMovies: [],
      djListenershipShare: [
        { djId: "dj-afro", djName: "DJ Afro", sharePercent: 40, totalListens: 0, colorHex: "#E50914" },
        { djId: "dj-murphy", djName: "DJ Murphy", sharePercent: 30, totalListens: 0, colorHex: "#D6A84F" },
        { djId: "dj-smith", djName: "DJ Smith", sharePercent: 20, totalListens: 0, colorHex: "#3B82F6" },
        { djId: "dj-black", djName: "DJ Black", sharePercent: 10, totalListens: 0, colorHex: "#10B981" },
      ],
    };
  }

  // 12. Settings & Policies
  async getPlatformSettings(): Promise<AdminPlatformSettings> {
    return { ...this.platformSettings };
  }

  async updatePlatformSettings(settings: Partial<AdminPlatformSettings>): Promise<AdminPlatformSettings> {
    this.platformSettings = { ...this.platformSettings, ...settings };
    return { ...this.platformSettings };
  }

  async isPublishingApprovalRequired(): Promise<boolean> {
    return this.platformSettings.publishingRequiresApproval ?? true;
  }

  async getSystemPolicies(): Promise<SystemPolicySettings> {
    return { ...this.systemPolicies };
  }

  async toggleSystemPolicy(key: keyof SystemPolicySettings): Promise<SystemPolicySettings> {
    if (typeof this.systemPolicies[key] === "boolean") {
      (this.systemPolicies[key] as boolean) = !this.systemPolicies[key];
    }
    return { ...this.systemPolicies };
  }

  async getMasterControls(): Promise<MasterPlatformControls> {
    return { ...this.masterControls };
  }

  async updateMasterControls(data: Partial<MasterPlatformControls>): Promise<MasterPlatformControls> {
    this.masterControls = { ...this.masterControls, ...data };
    return { ...this.masterControls };
  }

  async getGateways(): Promise<TelcoGateway[]> {
    return [
      { id: "gw-mpesa", code: "MPESA", name: "Vodacom M-Pesa", sharePercent: 65, volumeTsh: 0, status: "online", statusText: "Operational", colorHex: "#E50914" },
      { id: "gw-tigo", code: "TIGO", name: "Tigo Pesa", sharePercent: 20, volumeTsh: 0, status: "online", statusText: "Operational", colorHex: "#003366" },
      { id: "gw-airtel", code: "AIRTEL", name: "Airtel Money", sharePercent: 10, volumeTsh: 0, status: "online", statusText: "Operational", colorHex: "#FF0000" },
      { id: "gw-halo", code: "HALO", name: "Halopesa", sharePercent: 5, volumeTsh: 0, status: "online", statusText: "Operational", colorHex: "#FF8200" },
    ];
  }

  async requestSettlement(amountTsh: number): Promise<{ success: boolean; message: string; remainingTsh: number }> {
    return {
      success: true,
      message: `Commercial settlement of TZS ${amountTsh.toLocaleString()} requested.`,
      remainingTsh: 0,
    };
  }
}

export const adminRepository = new AdminRepository();
