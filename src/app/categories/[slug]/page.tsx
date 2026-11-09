'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { MovieCard } from '@/components/customer/MovieCard';
import { TrailerModal } from '@/components/customer/TrailerModal';
import { LipaModal } from '@/components/customer/LipaModal';
import { SearchDrawer } from '@/components/customer/SearchDrawer';
import { adminRepository } from '@/lib/repositories/adminRepository';
import { MovieItem, CategoryItem } from '@/types/customer';
import { Grid, ChevronRight, Film, RefreshCw } from 'lucide-react';

interface CategoryDetailsPageProps {
  params: Promise<{ slug: string }>;
}

export default function CategoryDetailsPage({ params }: CategoryDetailsPageProps) {
  const { slug } = use(params);
  const [category, setCategory] = useState<CategoryItem | null>(null);
  const [matchingMovies, setMatchingMovies] = useState<MovieItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    async function loadData() {
      setIsLoading(true);
      setNotFoundState(false);
      try {
        const [cats, allMovies] = await Promise.all([
          adminRepository.getCategories(),
          adminRepository.getMovies(),
        ]);

        const foundCat = cats.find(
          (c) => c.slug.toLowerCase() === slug.toLowerCase() || c.name.toLowerCase() === slug.toLowerCase()
        );

        if (!foundCat) {
          if (!isCancelled) setNotFoundState(true);
          return;
        }

        const filtered = allMovies
          .filter((m) =>
            m.genres.some(
              (g) =>
                g.toLowerCase() === foundCat.name.toLowerCase() ||
                g.toLowerCase() === slug.toLowerCase()
            )
          )
          .sort((a, b) => {
            const timeA = new Date(a.publishedAt).getTime();
            const timeB = new Date(b.publishedAt).getTime();
            if (isNaN(timeA)) return 1;
            if (isNaN(timeB)) return -1;
            return timeB - timeA;
          });

        if (!isCancelled) {
          setCategory(foundCat);
          setMatchingMovies(filtered);
        }
      } catch (err) {
        if (!isCancelled) setNotFoundState(true);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isCancelled = true;
    };
  }, [slug]);

  if (notFoundState) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      <CustomerHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
            <Link href="/" className="hover:text-white">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/categories" className="hover:text-white">Categories</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white font-bold">{category?.name || slug}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E50914]/15 border border-[#E50914]/30 text-[#E50914] text-xs font-mono font-bold uppercase">
            <Grid className="w-3.5 h-3.5" />
            <span>Category Collection</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            {category?.name || slug} Movies &amp; Series
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 max-w-2xl leading-relaxed">
            {category?.description || 'Browse the highest-rated ' + (category?.name || slug) + ' cinema translated with certified Swahili DJ audio commentary.'}
          </p>
        </div>

        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3 text-gray-400">
            <RefreshCw className="w-8 h-8 text-[#E50914] animate-spin" />
            <p className="text-xs font-mono">Loading movies in this genre...</p>
          </div>
        ) : matchingMovies.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-[#111318] rounded-3xl border border-[#262932]">
            <Film className="w-10 h-10 text-gray-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No titles in this category yet</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Our Media Team is constantly preparing and translating new releases.
            </p>
            <Link
              href="/movies"
              className="inline-block px-4 py-2 rounded-full bg-[#E50914] text-white font-bold text-xs"
            >
              Browse All Movies
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 justify-items-center">
            {matchingMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </main>

      <TrailerModal />
      <LipaModal />
      <SearchDrawer />
      <CustomerFooter />
    </div>
  );
}
