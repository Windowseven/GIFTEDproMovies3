'use client';

import React from 'react';
import Link from 'next/link';
import { Crown, Sparkles, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';

export function VipPassPromoBanner() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="relative rounded-3xl bg-gradient-to-r from-[#18150D] via-[#111318] to-[#181112] border border-[#D6A84F]/40 p-6 sm:p-10 overflow-hidden shadow-2xl">
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#D6A84F]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-[#E50914]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D6A84F]/15 border border-[#D6A84F]/30 text-[#D6A84F] text-xs font-mono font-bold uppercase">
              <Crown className="w-3.5 h-3.5" />
              <span>GIFTEDproMovies VIP Cinema Pass</span>
            </div>

            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
              Unlimited Swahili Commentary Streams &amp; Fast Offline Downloads
            </h3>

            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Unlock our complete catalog of over 1,400+ Hollywood, Bollywood &amp; Nollywood blockbusters. All certified DJ commentary editions (DJ Murphy, DJ Afro Amigo, DJ Smith) with zero advertisements.
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-gray-300 pt-1">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Zero Ads</span>
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Instant M-Pesa Push</span>
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Full HD/4K Quality</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full lg:w-auto">
            <Link
              href="/subscriptions"
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-gradient-to-r from-[#D6A84F] to-[#F59E0B] text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-[#D6A84F]/25 hover:opacity-90 transition-opacity active:scale-95"
            >
              <Crown className="w-4 h-4" />
              <span>GET VIP PASS FROM TSh 3,000</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
