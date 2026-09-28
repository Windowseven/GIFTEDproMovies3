'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { MovieCard } from '@/components/customer/MovieCard';
import { TrailerModal } from '@/components/customer/TrailerModal';
import { LipaModal } from '@/components/customer/LipaModal';
import { SearchDrawer } from '@/components/customer/SearchDrawer';
import { getCountryBySlug, customerMovies } from '@/data/mock/customerData';
import { Globe, ChevronRight, Film } from 'lucide-react';

interface CountryDetailsPageProps {
  params: Promise<{ slug: string }>;
}

export default function CountryDetailsPage({ params }: CountryDetailsPageProps) {
  const { slug } = use(params);
  const country = getCountryBySlug(slug);

  if (!country) {
    notFound();
  }

  // Filter movies matching country (sorted by newest upload first)
  const matchingMovies = customerMovies
    .filter((m) =>
      m.countries.some(
        (c) =>
          c.toLowerCase() === country.name.toLowerCase() ||
          c.toLowerCase() === country.code.toLowerCase() ||
          c.toLowerCase() === slug.toLowerCase()
      )
    )
    .sort((a, b) => {
      const timeA = new Date(a.publishedAt).getTime();
      const timeB = new Date(b.publishedAt).getTime();
      if (isNaN(timeA)) return 1;
      if (isNaN(timeB)) return -1;
      return timeB - timeA;
    });

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      <CustomerHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
            <Link href="/" className="hover:text-white">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/countries" className="hover:text-white">Countries</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white font-bold">{country.name}</span>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-mono font-bold uppercase">
            <span className="text-sm">{country.flagEmoji}</span>
            <span>Origin Spotlight</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Movies from {country.name}
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 max-w-2xl leading-relaxed">
            Curated titles produced or set in {country.name}, translated into Swahili with certified commentary editions.
          </p>
        </div>

        {matchingMovies.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-[#111318] rounded-3xl border border-[#262932]">
            <Film className="w-10 h-10 text-gray-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No titles found for this country yet</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Our Media Team is constantly translating new cinema from {country.name}.
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
