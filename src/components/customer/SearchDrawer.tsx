'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCustomer } from '@/context/CustomerContext';
import {
  Search,
  X,
  Film,
  Tv,
  Mic,
  Grid,
  ArrowRight,
  Star,
  Clock,
  Sparkles,
} from 'lucide-react';
import { catalogApi } from '@/lib/api/catalogApi';
import { adminRepository } from '@/lib/repositories/adminRepository';
import { SearchResultGroup, MovieItem, DjItem, CategoryItem } from '@/types/customer';

const QUICK_FILTERS = ['All', 'Action', 'DJ Murphy', 'DJ Afro Amigo', 'Tanzania', 'Thriller'];

export function SearchDrawer() {
  const { isSearchOpen, closeSearch } = useCustomer();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [results, setResults] = useState<SearchResultGroup>({
    movies: [],
    series: [],
    djs: [],
    categories: [],
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ movies: [], series: [], djs: [], categories: [] });
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ movies: [], series: [], djs: [], categories: [] });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const [searchRes, allDjs, allCats] = await Promise.all([
          catalogApi.searchTitles(query.trim(), 10).catch(() => ({ items: [] })),
          adminRepository.getDJs().catch(() => []),
          adminRepository.getCategories().catch(() => []),
        ]);

                const mappedMovies: MovieItem[] = (searchRes.items || []).map((t) => ({
          id: t.id,
          title: t.title,
          originalTitle: t.originalTitle || t.title,
          slug: t.slug,
          releaseYear: t.releaseYear,
          durationMinutes: t.durationMinutes,
          rating: 8.5,
          posterUrl: t.posterUrl || '/images/placeholders/movie_card_empty.svg',
          backdropUrl: t.backdropUrl || '/images/placeholders/movie_card_empty.svg',
          description: t.description || 'Swahili Translated Movie',
          genres: (t.categories || []).map((c) => c.name),
          countries: (t.countries || []).map((c) => c.name),
          ageRating: '16+',
          streamingStatus: 'streaming_ready',
          downloadStatus: 'download_ready',
          status: 'published',
          isFeatured: false,
          isTrending: false,
          viewsCount: 0,
          purchasesCount: 0,
          downloadsCount: 0,
          publishedAt: t.publishedAt || new Date().toISOString(),
          versions: [
            {
              id: 'v-' + t.id,
              djId: 'dj-murphy',
              djName: 'DJ Murphy',
              streamingPriceTsh: 1500,
              downloadPriceTsh: 2500,
              accessDurationHours: 48,
              streamingStatus: 'streaming_ready',
              downloadStatus: 'download_ready',
              isDefault: true,
            },
          ],
        }));

        const qLower = query.toLowerCase();
                const matchedDjs: DjItem[] = allDjs
          .filter((d) => (d.name || d.stageName || '').toLowerCase().includes(qLower))
          .map((d) => ({
            id: d.id,
            name: d.name || d.stageName,
            stageName: d.stageName || d.name,
            slug: d.slug,
            avatarUrl: d.avatarUrl || '/images/placeholders/movie_card_empty.svg',
            bio: d.bio || 'Professional commentary master',
            activeTitlesCount: d.activeTitlesCount || 0,
            tier: d.tier || 'Master Commentator',
            contractType: d.contractType || 'Exclusive',
            totalStreams: d.totalStreams || 0,
            status: d.status || 'active',
            colorHex: d.colorHex || '#E50914',
          }));

                const matchedCats: CategoryItem[] = allCats
          .filter((c) => c.name.toLowerCase().includes(qLower))
          .map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description || '',
            displayOrder: c.displayOrder || 0,
            contentCount: c.contentCount || 0,
            isActive: c.isActive !== false,
          }));

        setResults({
          movies: mappedMovies,
          series: [],
          djs: matchedDjs,
          categories: matchedCats,
        });
      } catch (err) {
        console.error('Search drawer error:', err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isSearchOpen) return null;

  const totalMatches =
    results.movies.length +
    results.series.length +
    results.djs.length +
    results.categories.length;

  const handleSelectFilter = (filter: string) => {
    setActiveFilter(filter);
    if (filter === 'All') {
      setQuery('');
    } else {
      setQuery(filter);
    }
  };

  const handleFullSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      closeSearch();
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/85 backdrop-blur-xl animate-billboard-fade">
      {/* Click outside */}
      <div className="absolute inset-0" onClick={closeSearch} />

      {/* Search Dialog */}
      <div className="relative z-10 w-full max-w-2xl bg-[#0E1015] border border-[#262932] rounded-3xl shadow-2xl overflow-hidden animate-modal-enter">
        {/* Search Input Bar */}
        <form onSubmit={handleFullSearch} className="relative flex items-center px-4 sm:px-6 py-4 border-b border-[#262932] bg-[#111318]">
          <Search className="w-5 h-5 text-gray-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies, series, DJs, categories..."
            className="w-full bg-transparent text-white placeholder:text-gray-500 text-sm sm:text-base outline-none font-sans"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-full bg-[#181A21] text-gray-400 hover:text-white mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={closeSearch}
            className="text-xs font-mono text-gray-400 hover:text-white px-2 py-1 rounded-lg border border-[#262932] bg-[#181A21]"
          >
            ESC
          </button>
        </form>

        {/* Quick Filter Pills */}
        <div className="px-6 py-2.5 border-b border-[#262932] bg-[#0B0C10] flex items-center gap-2 overflow-x-auto hide-scrollbar">
          <span className="text-[11px] font-mono text-gray-500 uppercase shrink-0">
            Quick:
          </span>
          {QUICK_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => handleSelectFilter(filter)}
              className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-colors ${
                activeFilter === filter
                  ? 'bg-[#E50914] text-white font-bold'
                  : 'bg-[#181A21] text-gray-400 hover:text-white border border-[#262932]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Results Area */}
        <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto space-y-6">
          {query.trim() && totalMatches === 0 && (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#181A21] border border-[#262932] flex items-center justify-center text-gray-500 mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">No matches found</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Try searching for a different title, certified DJ commentator (e.g. DJ Murphy, DJ Afro Amigo), or genre.
              </p>
            </div>
          )}

          {!query.trim() && (
            <div className="space-y-4 py-4">
              <p className="text-xs font-mono uppercase text-gray-500 tracking-wider">
                Popular Searches
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <button
                  onClick={() => setQuery('Extraction')}
                  className="p-3 rounded-xl bg-[#111318] border border-[#262932] hover:border-white/20 text-left text-gray-300 hover:text-white"
                >
                  <Film className="w-4 h-4 text-[#E50914] mb-1.5" />
                  <span className="font-semibold block truncate">Extraction 2</span>
                  <span className="text-[10px] text-gray-500">DJ Afro Amigo</span>
                </button>
                <button
                  onClick={() => setQuery('John Wick')}
                  className="p-3 rounded-xl bg-[#111318] border border-[#262932] hover:border-white/20 text-left text-gray-300 hover:text-white"
                >
                  <Film className="w-4 h-4 text-[#E50914] mb-1.5" />
                  <span className="font-semibold block truncate">John Wick: Chapter 4</span>
                  <span className="text-[10px] text-gray-500">DJ Murphy</span>
                </button>
                <button
                  onClick={() => setQuery('Murphy')}
                  className="p-3 rounded-xl bg-[#111318] border border-[#262932] hover:border-white/20 text-left text-gray-300 hover:text-white"
                >
                  <Mic className="w-4 h-4 text-[#D6A84F] mb-1.5" />
                  <span className="font-semibold block truncate">DJ Murphy Editions</span>
                  <span className="text-[10px] text-gray-500">Certified Swahili Dubs</span>
                </button>
              </div>
            </div>
          )}

          {/* Group 1: Movies */}
          {results.movies.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono uppercase text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-[#E50914]" />
                  <span>Movies ({results.movies.length})</span>
                </span>
              </div>
              <div className="divide-y divide-[#262932]/60">
                {results.movies.slice(0, 4).map((movie) => (
                  <Link
                    key={movie.id}
                    href={`/movies/${movie.slug}`}
                    onClick={closeSearch}
                    className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-[#181A21] transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-12 rounded-lg bg-[#262932] overflow-hidden shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={movie.posterUrl}
                          alt={movie.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-white group-hover:text-[#E50914] transition-colors truncate">
                          {movie.title}
                        </h5>
                        <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                          {movie.releaseYear} • {movie.genres.join(', ')} • {movie.versions?.[0]?.djName || 'Swahili Dub'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono text-emerald-400 font-bold">
                        TSh {(movie.versions?.[0]?.streamingPriceTsh || 1500).toLocaleString()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Group 2: DJs / Translators */}
          {results.djs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono uppercase text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-[#D6A84F]" />
                  <span>DJs &amp; Translators ({results.djs.length})</span>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {results.djs.slice(0, 4).map((dj) => (
                  <Link
                    key={dj.id}
                    href={`/djs/${dj.slug}`}
                    onClick={closeSearch}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-[#111318] border border-[#262932] hover:border-white/30 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#262932] overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={dj.avatarUrl}
                        alt={dj.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-white group-hover:text-[#D6A84F] transition-colors truncate">
                        {dj.name}
                      </h5>
                      <span className="text-[10px] text-gray-400 font-mono block">
                        {dj.activeTitlesCount} Translated Titles
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Group 3: Categories */}
          {results.categories.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono uppercase text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Grid className="w-3.5 h-3.5 text-blue-400" />
                  <span>Categories ({results.categories.length})</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {results.categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/categories/${cat.slug}`}
                    onClick={closeSearch}
                    className="px-3 py-1.5 rounded-xl bg-[#111318] border border-[#262932] hover:border-blue-500/50 text-xs font-medium text-gray-300 hover:text-white transition-colors"
                  >
                    {cat.name} ({cat.contentCount} titles)
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Full Results Link */}
        {query.trim() && totalMatches > 0 && (
          <div className="p-3.5 bg-[#111318] border-t border-[#262932] text-center">
            <Link
              href={`/search?q=${encodeURIComponent(query.trim())}`}
              onClick={closeSearch}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#E50914] hover:underline"
            >
              <span>View all {totalMatches} results in Discovery Page</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
