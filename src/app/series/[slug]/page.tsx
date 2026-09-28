'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { TrailerModal } from '@/components/customer/TrailerModal';
import { LipaModal } from '@/components/customer/LipaModal';
import { SearchDrawer } from '@/components/customer/SearchDrawer';
import { getSeriesBySlug, customerSeries } from '@/data/mock/customerData';
import { useCustomer } from '@/context/CustomerContext';
import {
  Tv,
  Play,
  Download,
  Calendar,
  Globe,
  Clock,
  Mic,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';

interface SeriesDetailsPageProps {
  params: Promise<{ slug: string }>;
}

export default function SeriesDetailsPage({ params }: SeriesDetailsPageProps) {
  const { slug } = use(params);
  const series = getSeriesBySlug(slug);
  const { openLipa, openTrailer } = useCustomer();
  const [selectedSeason, setSelectedSeason] = useState<number>(1);

  if (!series) {
    notFound();
  }

  // Generate episodes mockup for selected season
  const episodes = Array.from({ length: Math.min(series.episodesCount, 8) }, (_, i) => ({
    episodeNumber: i + 1,
    title: `Episode ${i + 1}: The Rising Storm`,
    runtime: '54 min',
    synopsis: `Tensions escalate across the high ranks as alliances are tested and new paths to power emerge.`,
    djName: 'DJ Murphy Dub Edition',
    streamPriceTsh: 500,
    downloadPriceTsh: 1000,
  }));

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      <CustomerHeader />

      <main className="flex-1 pb-16 space-y-10">
        {/* Series Hero */}
        <div className="relative w-full min-h-[520px] lg:min-h-[580px] overflow-hidden bg-[#08090C] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-cover bg-center animate-kenburns"
            style={{ backgroundImage: `url(${series.backdropUrl})` }}
          />
          <div className="absolute inset-0 scrim-hero z-10 pointer-events-none" />
          <div className="absolute inset-0 scrim-bottom z-10 pointer-events-none" />

          <div className="relative z-20 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-32 pb-8">
            <div className="flex items-center gap-2 text-xs font-mono text-gray-400 mb-4">
              <Link href="/" className="hover:text-white">Home</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link href="/series" className="hover:text-white">Series</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-white font-bold">{series.title}</span>
            </div>

            <div className="space-y-4 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-[#E50914] text-white text-[11px] font-mono font-black uppercase">
                  Swahili Dub Series
                </span>
                <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono text-emerald-400 font-bold">
                  {series.seasonsCount} Season{series.seasonsCount > 1 ? 's' : ''} • {series.episodesCount} Episodes
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight">
                {series.title}
              </h1>

              <div className="flex items-center gap-3 text-xs font-mono text-gray-300">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>{series.releaseYear}</span>
                </span>
                <span>•</span>
                <span>{series.genres.join(', ')}</span>
                <span>•</span>
                <span>{series.countries.join(', ')}</span>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() =>
                    openLipa({
                      itemTitle: `${series.title} — Full Season ${selectedSeason} Pass`,
                      itemType: 'series',
                      accessType: 'stream',
                      amountTsh: 3000,
                      djName: 'DJ Murphy Dub Edition',
                      durationLabel: '30 Days Complete Season Pass',
                      itemSlug: series.slug,
                    })
                  }
                  className="px-6 py-3 rounded-full bg-[#E50914] hover:bg-[#B11226] text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-[#E50914]/30 active:scale-95 transition-transform"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>UNLOCK FULL SEASON PASS • TSh 3,000</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Season & Episode Browser */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[#262932] pb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-gray-400 uppercase font-bold">Season:</span>
              <div className="flex items-center gap-2">
                {Array.from({ length: series.seasonsCount }, (_, idx) => idx + 1).map((sn) => (
                  <button
                    key={sn}
                    onClick={() => setSelectedSeason(sn)}
                    className={`px-4 py-1.5 rounded-full text-xs font-mono font-bold transition-all ${
                      selectedSeason === sn
                        ? 'bg-white text-black'
                        : 'bg-[#181A21] text-gray-400 hover:text-white border border-[#262932]'
                    }`}
                  >
                    Season {sn}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-xs font-mono text-gray-500 hidden sm:inline">
              Audio: Swahili Commentary (DJ Murphy)
            </span>
          </div>

          {/* Episode List */}
          <div className="divide-y divide-[#262932] rounded-3xl bg-[#111318] border border-[#262932] overflow-hidden">
            {episodes.map((ep) => (
              <div
                key={ep.episodeNumber}
                className="p-4 sm:p-6 hover:bg-[#181A21]/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <span className="font-mono text-2xl font-black text-gray-600 w-8">
                    {ep.episodeNumber < 10 ? `0${ep.episodeNumber}` : ep.episodeNumber}
                  </span>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{ep.title}</h4>
                      <span className="px-1.5 py-0.5 rounded bg-[#181A21] text-[10px] font-mono text-gray-400 border border-[#262932]">
                        {ep.runtime}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 max-w-xl leading-relaxed">
                      {ep.synopsis}
                    </p>
                    <span className="text-[11px] font-mono text-[#D6A84F] block">
                      {ep.djName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() =>
                      openLipa({
                        itemTitle: `${series.title} — Episode ${ep.episodeNumber}`,
                        itemType: 'series',
                        accessType: 'stream',
                        amountTsh: ep.streamPriceTsh,
                        djName: ep.djName,
                        durationLabel: '48h Episode Access',
                        itemSlug: series.slug,
                      })
                    }
                    className="px-4 py-2 rounded-xl bg-[#E50914] hover:bg-[#B11226] text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Watch (TSh {ep.streamPriceTsh})</span>
                  </button>

                  <button
                    onClick={() =>
                      openLipa({
                        itemTitle: `${series.title} — Episode ${ep.episodeNumber} Download`,
                        itemType: 'series',
                        accessType: 'download',
                        amountTsh: ep.downloadPriceTsh,
                        djName: ep.djName,
                        durationLabel: '7 Days Offline',
                        itemSlug: series.slug,
                      })
                    }
                    className="p-2 rounded-xl bg-[#181A21] hover:bg-[#262932] text-gray-300 hover:text-white border border-[#262932]"
                    title="Download Episode"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <TrailerModal />
      <LipaModal />
      <SearchDrawer />
      <CustomerFooter />
    </div>
  );
}
