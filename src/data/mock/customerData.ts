import {
  MovieItem,
  SeriesItem,
  DjItem,
  CategoryItem,
  CountryItem,
  SubscriptionPlan,
  ContinueWatchingItem,
  CustomerEntitlement,
  CustomerProfile,
  SearchResultGroup,
} from '@/types/customer';

// Genuine published titles synchronized with PostgreSQL giftedpro_dev database
export const customerMovies: MovieItem[] = [
  {
    id: "44444444-c444-4000-8000-000000000001",
    title: "Bongo Secret Agent: Serengeti Strike",
    originalTitle: "Bongo Secret Agent: Serengeti Strike",
    slug: "bongo-secret-agent-serengeti-strike",
    releaseYear: 2024,
    durationMinutes: 118,
    posterUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=60",
    backdropUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80",
    trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    description: "An elite operative navigates thrilling high-stakes espionage across the East African savannah.",
    genres: ["Action", "Swahili Movies"],
    countries: ["Kenya", "Tanzania"],
    ageRating: "16+",
    rating: 8.9,
    streamingStatus: "streaming_ready",
    downloadStatus: "download_ready",
    status: "published",
    isFeatured: true,
    isTrending: true,
    isFeaturedBillboard: true,
    versions: [
      {
        id: "v-bongo-afro",
        djId: "33333333-d333-4000-8000-000000000001",
        djName: "DJ Afro",
        streamingPriceTsh: 1500,
        downloadPriceTsh: 2500,
        accessDurationHours: 48,
        streamingStatus: "streaming_ready",
        downloadStatus: "download_ready",
        isDefault: true,
      },
      {
        id: "v-bongo-smith",
        djId: "33333333-d333-4000-8000-000000000002",
        djName: "DJ Smith",
        streamingPriceTsh: 1500,
        downloadPriceTsh: 2500,
        accessDurationHours: 48,
        streamingStatus: "streaming_ready",
        downloadStatus: "download_ready",
        isDefault: false,
      },
    ],
    viewsCount: 0,
    purchasesCount: 0,
    downloadsCount: 0,
    publishedAt: "2024-11-01T00:00:00.000Z",
    streamPriceTsh: 1500,
    downloadPriceTsh: 2500,
    availableDjs: ["DJ Afro", "DJ Smith"],
  },
  {
    id: "44444444-c444-4000-8000-000000000002",
    title: "Kilimanjaro Shadows",
    originalTitle: "Kilimanjaro Shadows",
    slug: "kilimanjaro-shadows",
    releaseYear: 2023,
    durationMinutes: 104,
    posterUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60",
    backdropUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200&auto=format&fit=crop&q=80",
    trailerUrl: undefined,
    description: "A gripping drama surrounding an inheritance conflict and redemption in the foothills of Mount Kilimanjaro.",
    genres: ["Drama", "Swahili Movies"],
    countries: ["Tanzania"],
    ageRating: "16+",
    rating: 8.7,
    streamingStatus: "streaming_ready",
    downloadStatus: "download_ready",
    status: "published",
    isFeatured: true,
    isTrending: false,
    versions: [
      {
        id: "v-kili-murphy",
        djId: "33333333-d333-4000-8000-000000000003",
        djName: "DJ Murphy",
        streamingPriceTsh: 1500,
        downloadPriceTsh: 2500,
        accessDurationHours: 48,
        streamingStatus: "streaming_ready",
        downloadStatus: "download_ready",
        isDefault: true,
      },
    ],
    viewsCount: 0,
    purchasesCount: 0,
    downloadsCount: 0,
    publishedAt: "2024-11-02T00:00:00.000Z",
    streamPriceTsh: 1500,
    downloadPriceTsh: 2500,
    availableDjs: ["DJ Murphy"],
  },
  {
    id: "44444444-c444-4000-8000-000000000003",
    title: "Nairobi Cyber Heist",
    originalTitle: "Nairobi Cyber Heist",
    slug: "nairobi-cyber-heist",
    releaseYear: 2024,
    durationMinutes: 125,
    posterUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=60",
    backdropUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80",
    trailerUrl: undefined,
    description: "Tech prodigies attempt a cyber infiltration of a corrupt conglomerate under the bright lights of Nairobi.",
    genres: ["Action", "Sci-Fi"],
    countries: ["Kenya", "United States"],
    ageRating: "16+",
    rating: 8.6,
    streamingStatus: "streaming_ready",
    downloadStatus: "download_ready",
    status: "published",
    isFeatured: false,
    isTrending: true,
    versions: [
      {
        id: "v-nairobi-smith",
        djId: "33333333-d333-4000-8000-000000000002",
        djName: "DJ Smith",
        streamingPriceTsh: 1500,
        downloadPriceTsh: 2500,
        accessDurationHours: 48,
        streamingStatus: "streaming_ready",
        downloadStatus: "download_ready",
        isDefault: true,
      },
    ],
    viewsCount: 0,
    purchasesCount: 0,
    downloadsCount: 0,
    publishedAt: "2024-11-03T00:00:00.000Z",
    streamPriceTsh: 1500,
    downloadPriceTsh: 2500,
    availableDjs: ["DJ Smith"],
  },
];

// Published series (Zero currently in PostgreSQL)
export const customerSeries: SeriesItem[] = [];

// DJs (Synchronized with PostgreSQL dj_voice_artists)
export const customerDjs: DjItem[] = [
  {
    id: "33333333-d333-4000-8000-000000000001",
    name: "Dennis Afro",
    stageName: "DJ Afro",
    slug: "dj-afro",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    bio: "Pioneer of East African live cinematic commentary and translation.",
    tier: "Master",
    contractType: "Exclusive Royalty",
    activeTitlesCount: 1,
    totalStreams: 0,
    status: "active",
    colorHex: "#E50914",
  },
  {
    id: "33333333-d333-4000-8000-000000000002",
    name: "Smith Mack",
    stageName: "DJ Smith",
    slug: "dj-smith",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    bio: "Renowned voice commentator for high-octane action and kung-fu blockbusters.",
    tier: "Pro",
    contractType: "Standard Royalty",
    activeTitlesCount: 2,
    totalStreams: 0,
    status: "active",
    colorHex: "#3B82F6",
  },
  {
    id: "33333333-d333-4000-8000-000000000003",
    name: "Murphy Black",
    stageName: "DJ Murphy",
    slug: "dj-murphy",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
    bio: "Dramatic thriller and crime story narrator delivering suspenseful voiceovers.",
    tier: "Pro",
    contractType: "Standard Royalty",
    activeTitlesCount: 1,
    totalStreams: 0,
    status: "active",
    colorHex: "#10B981",
  },
  {
    id: "33333333-d333-4000-8000-000000000004",
    name: "Black Mamba",
    stageName: "DJ Black",
    slug: "dj-black",
    avatarUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80",
    bio: "Energetic comedy and urban drama voice artist.",
    tier: "Rising",
    contractType: "Standard Royalty",
    activeTitlesCount: 0,
    totalStreams: 0,
    status: "active",
    colorHex: "#F59E0B",
  },
];

// Categories (Synchronized with PostgreSQL categories)
export const customerCategories: CategoryItem[] = [
  { id: "11111111-c111-4000-8000-000000000001", name: "Action", slug: "action", description: "Action movies", displayOrder: 1, contentCount: 2, isActive: true },
  { id: "11111111-c111-4000-8000-000000000002", name: "Drama", slug: "drama", description: "Drama movies", displayOrder: 2, contentCount: 1, isActive: true },
  { id: "11111111-c111-4000-8000-000000000003", name: "Comedy", slug: "comedy", description: "Comedy movies", displayOrder: 3, contentCount: 0, isActive: true },
  { id: "11111111-c111-4000-8000-000000000004", name: "Sci-Fi", slug: "sci-fi", description: "Sci-Fi movies", displayOrder: 4, contentCount: 1, isActive: true },
  { id: "11111111-c111-4000-8000-000000000005", name: "Swahili Movies", slug: "swahili-movies", description: "Swahili movies", displayOrder: 5, contentCount: 2, isActive: true },
];

// Countries (Synchronized with PostgreSQL countries)
export const customerCountries: CountryItem[] = [
  { id: "22222222-c222-4000-8000-000000000001", code: "TZ", name: "Tanzania", flagEmoji: "🇹🇿", contentCount: 2, isActive: true },
  { id: "22222222-c222-4000-8000-000000000002", code: "KE", name: "Kenya", flagEmoji: "🇰🇪", contentCount: 2, isActive: true },
  { id: "22222222-c222-4000-8000-000000000003", code: "UG", name: "Uganda", flagEmoji: "🇺🇬", contentCount: 0, isActive: true },
  { id: "22222222-c222-4000-8000-000000000005", code: "NG", name: "Nigeria", flagEmoji: "🇳🇬", contentCount: 0, isActive: true },
  { id: "22222222-c222-4000-8000-000000000006", code: "ZA", name: "South Africa", flagEmoji: "🇿🇦", contentCount: 0, isActive: true },
  { id: "22222222-c222-4000-8000-000000000004", code: "US", name: "United States", flagEmoji: "🇺🇸", contentCount: 1, isActive: true },
];

// Commercial plans (Synchronized with PostgreSQL access_plans)
export const customerPlans: SubscriptionPlan[] = [
  {
    id: "plan-svod-30d",
    name: "VIP Cinema Pass (30 Days)",
    durationDays: 30,
    durationLabel: "30 Days Pass",
    priceTsh: 15000,
    isPopular: true,
    features: [
      "Unlimited streaming across all genres",
      "Multi-DJ audio commentary tracks",
      "High Definition 1080p video quality",
    ],
    status: "active",
  },
  {
    id: "plan-tvod-48h",
    name: "Single Movie Rental (48 Hours)",
    durationDays: 2,
    durationLabel: "48 Hours Access",
    priceTsh: 2500,
    isPopular: false,
    features: [
      "Single movie download and playback",
      "Multi-DJ audio commentary tracks",
      "High Definition 1080p video quality",
    ],
    status: "active",
  },
];

// Billboard and discovery helpers
export const billboardMovies: MovieItem[] = customerMovies.filter(
  (m) => m.isFeaturedBillboard || m.isFeatured || m.isTrending
);

export const trendingMovies: MovieItem[] = customerMovies.filter(
  (m) => m.isTrending
);

export const featuredMovies: MovieItem[] = customerMovies.filter(
  (m) => m.isFeatured
);

export const newReleases: MovieItem[] = [...customerMovies].sort((a, b) => {
  const timeA = new Date(a.publishedAt).getTime();
  const timeB = new Date(b.publishedAt).getTime();
  return timeB - timeA;
});

export const popularMovies: MovieItem[] = [...customerMovies];

// Authenticated Customer Profile (Grounded in Verified Account)
export const mockCustomerProfile: CustomerProfile = {
  id: "ce1ba52b-751d-4cb7-ba9f-3c02c9e14156",
  fullName: "Local Development Tester",
  email: "tester@giftedpromovies.com",
  phoneMasked: "+255 754 *** 001",
  isVip: false,
  vipTierName: "Standard Customer",
  vipExpiresAt: "None",
  avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80",
};

// Zero simulated continue watching items in real database
export const mockContinueWatching: ContinueWatchingItem[] = [];

// Zero fake entitlements in real database
export const mockCustomerEntitlements: CustomerEntitlement[] = [];

// Search catalog helper
export function searchCustomerCatalog(query: string): SearchResultGroup {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) {
    return {
      movies: [],
      series: [],
      djs: [],
      categories: [],
    };
  }

  const movies = customerMovies.filter(
    (m) =>
      m.title.toLowerCase().includes(cleanQuery) ||
      m.description.toLowerCase().includes(cleanQuery) ||
      m.genres.some((g) => g.toLowerCase().includes(cleanQuery)) ||
      (m.availableDjs && m.availableDjs.some((dj) => dj.toLowerCase().includes(cleanQuery))) ||
      m.countries.some((c) => c.toLowerCase().includes(cleanQuery))
  );

  const series = customerSeries.filter(
    (s) =>
      s.title.toLowerCase().includes(cleanQuery) ||
      s.genres.some((g) => g.toLowerCase().includes(cleanQuery))
  );

  const djs = customerDjs.filter(
    (d) =>
      d.name.toLowerCase().includes(cleanQuery) ||
      d.bio.toLowerCase().includes(cleanQuery)
  );

  const categories = customerCategories.filter((c) =>
    c.name.toLowerCase().includes(cleanQuery)
  );

  return { movies, series, djs, categories };
}

export function getMovieBySlug(slug: string): MovieItem | undefined {
  return customerMovies.find((m) => m.slug === slug);
}

export function getSeriesBySlug(slug: string): SeriesItem | undefined {
  return customerSeries.find((s) => s.slug === slug);
}

export function getDjBySlug(slug: string): DjItem | undefined {
  return customerDjs.find((d) => d.slug === slug);
}

export function getCategoryBySlug(slug: string): CategoryItem | undefined {
  return customerCategories.find((c) => c.slug === slug);
}

export function getCountryBySlug(slug: string): CountryItem | undefined {
  return customerCountries.find((c) => c.code.toLowerCase() === slug.toLowerCase() || c.name.toLowerCase().replace(/\s+/g, '-') === slug.toLowerCase());
}
