'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { TrailerModal } from '@/components/customer/TrailerModal';
import { LipaModal } from '@/components/customer/LipaModal';
import { SearchDrawer } from '@/components/customer/SearchDrawer';
import { adminRepository } from '@/lib/repositories/adminRepository';
import { DjItem } from '@/types/customer';
import { Mic, CheckCircle2, ArrowRight, RefreshCw } from 'lucide-react';

export default function DjsHubPage() {
  const [djs, setDjs] = useState<DjItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    async function load() {
      try {
        const items = await adminRepository.getDJs();
        if (!isCancelled) setDjs(items || []);
      } catch (err) {
        console.error('Failed to load DJs:', err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      <CustomerHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D6A84F]/15 border border-[#D6A84F]/30 text-[#D6A84F] text-xs font-mono font-bold uppercase">
            <Mic className="w-3.5 h-3.5" />
            <span>Voice &amp; Commentary Masters</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            DJs &amp; Swahili Translators
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 max-w-2xl leading-relaxed">
            Every movie on GIFTEDproMovies is elevated by certified commentary and translation artists. Choose your preferred commentator for the ultimate Swahili viewing experience.
          </p>
        </div>

        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3 text-gray-400">
            <RefreshCw className="w-8 h-8 text-[#E50914] animate-spin" />
            <p className="text-xs font-mono">Loading approved commentator artists...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {djs.map((dj) => (
              <Link
                key={dj.id}
                href={'/djs/' + dj.slug}
                className="group rounded-3xl bg-[#111318] border border-[#262932] hover:border-[#D6A84F]/60 overflow-hidden transition-all duration-300 transform hover:scale-[1.02] shadow-xl p-6 flex flex-col justify-between space-y-4"
              >
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-[#181A21] border border-white/10 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={dj.avatarUrl}
                      alt={dj.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-base font-bold text-white group-hover:text-[#D6A84F] transition-colors truncate">
                        {dj.name}
                      </h3>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    </div>
                    <span className="text-xs font-mono text-gray-400 block truncate">
                      {dj.tier || 'Master Commentator'}
                    </span>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-[#181A21] text-[10px] font-mono text-[#D6A84F] border border-[#D6A84F]/30">
                      {dj.activeTitlesCount && dj.activeTitlesCount > 0 ? (dj.activeTitlesCount + ' Releases') : 'Voice Artist'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">
                  {dj.bio}
                </p>

                <div className="pt-3 border-t border-[#262932] flex items-center justify-between text-xs font-mono text-gray-500 group-hover:text-white transition-colors">
                  <span>View Full Portfolio</span>
                  <ArrowRight className="w-4 h-4 text-[#D6A84F] group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
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
