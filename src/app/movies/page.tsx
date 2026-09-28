'use client';

import React, { useState, useMemo } from 'react';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { MovieCard } from '@/components/customer/MovieCard';
import { TrailerModal } from '@/components/customer/TrailerModal';
import { LipaModal } from '@/components/customer/LipaModal';
import { SearchDrawer } from '@/components/customer/SearchDrawer';
import { customerMovies, customerCategories, customerDjs } from '@/data/mock/customerData';
import { adminRepository } from '@/lib/repositories/adminRepository';
import { MovieItem, CategoryItem, DjItem } from '@/types/customer';
import { Film, Filter, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useEffect, useCallback } from 'react';

export default function MoviesCatalogPage() {
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedDj, setSelectedDj] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'trending' | 'rating' | 'price'>('newest');

  const [moviesList, setMoviesList] = useState<MovieItem[]>(customerMovies);
  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>(customerCategories);
  const [djsList, setDjsList] = useState<DjItem[]>(customerDjs);

  const loadData = useCallback(async () => {
    try {
      const [movs, cats, djs] = await Promise.all([
        adminRepository.getMovies(),
        adminRepository.getCategories(),
        adminRepository.getDJs(),
      ]);
      const published = movs.filter((m) => m.status === 'published');
      if (published.length > 0) setMoviesList(published);
      if (cats.length > 0) setCategoriesList(cats);
      if (djs.length > 0) setDjsList(djs);
    } catch (e) {
      console.error('Error synchronizing movies catalog:', e);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('giftedpro_data_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('giftedpro_data_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [loadData]);

  const filteredMovies = useMemo(() => {
    let list = [...moviesList];

    if (selectedGenre !== 'All') {
      list = list.filter((m) => m.genres.includes(selectedGenre));
    }

    if (selectedDj !== 'All') {
      list = list.filter((m) => m.availableDjs && m.availableDjs.includes(selectedDj));
    }

    if (sortBy === 'newest') {
      list.sort((a, b) => {
        const timeA = new Date(a.publishedAt).getTime();
        const timeB = new Date(b.publishedAt).getTime();
        if (isNaN(timeA)) return 1;
        if (isNaN(timeB)) return -1;
        return timeB - timeA;
      });
    } else if (sortBy === 'trending') {
      list.sort((a, b) => (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0));
    } else if (sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'price') {
      list.sort((a, b) => (a.streamPriceTsh || 1500) - (b.streamPriceTsh || 1500));
    }

    return list;
  }, [selectedGenre, selectedDj, sortBy]);

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      <CustomerHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-8">
        {/* Catalog Banner Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E50914]/15 border border-[#E50914]/30 text-[#E50914] text-xs font-mono font-bold uppercase">
            <Film className="w-3.5 h-3.5" />
            <span>Master Catalog</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Movies &amp; Blockbusters
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 max-w-2xl leading-relaxed">
            Discover thousands of international and African blockbusters translated into Swahili with certified commentary by East Africa&apos;s leading audio artists.
          </p>
        </div>

        {/* Filter & Sort Bar */}
        <div className="p-4 rounded-3xl bg-[#111318] border border-[#262932] space-y-4 shadow-xl">
          {/* Genre Chips */}
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
            <span className="text-[11px] font-mono text-gray-500 uppercase tracking-wider shrink-0 mr-1">
              Genre:
            </span>
            <button
              onClick={() => setSelectedGenre('All')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                selectedGenre === 'All'
                  ? 'bg-[#E50914] text-white shadow-md shadow-[#E50914]/25'
                  : 'bg-[#181A21] text-gray-400 hover:text-white border border-[#262932]'
              }`}
            >
              All Genres
            </button>
            {categoriesList.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedGenre(cat.name)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                  selectedGenre === cat.name
                    ? 'bg-[#E50914] text-white shadow-md shadow-[#E50914]/25'
                    : 'bg-[#181A21] text-gray-400 hover:text-white border border-[#262932]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Secondary Filter: DJ selector + Sort dropdown */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#262932]/70 text-xs">
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
              <span className="text-[11px] font-mono text-gray-500 uppercase shrink-0">
                DJ Dub:
              </span>
              <button
                onClick={() => setSelectedDj('All')}
                className={`px-3 py-1 rounded-lg font-mono text-xs transition-colors ${
                  selectedDj === 'All'
                    ? 'bg-white text-black font-bold'
                    : 'bg-[#181A21] text-gray-400 hover:text-white border border-[#262932]'
                }`}
              >
                All DJs
              </button>
              {djsList.map((dj) => (
                <button
                  key={dj.id}
                  onClick={() => setSelectedDj(dj.name)}
                  className={`px-3 py-1 rounded-lg font-mono text-xs shrink-0 transition-colors ${
                    selectedDj === dj.name
                      ? 'bg-[#D6A84F] text-black font-bold'
                      : 'bg-[#181A21] text-gray-400 hover:text-white border border-[#262932]'
                  }`}
                >
                  {dj.name}
                </button>
              ))}
            </div>

            {/* Sort options */}
            <div className="flex items-center gap-2 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-[11px] font-mono text-gray-500">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#181A21] border border-[#262932] text-xs text-white rounded-lg px-2.5 py-1 outline-none font-mono cursor-pointer"
              >
                <option value="newest">New Releases (Latest Uploads)</option>
                <option value="trending">Trending Now</option>
                <option value="rating">Top Rated</option>
                <option value="price">Lowest Price</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-gray-400">
            <span>
              Showing <span className="text-white font-bold">{filteredMovies.length}</span> titles
            </span>
          </div>

          {filteredMovies.length === 0 ? (
            <div className="py-20 text-center space-y-3 bg-[#111318] rounded-3xl border border-[#262932]">
              <Film className="w-10 h-10 text-gray-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No titles match this filter</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Try resetting genre or DJ filter to browse available movies.
              </p>
              <button
                onClick={() => {
                  setSelectedGenre('All');
                  setSelectedDj('All');
                }}
                className="px-4 py-2 rounded-full bg-[#E50914] text-white font-bold text-xs"
              >
                Reset Filters
              </button>
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

      <TrailerModal />
      <LipaModal />
      <SearchDrawer />
      <CustomerFooter />
    </div>
  );
}
