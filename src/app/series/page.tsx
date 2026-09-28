'use client';

import React from 'react';
import Link from 'next/link';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { TrailerModal } from '@/components/customer/TrailerModal';
import { LipaModal } from '@/components/customer/LipaModal';
import { SearchDrawer } from '@/components/customer/SearchDrawer';
import { customerSeries } from '@/data/mock/customerData';
import { Tv, Play, Layers, Star, Clock } from 'lucide-react';

export default function SeriesCatalogPage() {
  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      <CustomerHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E50914]/15 border border-[#E50914]/30 text-[#E50914] text-xs font-mono font-bold uppercase">
            <Tv className="w-3.5 h-3.5" />
            <span>Episodic Cinema</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            TV &amp; Mini-Series
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 max-w-2xl leading-relaxed">
            Multi-episode dramas and television sagas translated into Swahili with certified episode commentary and complete season downloads.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {customerSeries.map((series) => (
            <Link
              key={series.id}
              href={`/series/${series.slug}`}
              className="group rounded-3xl bg-[#111318] border border-[#262932] hover:border-[#E50914]/60 overflow-hidden transition-all duration-300 transform hover:scale-[1.02] shadow-xl flex flex-col"
            >
              {/* Backdrop / Banner */}
              <div className="relative aspect-video bg-neutral-900 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={series.backdropUrl}
                  alt={series.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111318] via-transparent to-black/30" />
                <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/80 backdrop-blur-md border border-white/20 text-[10px] font-mono text-emerald-400 font-bold">
                  {series.seasonsCount} Season{series.seasonsCount > 1 ? 's' : ''} • {series.episodesCount} Episodes
                </div>
              </div>

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#E50914]/80 text-[10px] font-mono font-bold text-white uppercase">
                      Swahili Dub
                    </span>
                    <span className="text-xs font-mono text-gray-400">{series.releaseYear}</span>
                  </div>
                  <h3 className="text-lg font-black text-white group-hover:text-[#E50914] transition-colors">
                    {series.title}
                  </h3>
                  <p className="text-xs font-mono text-gray-400">
                    {series.genres.join(' • ')}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#262932] flex items-center justify-between text-xs font-mono">
                  <span className="text-gray-400">
                    {(series.totalStreams || 0).toLocaleString()} Streams
                  </span>
                  <span className="text-[#E50914] font-bold group-hover:underline flex items-center gap-1">
                    <span>Watch Episodes</span>
                    <Play className="w-3 h-3 fill-current" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <TrailerModal />
      <LipaModal />
      <SearchDrawer />
      <CustomerFooter />
    </div>
  );
}
