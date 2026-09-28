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
import { getDjBySlug, customerMovies } from '@/data/mock/customerData';
import { Mic, CheckCircle2, ChevronRight, Film, Star, Award, Sparkles } from 'lucide-react';

interface DjDetailsPageProps {
  params: Promise<{ slug: string }>;
}

export default function DjDetailsPage({ params }: DjDetailsPageProps) {
  const { slug } = use(params);
  const dj = getDjBySlug(slug);

  if (!dj) {
    notFound();
  }

  // Filter movies where this DJ is available (sorted by newest upload first)
  const djMovies = customerMovies
    .filter((m) =>
      m.availableDjs && m.availableDjs.some((name) => name.toLowerCase() === dj.name.toLowerCase())
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

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-10">
        {/* DJ Banner Header */}
        <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-r from-[#18150D] via-[#111318] to-[#121317] border border-[#D6A84F]/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#D6A84F]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-2 text-xs font-mono text-gray-400 mb-6">
            <Link href="/" className="hover:text-white">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/djs" className="hover:text-white">DJs &amp; Translators</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white font-bold">{dj.name}</span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden bg-[#181A21] border-2 border-[#D6A84F] shadow-xl shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={dj.avatarUrl}
                alt={dj.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-[#D6A84F]/20 text-[#D6A84F] border border-[#D6A84F]/40 text-xs font-mono font-bold uppercase flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  <span>Master Commentator</span>
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {dj.name}
              </h1>

              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                {dj.bio}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-gray-400 pt-1">
                <span>
                  <strong className="text-white">{dj.activeTitlesCount}</strong> Translated Movies
                </span>
                <span>•</span>
                <span>
                  Style: <strong className="text-[#D6A84F]">{dj.tier || 'Master Commentator'}</strong>
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-bold">100% Verified Dub</span>
              </div>
            </div>
          </div>
        </div>

        {/* DJ Movie Catalog */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Movies Translated by {dj.name}
            </h2>
            <span className="text-xs font-mono text-gray-400">
              {djMovies.length} Titles Available
            </span>
          </div>

          {djMovies.length === 0 ? (
            <div className="py-20 text-center space-y-3 bg-[#111318] rounded-3xl border border-[#262932]">
              <Film className="w-10 h-10 text-gray-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No releases currently available</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                New editions by {dj.name} are in transcoding and QC.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 justify-items-center">
              {djMovies.map((movie) => (
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
