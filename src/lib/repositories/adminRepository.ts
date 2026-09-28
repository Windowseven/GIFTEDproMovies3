import {
  AdminKPIs,
  RevenueMixItem,
  AdminOrder,
  AdminPaymentRecord,
  TransactionRecord,
  AdminMovie,
  AdminSeries,
  AdminSeason,
  AdminEpisode,
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
import {
  mockAdminKPIs,
  mockRevenueMix,
  mockAttentionItems,
  mockAdminOrders,
  mockAdminPayments,
  mockTransactions,
  mockAdminMovies,
  mockAdminSeries,
  mockAdminCategories,
  mockAdminCountries,
  mockAdminDJs,
  mockDJRoyalties,
  mockFeaturedItems,
  mockTrendingItems,
  mockAdminCustomers,
  mockMediaTeamStaff,
  mockMediaAuditLogs,
  mockSubscriptionPlans,
  mockPPVRates,
  mockSalesTrends,
  mockMonthlySalesData,
  mockContentPerformances,
  mockAudienceAnalytics,
  mockContentAnalytics,
  mockPlatformSettings,
  mockSystemPolicies,
  mockMasterControls,
  mockTelcoGateways,
} from "@/data/mock/adminData";

class AdminRepository {
  private kpis: AdminKPIs = { ...mockAdminKPIs };
  private revenueMix: RevenueMixItem[] = [...mockRevenueMix];
  private attentionItems: AttentionItem[] = [...mockAttentionItems];
  private orders: AdminOrder[] = [...mockAdminOrders];
  private payments: AdminPaymentRecord[] = [...mockAdminPayments];
  private transactions: TransactionRecord[] = [...mockTransactions];
  private movies: AdminMovie[] = [...mockAdminMovies];
  private series: AdminSeries[] = [...mockAdminSeries];
  private categories: AdminCategory[] = [...mockAdminCategories];
  private countries: AdminCountry[] = [...mockAdminCountries];
  private djs: AdminDJ[] = [...mockAdminDJs];
  private djRoyalties: DJRoyaltyConfig[] = [...mockDJRoyalties];
  private featuredItems: FeaturedItem[] = [...mockFeaturedItems];
  private trendingItems: TrendingItem[] = [...mockTrendingItems];
  private customers: AdminCustomer[] = [...mockAdminCustomers];
  private staff: MediaTeamStaff[] = [...mockMediaTeamStaff];
  private mediaAuditLogs: MediaAuditLog[] = [...mockMediaAuditLogs];
  private subscriptionPlans: SubscriptionPlanConfig[] = [...mockSubscriptionPlans];
  private ppvRates: PPVRateTier[] = [...mockPPVRates];
  private salesTrends: SalesTrend[] = [...mockSalesTrends];
  private contentPerformances: ContentPerformance[] = [...mockContentPerformances];
  private audienceAnalytics: AudienceAnalytics = { ...mockAudienceAnalytics };
  private contentAnalytics: ContentAnalytics = { ...mockContentAnalytics };
  private platformSettings: AdminPlatformSettings = { ...mockPlatformSettings };
  private systemPolicies: SystemPolicySettings = { ...mockSystemPolicies };
  private masterControls: MasterPlatformControls = { ...mockMasterControls };
  private gateways: TelcoGateway[] = [...mockTelcoGateways];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === "undefined") return;
    try {
      const storedFeatured = localStorage.getItem("giftedpro_featured_items");
      if (storedFeatured) {
        const parsed = JSON.parse(storedFeatured);
        this.featuredItems = parsed.map((item: any) => ({ ...item, placement: "billboard" }));
      }

      const storedMovies = localStorage.getItem("giftedpro_movies");
      if (storedMovies) this.movies = JSON.parse(storedMovies);

      const storedSeries = localStorage.getItem("giftedpro_series");
      if (storedSeries) this.series = JSON.parse(storedSeries);

      const storedCategories = localStorage.getItem("giftedpro_categories");
      if (storedCategories) this.categories = JSON.parse(storedCategories);

      const storedCountries = localStorage.getItem("giftedpro_countries");
      if (storedCountries) this.countries = JSON.parse(storedCountries);

      const storedDjs = localStorage.getItem("giftedpro_djs");
      if (storedDjs) this.djs = JSON.parse(storedDjs);

      const storedTrending = localStorage.getItem("giftedpro_trending_items");
      if (storedTrending) this.trendingItems = JSON.parse(storedTrending);

      const storedStaff = localStorage.getItem("giftedpro_media_staff");
      if (storedStaff) this.staff = JSON.parse(storedStaff);

      const storedLogs = localStorage.getItem("giftedpro_media_audit_logs");
      if (storedLogs) this.mediaAuditLogs = JSON.parse(storedLogs);

      const storedPpv = localStorage.getItem("giftedpro_ppv_rates");
      if (storedPpv) this.ppvRates = JSON.parse(storedPpv);

      const storedSettings = localStorage.getItem("giftedpro_platform_settings");
      if (storedSettings) this.platformSettings = JSON.parse(storedSettings);
    } catch (e) {
      console.error("Error loading giftedpro local storage:", e);
    }
  }

  private persist(key: string, data: any) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent("giftedpro_data_updated", { detail: { key } }));
    } catch (e) {
      console.error("Error writing to giftedpro local storage:", e);
    }
  }

  // 1. Overview & KPIs
  async getKPIs(): Promise<AdminKPIs> {
    this.loadFromStorage();
    return { ...this.kpis };
  }

  async getRevenueMix(): Promise<RevenueMixItem[]> {
    return [...this.revenueMix];
  }

  async getAttentionItems(): Promise<AttentionItem[]> {
    return [...this.attentionItems];
  }

  // 2. Orders & Payments
  async getOrders(filter?: {
    status?: string;
    type?: string;
    paymentMethod?: string;
    query?: string;
  }): Promise<AdminOrder[]> {
    let result = [...this.orders];
    if (filter?.status && filter.status !== "all") {
      result = result.filter((o) => o.status === filter.status);
    }
    if (filter?.type && filter.type !== "all") {
      result = result.filter((o) => o.itemType === filter.type);
    }
    if (filter?.paymentMethod && filter.paymentMethod !== "all") {
      result = result.filter((o) => o.paymentMethod === filter.paymentMethod);
    }
    if (filter?.query && filter.query.trim()) {
      const q = filter.query.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.itemTitle.toLowerCase().includes(q) ||
          o.customerPhoneMasked.includes(q)
      );
    }
    return result;
  }

  async getPayments(filter?: {
    status?: string;
    method?: string;
    query?: string;
  }): Promise<AdminPaymentRecord[]> {
    let result = [...this.payments];
    if (filter?.status && filter.status !== "all") {
      result = result.filter((p) => p.status === filter.status);
    }
    if (filter?.method && filter.method !== "all") {
      result = result.filter((p) => p.method === filter.method);
    }
    if (filter?.query && filter.query.trim()) {
      const q = filter.query.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.referenceNo.toLowerCase().includes(q) ||
          p.orderNumber.toLowerCase().includes(q) ||
          p.customerName.toLowerCase().includes(q) ||
          p.customerPhoneMasked.includes(q)
      );
    }
    return result;
  }

  // Compatibility for older views
  async getTransactions(filter?: {
    status?: string;
    provider?: string;
    query?: string;
  }): Promise<TransactionRecord[]> {
    let result = [...this.transactions];
    if (filter?.status && filter.status !== "all") {
      result = result.filter((tx) => tx.status === filter.status);
    }
    if (filter?.provider && filter.provider !== "all") {
      result = result.filter((tx) => tx.provider === filter.provider);
    }
    if (filter?.query && filter.query.trim()) {
      const q = filter.query.toLowerCase().trim();
      result = result.filter(
        (tx) =>
          tx.referenceNo.toLowerCase().includes(q) ||
          tx.customerPhoneMasked.includes(q) ||
          (tx.customerName && tx.customerName.toLowerCase().includes(q)) ||
          (tx.contentTitle && tx.contentTitle.toLowerCase().includes(q))
      );
    }
    return result;
  }

  // 3. Movies Catalog
  async getMovies(filter?: {
    status?: string;
    genre?: string;
    query?: string;
  }): Promise<AdminMovie[]> {
    this.loadFromStorage();
    let result = [...this.movies];
    if (filter?.status && filter.status !== "all") {
      result = result.filter((m) => m.status === filter.status);
    }
    if (filter?.genre && filter.genre !== "all") {
      result = result.filter((m) =>
        m.genres.some((g) => g.toLowerCase() === filter.genre?.toLowerCase())
      );
    }
    if (filter?.query && filter.query.trim()) {
      const q = filter.query.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.originalTitle.toLowerCase().includes(q) ||
          m.versions.some((v) => v.djName.toLowerCase().includes(q))
      );
    }
    return result;
  }

  async getMovieById(id: string): Promise<AdminMovie | null> {
    this.loadFromStorage();
    return this.movies.find((m) => m.id === id) || null;
  }

  async addMovie(movie: Omit<AdminMovie, "id">): Promise<AdminMovie> {
    const newMovie: AdminMovie = {
      ...movie,
      id: `m-${Date.now()}`,
      viewsCount: 0,
      purchasesCount: 0,
      downloadsCount: 0,
      publishedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };
    this.movies.unshift(newMovie);
    this.kpis.totalMovies = this.movies.length;
    this.persist("giftedpro_movies", this.movies);
    return newMovie;
  }

  async updateMovie(id: string, updates: Partial<AdminMovie>): Promise<AdminMovie> {
    const idx = this.movies.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error(`Movie with ID ${id} not found.`);
    this.movies[idx] = { ...this.movies[idx], ...updates };
    this.persist("giftedpro_movies", this.movies);
    return this.movies[idx];
  }

  async deleteMovie(id: string): Promise<void> {
    this.movies = this.movies.filter((m) => m.id !== id);
    this.kpis.totalMovies = this.movies.length;
    this.persist("giftedpro_movies", this.movies);
  }

  // 4. Series Catalog
  async getSeries(filter?: {
    status?: string;
    query?: string;
  }): Promise<AdminSeries[]> {
    this.loadFromStorage();
    let result = [...this.series];
    if (filter?.status && filter.status !== "all") {
      result = result.filter((s) => s.status === filter.status);
    }
    if (filter?.query && filter.query.trim()) {
      const q = filter.query.toLowerCase().trim();
      result = result.filter((s) => s.title.toLowerCase().includes(q));
    }
    return result;
  }

  async addSeries(item: Omit<AdminSeries, "id" | "totalStreams" | "publishedAt">): Promise<AdminSeries> {
    const newSeries: AdminSeries = {
      ...item,
      id: `s-${Date.now()}`,
      totalStreams: 0,
      publishedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };
    this.series.unshift(newSeries);
    this.kpis.totalSeries = this.series.length;
    this.persist("giftedpro_series", this.series);
    return newSeries;
  }

  async updateSeries(id: string, updates: Partial<AdminSeries>): Promise<AdminSeries> {
    const idx = this.series.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error("Series not found");
    this.series[idx] = { ...this.series[idx], ...updates };
    this.persist("giftedpro_series", this.series);
    return { ...this.series[idx] };
  }

  async deleteSeries(id: string): Promise<void> {
    this.series = this.series.filter((s) => s.id !== id);
    this.kpis.totalSeries = this.series.length;
    this.persist("giftedpro_series", this.series);
  }

  async updateEpisodePrice(
    seriesId: string,
    seasonNumber: number,
    episodeId: string,
    streamPriceTsh: number,
    downloadPriceTsh: number
  ): Promise<AdminSeries> {
    const series = this.series.find((s) => s.id === seriesId);
    if (!series || !series.seasons) throw new Error("Series not found");
    const season = series.seasons.find((sn) => sn.seasonNumber === seasonNumber);
    if (!season) throw new Error("Season not found");
    const episode = season.episodes.find((ep) => ep.id === episodeId);
    if (!episode) throw new Error("Episode not found");

    episode.streamPriceTsh = streamPriceTsh;
    episode.downloadPriceTsh = downloadPriceTsh;
    this.persist("giftedpro_series", this.series);
    return { ...series };
  }

  async toggleEpisodeStatus(
    seriesId: string,
    seasonNumber: number,
    episodeId: string
  ): Promise<AdminSeries> {
    const series = this.series.find((s) => s.id === seriesId);
    if (!series || !series.seasons) throw new Error("Series not found");
    const season = series.seasons.find((sn) => sn.seasonNumber === seasonNumber);
    if (!season) throw new Error("Season not found");
    const episode = season.episodes.find((ep) => ep.id === episodeId);
    if (!episode) throw new Error("Episode not found");

    episode.status = episode.status === "published" ? "draft" : "published";
    this.persist("giftedpro_series", this.series);
    return { ...series };
  }

  async addEpisodeToSeason(
    seriesId: string,
    seasonNumber: number,
    episodeData: Omit<AdminEpisode, "id">
  ): Promise<AdminSeries> {
    const series = this.series.find((s) => s.id === seriesId);
    if (!series) throw new Error("Series not found");
    if (!series.seasons) series.seasons = [];
    let season = series.seasons.find((sn) => sn.seasonNumber === seasonNumber);
    if (!season) {
      season = {
        id: `seas-${Date.now()}`,
        seasonNumber,
        title: `Season ${seasonNumber}`,
        seasonPassPriceTsh: 3500,
        episodes: [],
      };
      series.seasons.push(season);
    }
    const newEp: AdminEpisode = {
      ...episodeData,
      id: `ep-${Date.now()}`,
    };
    season.episodes.push(newEp);
    series.episodesCount = series.seasons.reduce((acc, s) => acc + s.episodes.length, 0);
    series.seasonsCount = series.seasons.length;
    this.persist("giftedpro_series", this.series);
    return { ...series };
  }

  async updateSeasonPassPrice(
    seriesId: string,
    seasonNumber: number,
    priceTsh: number
  ): Promise<AdminSeries> {
    const series = this.series.find((s) => s.id === seriesId);
    if (!series || !series.seasons) throw new Error("Series not found");
    const season = series.seasons.find((sn) => sn.seasonNumber === seasonNumber);
    if (!season) throw new Error("Season not found");
    season.seasonPassPriceTsh = priceTsh;
    this.persist("giftedpro_series", this.series);
    return { ...series };
  }

  // 5. Categories & Countries
  async getCategories(): Promise<AdminCategory[]> {
    this.loadFromStorage();
    return [...this.categories].sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async addCategory(cat: Omit<AdminCategory, "id">): Promise<AdminCategory> {
    const newCat: AdminCategory = { ...cat, id: `cat-${Date.now()}` };
    this.categories.push(newCat);
    this.persist("giftedpro_categories", this.categories);
    return newCat;
  }

  async updateCategory(id: string, updates: Partial<AdminCategory>): Promise<AdminCategory> {
    const idx = this.categories.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Category not found");
    this.categories[idx] = { ...this.categories[idx], ...updates };
    this.persist("giftedpro_categories", this.categories);
    return this.categories[idx];
  }

  async deleteCategory(id: string): Promise<void> {
    this.categories = this.categories.filter((c) => c.id !== id);
    this.persist("giftedpro_categories", this.categories);
  }

  async toggleCategoryStatus(id: string): Promise<AdminCategory> {
    const idx = this.categories.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Category not found");
    this.categories[idx].isActive = !this.categories[idx].isActive;
    this.persist("giftedpro_categories", this.categories);
    return { ...this.categories[idx] };
  }

  async getCountries(): Promise<AdminCountry[]> {
    this.loadFromStorage();
    return [...this.countries];
  }

  async addCountry(country: Omit<AdminCountry, "id">): Promise<AdminCountry> {
    const newCountry: AdminCountry = { ...country, id: `c-${Date.now()}` };
    this.countries.push(newCountry);
    this.persist("giftedpro_countries", this.countries);
    return newCountry;
  }

  async deleteCountry(id: string): Promise<void> {
    this.countries = this.countries.filter((c) => c.id !== id);
    this.persist("giftedpro_countries", this.countries);
  }

  async toggleCountryStatus(id: string): Promise<AdminCountry> {
    const idx = this.countries.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Country not found");
    this.countries[idx].isActive = !this.countries[idx].isActive;
    this.persist("giftedpro_countries", this.countries);
    return { ...this.countries[idx] };
  }

  // 6. DJs & Translators Roster
  async getDJs(): Promise<AdminDJ[]> {
    this.loadFromStorage();
    return [...this.djs];
  }

  async addDJ(dj: Omit<AdminDJ, "id" | "activeTitlesCount" | "totalStreams">): Promise<AdminDJ> {
    const newDj: AdminDJ = {
      ...dj,
      id: `dj-${Date.now()}`,
      activeTitlesCount: 0,
      totalStreams: 0,
    };
    this.djs.push(newDj);
    this.kpis.totalDjs = this.djs.length;
    this.persist("giftedpro_djs", this.djs);
    return newDj;
  }

  async updateDJ(id: string, updates: Partial<AdminDJ>): Promise<AdminDJ> {
    const idx = this.djs.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error("DJ not found");
    this.djs[idx] = { ...this.djs[idx], ...updates };
    this.persist("giftedpro_djs", this.djs);
    return this.djs[idx];
  }

  async deleteDJ(id: string): Promise<void> {
    this.djs = this.djs.filter((d) => d.id !== id);
    this.kpis.totalDjs = this.djs.length;
    this.persist("giftedpro_djs", this.djs);
  }

  async getDJRoyalties(): Promise<DJRoyaltyConfig[]> {
    return [...this.djRoyalties];
  }

  // 7. Discovery (Featured & Trending)
  async getFeaturedItems(): Promise<FeaturedItem[]> {
    this.loadFromStorage();
    return [...this.featuredItems].sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async toggleFeaturedItem(id: string): Promise<FeaturedItem> {
    const item = this.featuredItems.find((f) => f.id === id);
    if (!item) throw new Error("Featured item not found");
    item.isActive = !item.isActive;
    this.persist("giftedpro_featured_items", this.featuredItems);
    return { ...item };
  }

  async addFeaturedItem(item: Omit<FeaturedItem, "id" | "startedAt" | "displayOrder">): Promise<FeaturedItem> {
    const nextOrder = this.featuredItems.length > 0 ? Math.max(...this.featuredItems.map(f => f.displayOrder)) + 1 : 1;
    const newItem: FeaturedItem = {
      ...item,
      id: `feat-${Date.now()}`,
      displayOrder: nextOrder,
      startedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };
    this.featuredItems.push(newItem);
    this.persist("giftedpro_featured_items", this.featuredItems);
    return newItem;
  }

  async removeFeaturedItem(id: string): Promise<void> {
    this.featuredItems = this.featuredItems.filter((f) => f.id !== id);
    this.featuredItems.sort((a, b) => a.displayOrder - b.displayOrder);
    this.featuredItems.forEach((f, idx) => {
      f.displayOrder = idx + 1;
    });
    this.persist("giftedpro_featured_items", this.featuredItems);
  }

  async updateFeaturedItem(id: string, updates: Partial<FeaturedItem>): Promise<FeaturedItem> {
    const idx = this.featuredItems.findIndex((f) => f.id === id);
    if (idx === -1) throw new Error("Featured item not found");
    this.featuredItems[idx] = { ...this.featuredItems[idx], ...updates };
    this.persist("giftedpro_featured_items", this.featuredItems);
    return { ...this.featuredItems[idx] };
  }

  async moveFeaturedItem(id: string, direction: 'up' | 'down'): Promise<FeaturedItem[]> {
    const sorted = [...this.featuredItems].sort((a, b) => a.displayOrder - b.displayOrder);
    const index = sorted.findIndex((f) => f.id === id);
    if (index === -1) return sorted;

    if (direction === 'up' && index > 0) {
      const prev = sorted[index - 1];
      const current = sorted[index];
      const tempOrder = prev.displayOrder;
      prev.displayOrder = current.displayOrder;
      current.displayOrder = tempOrder;
    } else if (direction === 'down' && index < sorted.length - 1) {
      const next = sorted[index + 1];
      const current = sorted[index];
      const tempOrder = next.displayOrder;
      next.displayOrder = current.displayOrder;
      current.displayOrder = tempOrder;
    }

    this.featuredItems = sorted.sort((a, b) => a.displayOrder - b.displayOrder);
    this.persist("giftedpro_featured_items", this.featuredItems);
    return [...this.featuredItems];
  }

  // --- Customer Dynamic Retrieval Methods (Connected to Admin Actions) ---

  async getHeroBillboardMovies(): Promise<AdminMovie[]> {
    this.loadFromStorage();
    const activeFeat = this.featuredItems
      .filter((f) => f.isActive !== false)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    if (activeFeat.length === 0) {
      // Fallback to published billboard movies
      return this.movies.filter(
        (m) => m.status === "published" && (m.isFeaturedBillboard || m.isFeatured || m.isTrending)
      );
    }

    const billboardList: AdminMovie[] = [];
    for (const feat of activeFeat) {
      if (feat.contentType === "movie") {
        const found = this.movies.find((m) => m.id === feat.contentId);
        if (found) {
          billboardList.push({
            ...found,
            backdropUrl: feat.backdropUrl || found.backdropUrl,
            posterUrl: feat.posterUrl || found.posterUrl,
          });
        } else {
          billboardList.push({
            id: feat.contentId,
            title: feat.title,
            originalTitle: feat.title,
            slug: feat.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            releaseYear: 2024,
            durationMinutes: 120,
            posterUrl: feat.posterUrl,
            backdropUrl: feat.backdropUrl,
            description: "Curated blockbuster premiere featured on GIFTEDproMovies.",
            genres: [feat.category],
            countries: ["Tanzania"],
            ageRating: "16+",
            rating: 8.8,
            streamingStatus: "streaming_ready",
            downloadStatus: "download_ready",
            status: "published",
            isFeatured: true,
            isTrending: true,
            versions: [],
            viewsCount: 25000,
            purchasesCount: 3200,
            downloadsCount: 1800,
            publishedAt: feat.startedAt,
            streamPriceTsh: 1500,
            downloadPriceTsh: 2500,
            availableDjs: ["DJ Afro Amigo"],
            isFeaturedBillboard: true,
          });
        }
      } else {
        const foundSeries = this.series.find((s) => s.id === feat.contentId);
        billboardList.push({
          id: feat.contentId,
          title: feat.title,
          originalTitle: feat.title,
          slug: foundSeries ? foundSeries.slug : feat.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          releaseYear: foundSeries?.releaseYear || 2024,
          durationMinutes: 60,
          posterUrl: feat.posterUrl,
          backdropUrl: feat.backdropUrl,
          description: "Featured multi-episode drama series.",
          genres: [feat.category],
          countries: foundSeries?.countries || ["Tanzania"],
          ageRating: "16+",
          rating: 9.1,
          streamingStatus: "streaming_ready",
          downloadStatus: "download_ready",
          status: "published",
          isFeatured: true,
          isTrending: true,
          versions: [],
          viewsCount: 38000,
          purchasesCount: 5400,
          downloadsCount: 2900,
          publishedAt: feat.startedAt,
          streamPriceTsh: foundSeries?.defaultEpisodeStreamPriceTsh || 500,
          downloadPriceTsh: foundSeries?.defaultEpisodeDownloadPriceTsh || 1000,
          availableDjs: foundSeries?.leadDjName ? [foundSeries.leadDjName] : ["DJ Afro Amigo"],
          isFeaturedBillboard: true,
        });
      }
    }
    return billboardList;
  }

  async getCustomerNewReleases(): Promise<AdminMovie[]> {
    this.loadFromStorage();
    return [...this.movies]
      .filter((m) => m.status === "published")
      .sort((a, b) => {
        const timeA = new Date(a.publishedAt).getTime();
        const timeB = new Date(b.publishedAt).getTime();
        if (isNaN(timeA)) return 1;
        if (isNaN(timeB)) return -1;
        return timeB - timeA;
      });
  }

  async getCustomerTrendingMovies(): Promise<AdminMovie[]> {
    this.loadFromStorage();
    const sorted = [...this.trendingItems].sort((a, b) => a.rank - b.rank);
    const list: AdminMovie[] = [];

    for (const item of sorted) {
      if (item.contentType === "movie") {
        const found = this.movies.find((m) => m.id === item.contentId);
        if (found) {
          list.push({ ...found, isTrending: true });
        } else {
          list.push({
            id: item.contentId,
            title: item.title,
            originalTitle: item.title,
            slug: item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            releaseYear: 2024,
            durationMinutes: 120,
            posterUrl: item.posterUrl,
            backdropUrl: item.posterUrl,
            description: "Top 10 Trending blockbuster in East Africa.",
            genres: [item.category],
            countries: ["Tanzania"],
            ageRating: "16+",
            rating: 8.9,
            streamingStatus: "streaming_ready",
            downloadStatus: "download_ready",
            status: "published",
            isFeatured: false,
            isTrending: true,
            versions: [],
            viewsCount: 35000,
            purchasesCount: 4200,
            downloadsCount: 2100,
            publishedAt: "Trending",
            streamPriceTsh: 1500,
            downloadPriceTsh: 2500,
            availableDjs: ["DJ Afro Amigo"],
          });
        }
      } else {
        const foundSeries = this.series.find((s) => s.id === item.contentId);
        list.push({
          id: item.contentId,
          title: item.title,
          originalTitle: item.title,
          slug: foundSeries ? foundSeries.slug : item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          releaseYear: foundSeries?.releaseYear || 2024,
          durationMinutes: 60,
          posterUrl: item.posterUrl,
          backdropUrl: foundSeries?.backdropUrl || item.posterUrl,
          description: "Top 10 Trending series in East Africa.",
          genres: [item.category],
          countries: foundSeries?.countries || ["Tanzania"],
          ageRating: "16+",
          rating: 9.0,
          streamingStatus: "streaming_ready",
          downloadStatus: "download_ready",
          status: "published",
          isFeatured: false,
          isTrending: true,
          versions: [],
          viewsCount: 42000,
          purchasesCount: 5100,
          downloadsCount: 2800,
          publishedAt: "Trending",
          streamPriceTsh: foundSeries?.defaultEpisodeStreamPriceTsh || 500,
          downloadPriceTsh: foundSeries?.defaultEpisodeDownloadPriceTsh || 1000,
          availableDjs: foundSeries?.leadDjName ? [foundSeries.leadDjName] : ["DJ Afro Amigo"],
        });
      }
    }

    if (list.length === 0) {
      return this.movies.filter((m) => m.status === "published" && m.isTrending);
    }

    return list;
  }

  async getCustomerPopularMovies(): Promise<AdminMovie[]> {
    this.loadFromStorage();
    return [...this.movies]
      .filter((m) => m.status === "published")
      .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
  }

  async getTrendingItems(): Promise<TrendingItem[]> {
    this.loadFromStorage();
    return [...this.trendingItems].sort((a, b) => a.rank - b.rank);
  }

  async addTrendingItem(item: {
    contentId: string;
    contentType: 'movie' | 'series';
    title: string;
    posterUrl: string;
    category: string;
  }): Promise<TrendingItem> {
    const nextRank = this.trendingItems.length + 1;
    const newItem: TrendingItem = {
      id: `tr-${Date.now()}`,
      contentId: item.contentId,
      contentType: item.contentType,
      title: item.title,
      posterUrl: item.posterUrl,
      rank: nextRank,
      viewsVelocity: Math.floor(Math.random() * 400) + 600,
      isManuallyPromoted: true,
      category: item.category,
    };
    this.trendingItems.push(newItem);
    this.persist("giftedpro_trending_items", this.trendingItems);
    return newItem;
  }

  async removeTrendingItem(id: string): Promise<void> {
    this.trendingItems = this.trendingItems.filter((t) => t.id !== id);
    this.trendingItems.sort((a, b) => a.rank - b.rank);
    this.trendingItems.forEach((t, idx) => {
      t.rank = idx + 1;
    });
    this.persist("giftedpro_trending_items", this.trendingItems);
  }

  async moveTrendingItem(id: string, direction: 'up' | 'down'): Promise<TrendingItem[]> {
    const sorted = [...this.trendingItems].sort((a, b) => a.rank - b.rank);
    const index = sorted.findIndex((t) => t.id === id);
    if (index === -1) return sorted;

    if (direction === 'up' && index > 0) {
      const prev = sorted[index - 1];
      const current = sorted[index];
      const tempRank = prev.rank;
      prev.rank = current.rank;
      current.rank = tempRank;
    } else if (direction === 'down' && index < sorted.length - 1) {
      const next = sorted[index + 1];
      const current = sorted[index];
      const tempRank = next.rank;
      next.rank = current.rank;
      current.rank = tempRank;
    }

    this.trendingItems = sorted.sort((a, b) => a.rank - b.rank);
    this.persist("giftedpro_trending_items", this.trendingItems);
    return [...this.trendingItems];
  }

  async toggleManualTrending(id: string): Promise<TrendingItem> {
    const item = this.trendingItems.find((t) => t.id === id);
    if (!item) throw new Error("Trending item not found");
    item.isManuallyPromoted = !item.isManuallyPromoted;
    this.persist("giftedpro_trending_items", this.trendingItems);
    return { ...item };
  }

  async pinTrendingToTop(id: string): Promise<TrendingItem[]> {
    const item = this.trendingItems.find((t) => t.id === id);
    if (!item) throw new Error("Trending item not found");
    item.isManuallyPromoted = true;

    const others = this.trendingItems.filter((t) => t.id !== id).sort((a, b) => a.rank - b.rank);
    this.trendingItems = [item, ...others];
    this.trendingItems.forEach((t, idx) => {
      t.rank = idx + 1;
    });
    this.persist("giftedpro_trending_items", this.trendingItems);
    return [...this.trendingItems];
  }

  // 8. Customers
  async getCustomers(filter?: {
    vipTier?: string;
    status?: string;
    query?: string;
  }): Promise<AdminCustomer[]> {
    let result = [...this.customers];
    if (filter?.vipTier && filter.vipTier !== "all") {
      result = result.filter((c) => c.vipTier === filter.vipTier);
    }
    if (filter?.status && filter.status !== "all") {
      result = result.filter((c) => c.status === filter.status);
    }
    if (filter?.query && filter.query.trim()) {
      const q = filter.query.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q)
      );
    }
    return result;
  }

  async getCustomerById(id: string): Promise<AdminCustomer | null> {
    return this.customers.find((c) => c.id === id) || null;
  }

  async updateCustomerStatus(id: string, status: CustomerStatus): Promise<AdminCustomer> {
    const customer = this.customers.find((c) => c.id === id);
    if (!customer) throw new Error("Customer not found");
    customer.status = status;
    return { ...customer };
  }

  async extendCustomerPass(id: string, additionalDays: number): Promise<AdminCustomer> {
    const customer = this.customers.find((c) => c.id === id);
    if (!customer) throw new Error("Customer not found");
    customer.passExpiresAt = `Extended +${additionalDays} days`;
    customer.status = "active";
    return { ...customer };
  }

  async revokeCustomerDevice(customerId: string, deviceId: string): Promise<AdminCustomer> {
    const customer = this.customers.find((c) => c.id === customerId);
    if (!customer) throw new Error("Customer not found");
    customer.devices = customer.devices.filter((d) => d.id !== deviceId);
    return { ...customer };
  }

  // 9. Media Team Staff Administration & Audit Logs
  async getMediaTeamStaff(): Promise<MediaTeamStaff[]> {
    this.loadFromStorage();
    return [...this.staff];
  }

  async addStaffMember(staff: Omit<MediaTeamStaff, "id">): Promise<MediaTeamStaff> {
    const member: MediaTeamStaff = { ...staff, id: `staff-${Date.now()}` };
    this.staff.push(member);
    this.persist("giftedpro_media_staff", this.staff);
    await this.addMediaAuditLog({
      operatorId: member.id,
      operatorName: member.name,
      operatorAvatar: member.avatarUrl,
      action: "STATUS_CHANGE",
      actionLabel: "Operator Onboarded",
      contentId: "staff-ops",
      contentTitle: member.name,
      contentType: "movie",
      details: `Added with ${member.isFullAccess ? "Full Studio Access" : "Custom Permissions"}`,
    });
    return member;
  }

  async updateStaffMember(id: string, updates: Partial<MediaTeamStaff>): Promise<MediaTeamStaff> {
    const idx = this.staff.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error("Staff member not found");
    this.staff[idx] = { ...this.staff[idx], ...updates };
    this.persist("giftedpro_media_staff", this.staff);
    return this.staff[idx];
  }

  async toggleStaffStatus(id: string): Promise<MediaTeamStaff> {
    const member = this.staff.find((s) => s.id === id);
    if (!member) throw new Error("Staff member not found");
    member.status = member.status === "active" ? "inactive" : "active";
    this.persist("giftedpro_media_staff", this.staff);
    await this.addMediaAuditLog({
      operatorId: member.id,
      operatorName: member.name,
      operatorAvatar: member.avatarUrl,
      action: "STATUS_CHANGE",
      actionLabel: member.status === "active" ? "Account Activated" : "Account Suspended",
      contentId: "staff-ops",
      contentTitle: member.name,
      contentType: "movie",
      details: `Admin changed status to ${member.status}`,
    });
    return { ...member };
  }

  async deleteStaffMember(id: string): Promise<void> {
    this.staff = this.staff.filter((s) => s.id !== id);
    this.persist("giftedpro_media_staff", this.staff);
  }

  async getMediaAuditLogs(filter?: {
    operatorId?: string;
    action?: string;
    query?: string;
  }): Promise<MediaAuditLog[]> {
    this.loadFromStorage();
    let result = [...this.mediaAuditLogs];
    if (filter?.operatorId && filter.operatorId !== "all") {
      result = result.filter((l) => l.operatorId === filter.operatorId);
    }
    if (filter?.action && filter.action !== "all") {
      result = result.filter((l) => l.action === filter.action);
    }
    if (filter?.query && filter.query.trim()) {
      const q = filter.query.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.contentTitle.toLowerCase().includes(q) ||
          l.operatorName.toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q) ||
          l.actionLabel.toLowerCase().includes(q)
      );
    }
    return result;
  }

  async addMediaAuditLog(entry: Omit<MediaAuditLog, "id" | "timestamp">): Promise<MediaAuditLog> {
    const newLog: MediaAuditLog = {
      ...entry,
      id: `log-${Date.now()}`,
      timestamp: "Just now",
    };
    this.mediaAuditLogs.unshift(newLog);
    this.persist("giftedpro_media_audit_logs", this.mediaAuditLogs);
    return newLog;
  }

  // 10. Pricing & Subscriptions
  async getSubscriptionPlans(): Promise<SubscriptionPlanConfig[]> {
    return [...this.subscriptionPlans];
  }

  async getSubscriptionPasses(): Promise<SubscriptionPlanConfig[]> {
    return [...this.subscriptionPlans];
  }

  async updateSubscriptionPassPrice(id: string, newPriceTsh: number): Promise<SubscriptionPlanConfig> {
    const pass = this.subscriptionPlans.find((p) => p.id === id);
    if (!pass) throw new Error("Plan not found");
    pass.priceTsh = newPriceTsh;
    pass.currentPriceTsh = newPriceTsh;
    return { ...pass };
  }

  async getPPVRates(): Promise<PPVRateTier[]> {
    return [...this.ppvRates];
  }

  async updatePPVRate(id: string, streamPriceTsh: number, downloadPriceTsh: number): Promise<PPVRateTier> {
    const rate = this.ppvRates.find((r) => r.id === id);
    if (!rate) throw new Error("PPV tier not found");
    rate.streamPriceTsh = streamPriceTsh;
    rate.downloadPriceTsh = downloadPriceTsh;
    this.persist("giftedpro_ppv_rates", this.ppvRates);
    return { ...rate };
  }

  // 11. Sales & Content Performance Analytics
  async getMonthlySales(): Promise<MonthSalesData[]> {
    return [...mockMonthlySalesData];
  }

  async getSalesTrends(monthId?: string): Promise<SalesTrend[]> {
    if (monthId) {
      const found = mockMonthlySalesData.find((m) => m.monthId === monthId);
      if (found) return [...found.weeks];
    }
    return [...this.salesTrends];
  }

  async getContentPerformances(): Promise<ContentPerformance[]> {
    return [...this.contentPerformances];
  }

  async getAudienceAnalytics(): Promise<AudienceAnalytics> {
    return { ...this.audienceAnalytics };
  }

  async getContentAnalytics(): Promise<ContentAnalytics> {
    return { ...this.contentAnalytics };
  }

  // 12. Settings & Policies
  async getPlatformSettings(): Promise<AdminPlatformSettings> {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("giftedpro_platform_settings");
      if (stored) {
        try {
          return { ...this.platformSettings, ...JSON.parse(stored) };
        } catch {}
      }
    }
    return { ...this.platformSettings };
  }

  async updatePlatformSettings(settings: Partial<AdminPlatformSettings>): Promise<AdminPlatformSettings> {
    this.platformSettings = { ...this.platformSettings, ...settings };
    if (typeof window !== "undefined") {
      localStorage.setItem("giftedpro_platform_settings", JSON.stringify(this.platformSettings));
    }
    return { ...this.platformSettings };
  }

  async isPublishingApprovalRequired(): Promise<boolean> {
    const s = await this.getPlatformSettings();
    return s.publishingRequiresApproval ?? true;
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
    return [...this.gateways];
  }

  async requestSettlement(amountTsh: number): Promise<{ success: boolean; message: string; remainingTsh: number }> {
    return {
      success: true,
      message: `Commercial transfer of TZS ${amountTsh.toLocaleString()} initiated.`,
      remainingTsh: 0,
    };
  }
}

export const adminRepository = new AdminRepository();
