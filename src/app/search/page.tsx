'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { MovieCard } from '@/components/customer/MovieCard';
import { TrailerModal } from '@/components/customer/TrailerModal';
import { LipaModal } from '@/components/customer/LipaModal';
import { SearchDrawer } from '@/components/customer/SearchDrawer';
import { adminRepository } from '@/lib/repositories/adminRepository';
import { catalogApi } from '@/lib/api/catalogApi';
import { MovieItem, CategoryItem } from '@/types/customer';
import { CustomerTitleCard } from '@/lib/api/types';
import { Search, Film, X } from 'lucide-react';

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedDj, setSelectedDj] = useState('All');
  const [moviesList, setMoviesList] = useState<MovieItem[]>([]);
  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    adminRepository.getCategories().then(cats => setCategoriesList(cats || []));
  }, []);

  useEffect(() => {
    let isCancelled = false;
    async function performSearch() {
      setIsLoading(true);
      try {
        if (query.trim()) {
          const res = await catalogApi.searchTitles(query.trim());
          if (!isCancelled) {
            const mapped: MovieItem[] = (res.items || []).map((t: CustomerTitleCard) => ({
              id: t.id,
              title: t.title,
              originalTitle: t.originalTitle || t.title,
              slug: t.slug,
              releaseYear: t.releaseYear || 2024,
              durationMinutes: t.durationMinutes || 120,
              posterUrl: t.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80',
              backdropUrl: t.backdropUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
              trailerUrl: t.trailerUrl || undefined,
              description: t.description || 'African cinematic release.',
              genres: t.categories ? t.categories.map((c) => c.name) : [],
              countries: t.countries ? t.countries.map((c) => c.name) : [],
              ageRating: '16+',
              rating: 8.5,
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
            setMoviesList(mapped);
          }
        } else {
          const allMovies = await adminRepository.getMovies();
          if (!isCancelled) {
            setMoviesList(allMovies || []);
          }
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    const timer = setTimeout(performSearch, 250);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const filteredMovies = moviesList.filter((movie) => {
    const matchesGenre = selectedGenre === 'All' || movie.genres.includes(selectedGenre);
    const matchesDj = selectedDj === 'All' || (movie.availableDjs && movie.availableDjs.includes(selectedDj));
    return matchesGenre && matchesDj;
  });

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-8">
      {/* Search Input Box */}
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by movie title, DJ commentator, genre, or country..."
            className="w-full bg-[#111318] border border-[#262932] focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914] rounded-2xl py-4 pl-12 pr-10 text-white text-base outline-none font-sans shadow-xl placeholder:text-gray-500"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full bg-[#181A21] text-gray-400 hover:text-white absolute right-4 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <button
            onClick={() => setSelectedGenre('All')}
            className={`px-3 py-1 rounded-full border transition-colors ${
              selectedGenre === 'All'
                ? 'bg-[#E50914] text-white border-[#E50914] font-bold'
                : 'bg-[#181A21] text-gray-400 border-[#262932] hover:text-white'
            }`}
          >
            All Genres
          </button>
          {categoriesList.slice(0, 6).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedGenre(cat.name)}
              className={`px-3 py-1 rounded-full border transition-colors ${
                selectedGenre === cat.name
                  ? 'bg-[#E50914] text-white border-[#E50914] font-bold'
                  : 'bg-[#181A21] text-gray-400 border-[#262932] hover:text-white'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-mono text-gray-400 border-b border-[#262932] pb-3">
          <span>
            Search results {query ? `for "${query}"` : ''}:{' '}
            <strong className="text-white">{filteredMovies.length} found</strong>
          </span>
          {(selectedGenre !== 'All' || selectedDj !== 'All' || query) && (
            <button
              onClick={() => {
                setQuery('');
                setSelectedGenre('All');
                setSelectedDj('All');
              }}
              className="text-[#E50914] hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>

        {filteredMovies.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-[#111318] rounded-3xl border border-[#262932]">
            <Film className="w-10 h-10 text-gray-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No matching titles found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Try searching with fewer terms or check for a different DJ commentator (e.g. DJ Afro Amigo, DJ Murphy).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 justify-items-center">
            {filteredMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      <CustomerHeader />
      <Suspense fallback={<div className="pt-32 text-center text-xs font-mono text-gray-500">Loading search...</div>}>
        <SearchContent />
      </Suspense>
      <TrailerModal />
      <LipaModal />
      <SearchDrawer />
      <CustomerFooter />
    </div>
  );
}
