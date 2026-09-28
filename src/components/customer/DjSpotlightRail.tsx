'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { DjItem } from '@/types/customer';
import { Mic, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface DjSpotlightRailProps {
  djs: DjItem[];
}

export function DjSpotlightRail({ djs }: DjSpotlightRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -400 : 400;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <section className="relative py-6 sm:py-8 space-y-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-[#D6A84F] font-bold flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5" />
            <span>Master Commentators &amp; Translators</span>
          </p>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
            DJ &amp; Audio Editions
          </h2>
        </div>

        <Link
          href="/djs"
          className="group inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-white transition-colors"
        >
          <span>All Commentators</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Rail */}
      <div className="relative group/dj">
        <button
          onClick={() => scroll('left')}
          className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/80 hover:bg-[#D6A84F] hover:text-black border border-white/20 text-white items-center justify-center backdrop-blur-md shadow-xl transition-all"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => scroll('right')}
          className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/80 hover:bg-[#D6A84F] hover:text-black border border-white/20 text-white items-center justify-center backdrop-blur-md shadow-xl transition-all"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div
          ref={scrollRef}
          className="flex items-center gap-4 overflow-x-auto hide-scrollbar px-4 sm:px-6 lg:px-8 py-2 scroll-smooth"
        >
          {djs.map((dj) => (
            <Link
              key={dj.id}
              href={`/djs/${dj.slug}`}
              className="group/card shrink-0 w-64 sm:w-72 p-4 rounded-2xl bg-[#111318] border border-[#262932] hover:border-[#D6A84F]/60 transition-all duration-300 transform hover:scale-[1.02] flex flex-col justify-between space-y-4 shadow-lg hover:shadow-[#D6A84F]/5"
            >
              <div className="flex items-center gap-3.5">
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-[#181A21] border border-white/10 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={dj.avatarUrl}
                    alt={dj.name}
                    className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-white group-hover/card:text-[#D6A84F] transition-colors truncate">
                      {dj.name}
                    </h4>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  </div>
                  <span className="text-[11px] font-mono text-gray-400 block truncate">
                    {dj.tier || 'Master Commentator'}
                  </span>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#181A21] text-[10px] font-mono text-[#D6A84F] border border-[#D6A84F]/20">
                    {dj.activeTitlesCount} Releases
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                {dj.bio}
              </p>

              <div className="pt-2 border-t border-[#262932] flex items-center justify-between text-xs font-mono text-gray-500 group-hover/card:text-white transition-colors">
                <span>Browse DJ Catalog</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#D6A84F] group-hover/card:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
