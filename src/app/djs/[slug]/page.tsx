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
import { MovieItem, DjItem } from '@/types/customer';
import { Mic, CheckCircle2, ChevronRight, Film, Award, RefreshCw } from 'lucide-react';

interface DjDetailsPageProps {
  params: Promise<{ slug: string }>;
}

export default function DjDetailsPage({ params }: DjDetailsPageProps) {
  const { slug } = use(params);
  const [dj, setDj] = useState<DjItem | null>(null);
  const [djMovies, setDjMovies] = useState<MovieItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    async function loadData() {
      setIsLoading(true);
      setNotFoundState(false);
      try {
        const [djs, allMovies] = await Promise.all([
          adminRepository.getDJs(),
          adminRepository.getMovies(),
        ]);

        const foundDj = djs.find(
          (d) =>
            d.slug.toLowerCase() === slug.toLowerCase() ||
            (d.name && d.name.toLowerCase() === slug.toLowerCase()) ||
            (d.stageName && d.stageName.toLowerCase() === slug.toLowerCase())
        );

        if (!foundDj) {
          if (!isCancelled) setNotFoundState(true);
          return;
        }

        const filtered = allMovies
          .filter(
            (m) =>
              (m.availableDjs && m.availableDjs.some((name) => name.toLowerCase() === foundDj.name.toLowerCase())) ||
              (m.versions && m.versions.some((v) => v.djName.toLowerCase() === foundDj.name.toLowerCase()))
          )
          .sort((a, b) => {
            const timeA = new Date(a.publishedAt).getTime();
            const timeB = new Date(b.publishedAt).getTime();
            if (isNaN(timeA)) return 1;
            if (isNaN(timeB)) return -1;
            return timeB - timeA;
          });

        if (!isCancelled) {
          setDj(foundDj);
          setDjMovies(filtered);
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

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-10">
        {/* DJ Banner Header */}
        <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-r from-[#18150D] via-[#111318] to-[#121317] border border-[#D6A84F]/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#D6A84F]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-2 text-xs font-mono text-gray-400 mb-6">
            <Link href="/" className="hover:text-white">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/djs" className="hover:text-white">DJs &amp; Translators</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white font-bold">{dj?.name || slug}</span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden bg-[#181A21] border-2 border-[#D6A84F] shadow-xl shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={dj?.avatarUrl || '/images/placeholders/movie_card_empty.svg'}
                alt={dj?.name || 'DJ Avatar'}
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
                {dj?.name || slug}
              </h1>

              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                {dj?.bio || 'Certified Swahili translation & commentary voice artist.'}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-gray-400 pt-1">
                <span>
                  <strong className="text-white">{djMovies.length}</strong> Available Releases
                </span>
                <span>•</span>
                <span>
                  Style: <strong className="text-[#D6A84F]">{dj?.tier || 'Master Commentator'}</strong>
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-bold">100% Certified Audio</span>
              </div>
            </div>
          </div>
        </div>

        {/* DJ Movie Catalog */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Translated Movies &amp; Editions
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                All titles translated and voiced by {dj?.name || slug}.
              </p>
            </div>
            <span className="text-xs font-mono text-gray-500 font-bold">
              {djMovies.length} Titles
            </span>
          </div>

          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3 text-gray-400">
              <RefreshCw className="w-8 h-8 text-[#E50914] animate-spin" />
              <p className="text-xs font-mono">Loading translated catalog...</p>
            </div>
          ) : djMovies.length === 0 ? (
            <div className="py-20 text-center space-y-3 bg-[#111318] rounded-3xl border border-[#262932]">
              <Film className="w-10 h-10 text-gray-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No releases published for this DJ yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Our audio production team is currently recording and mixing new translations with {dj?.name || slug}.
              </p>
              <Link
                href="/movies"
                className="inline-block px-4 py-2 rounded-full bg-[#E50914] text-white font-bold text-xs"
              >
                Browse All Available Movies
              </Link>
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
