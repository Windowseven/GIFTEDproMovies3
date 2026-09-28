import {
  mockAdminMovies,
  mockAdminSeries,
  mockAdminDJs,
  mockAdminCategories,
  mockAdminCountries,
  mockSubscriptionPlans,
} from './adminData';
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

// Published movies for customer discovery
export const customerMovies: MovieItem[] = mockAdminMovies.filter(
  (m) => m.status === 'published'
);

// Published series (automatically ordered by newest platform upload / publish timestamp)
export const customerSeries: SeriesItem[] = [...mockAdminSeries]
  .filter((s) => s.status === 'published')
  .sort((a, b) => {
    const timeA = new Date(a.publishedAt).getTime();
    const timeB = new Date(b.publishedAt).getTime();
    if (isNaN(timeA)) return 1;
    if (isNaN(timeB)) return -1;
    return timeB - timeA;
  });

// DJs
export const customerDjs: DjItem[] = mockAdminDJs;

// Categories
export const customerCategories: CategoryItem[] = mockAdminCategories;

// Countries
export const customerCountries: CountryItem[] = mockAdminCountries;

// Subscription plans
export const customerPlans: SubscriptionPlan[] = mockSubscriptionPlans;

// Billboard Hero candidates
export const billboardMovies: MovieItem[] = customerMovies.filter(
  (m) => m.isFeaturedBillboard || m.isFeatured || m.isTrending
);

// Trending Movies
export const trendingMovies: MovieItem[] = customerMovies.filter(
  (m) => m.isTrending
);

// Featured VIP Movies
export const featuredMovies: MovieItem[] = customerMovies.filter(
  (m) => m.isFeatured
);

// New Releases (automatically ordered by platform upload / publish timestamp)
export const newReleases: MovieItem[] = [...customerMovies].sort((a, b) => {
  const timeA = new Date(a.publishedAt).getTime();
  const timeB = new Date(b.publishedAt).getTime();
  if (isNaN(timeA)) return 1;
  if (isNaN(timeB)) return -1;
  return timeB - timeA;
});

// Popular Movies (ordered by views/purchases)
export const popularMovies: MovieItem[] = [...customerMovies].sort(
  (a, b) => (b.viewsCount || 0) - (a.viewsCount || 0)
);

// Mock customer profile for authenticated state
export const mockCustomerProfile: CustomerProfile = {
  id: 'cust-demo-1',
  fullName: 'Baraka Mtemi',
  email: 'baraka.mtemi@giftedpromovies.com',
  phoneMasked: '+255 754 *** 892',
  isVip: true,
  vipTierName: 'VIP Ultra Monthly Pass',
  vipExpiresAt: 'Oct 18, 2026',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
};

// Mock Continue Watching list
export const mockContinueWatching: ContinueWatchingItem[] = [
  {
    id: 'cw-1',
    movieId: 'm-1',
    title: 'Extraction 2: Dar Hunt',
    posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1200&auto=format&fit=crop&q=80',
    slug: 'extraction-2-dar-hunt',
    progressPercent: 68,
    durationMinutes: 122,
    djName: 'DJ Afro Amigo',
    lastWatchedAt: 'Yesterday',
  },
  {
    id: 'cw-2',
    movieId: 'm-2',
    title: 'John Wick: Chapter 4',
    posterUrl: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=600&auto=format&fit=crop&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200&auto=format&fit=crop&q=80',
    slug: 'john-wick-chapter-4',
    progressPercent: 35,
    durationMinutes: 169,
    djName: 'DJ Murphy',
    lastWatchedAt: '3 days ago',
  },
];

// Mock Active Entitlements
export const mockCustomerEntitlements: CustomerEntitlement[] = [
  {
    id: 'ent-1',
    itemTitle: 'Extraction 2: Dar Hunt',
    itemSlug: 'extraction-2-dar-hunt',
    itemType: 'movie',
    accessType: 'stream',
    djName: 'DJ Afro Amigo',
    expiresAt: 'Sep 21, 2026',
    isActive: true,
    orderNumber: 'ORD-9042',
    amountTsh: 1500,
  },
  {
    id: 'ent-2',
    itemTitle: 'John Wick: Chapter 4',
    itemSlug: 'john-wick-chapter-4',
    itemType: 'movie',
    accessType: 'download',
    djName: 'DJ Murphy',
    expiresAt: 'Sep 25, 2026',
    isActive: true,
    orderNumber: 'ORD-8910',
    amountTsh: 2500,
  },
  {
    id: 'ent-3',
    itemTitle: 'VIP Ultra Monthly Pass',
    itemSlug: 'vip-ultra-monthly',
    itemType: 'subscription',
    accessType: 'vip_pass',
    expiresAt: 'Oct 18, 2026',
    isActive: true,
    orderNumber: 'ORD-7740',
    amountTsh: 15000,
  },
];

// Helper to query search results across movies, series, DJs, categories
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

  const movies = customerMovies
    .filter(
      (m) =>
        m.title.toLowerCase().includes(cleanQuery) ||
        m.description.toLowerCase().includes(cleanQuery) ||
        m.genres.some((g) => g.toLowerCase().includes(cleanQuery)) ||
        (m.availableDjs && m.availableDjs.some((dj) => dj.toLowerCase().includes(cleanQuery))) ||
        m.countries.some((c) => c.toLowerCase().includes(cleanQuery))
    )
    .sort((a, b) => {
      const timeA = new Date(a.publishedAt).getTime();
      const timeB = new Date(b.publishedAt).getTime();
      if (isNaN(timeA)) return 1;
      if (isNaN(timeB)) return -1;
      return timeB - timeA;
    });

  const series = customerSeries
    .filter(
      (s) =>
        s.title.toLowerCase().includes(cleanQuery) ||
        s.genres.some((g) => g.toLowerCase().includes(cleanQuery))
    )
    .sort((a, b) => {
      const timeA = new Date(a.publishedAt).getTime();
      const timeB = new Date(b.publishedAt).getTime();
      if (isNaN(timeA)) return 1;
      if (isNaN(timeB)) return -1;
      return timeB - timeA;
    });

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

// Helper to get movie by slug
export function getMovieBySlug(slug: string): MovieItem | undefined {
  return customerMovies.find((m) => m.slug === slug);
}

// Helper to get series by slug
export function getSeriesBySlug(slug: string): SeriesItem | undefined {
  return customerSeries.find((s) => s.slug === slug);
}

// Helper to get DJ by slug
export function getDjBySlug(slug: string): DjItem | undefined {
  return customerDjs.find((d) => d.slug === slug);
}

// Helper to get category by slug
export function getCategoryBySlug(slug: string): CategoryItem | undefined {
  return customerCategories.find((c) => c.slug === slug);
}

// Helper to get country by slug/code
export function getCountryBySlug(slug: string): CountryItem | undefined {
  return customerCountries.find((c) => c.code.toLowerCase() === slug.toLowerCase() || c.name.toLowerCase().replace(/\s+/g, '-') === slug.toLowerCase());
}
