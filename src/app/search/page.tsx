'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { MovieCard } from '@/components/customer/MovieCard';
import { TrailerModal } from '@/components/customer/TrailerModal';
import { LipaModal } from '@/components/customer/LipaModal';
import { SearchDrawer } from '@/components/customer/SearchDrawer';
import { customerMovies, customerCategories, customerDjs } from '@/data/mock/customerData';
import { Search, Film, X, Filter } from 'lucide-react';

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedDj, setSelectedDj] = useState('All');

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  const filteredMovies = customerMovies.filter((movie) => {
    const cleanQuery = query.toLowerCase().trim();
    const matchesQuery =
      !cleanQuery ||
      movie.title.toLowerCase().includes(cleanQuery) ||
      movie.description.toLowerCase().includes(cleanQuery) ||
      (movie.availableDjs && movie.availableDjs.some((dj) => dj.toLowerCase().includes(cleanQuery))) ||
      movie.genres.some((g) => g.toLowerCase().includes(cleanQuery));

    const matchesGenre = selectedGenre === 'All' || movie.genres.includes(selectedGenre);
    const matchesDj = selectedDj === 'All' || (movie.availableDjs && movie.availableDjs.includes(selectedDj));

    return matchesQuery && matchesGenre && matchesDj;
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
          {customerCategories.slice(0, 6).map((cat) => (
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
