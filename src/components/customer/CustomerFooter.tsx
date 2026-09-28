import React from 'react';
import Link from 'next/link';
import { CustomerBrandLogo } from './CustomerBrandLogo';
import { Shield, Layers, Film, Heart, Sparkles } from 'lucide-react';

export function CustomerFooter() {
  return (
    <footer className="bg-[#050608] border-t border-[#262932] pt-14 pb-10 text-[#A6A8B0] text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Main 4-column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Brand & Manifesto */}
          <div className="lg:col-span-2 space-y-4">
            <CustomerBrandLogo showSubtitle={true} />
            <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
              East Africa&apos;s premier digital platform for Swahili-narrated and curated international cinema.
              Experience Hollywood, Bollywood, Nollywood, and Asian blockbusters with certified DJ commentary editions and high-fidelity offline downloads.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#111318] border border-[#262932] text-[11px] font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Mobile Money Instant Push
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#111318] border border-[#262932] text-[11px] font-mono text-[#D6A84F]">
                <Sparkles className="w-3 h-3" />
                VIP Ultra Available
              </span>
            </div>
          </div>

          {/* Column 1: Discovery */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider font-mono">
              Discovery
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/movies" className="hover:text-white transition-colors">
                  All Movies
                </Link>
              </li>
              <li>
                <Link href="/series" className="hover:text-white transition-colors">
                  TV &amp; Mini-Series
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-white transition-colors">
                  Browse Categories
                </Link>
              </li>
              <li>
                <Link href="/countries" className="hover:text-white transition-colors">
                  Movies by Country
                </Link>
              </li>
              <li>
                <Link href="/subscriptions" className="text-[#D6A84F] hover:text-[#F59E0B] transition-colors font-medium">
                  VIP Passes &amp; Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: DJs & Translators */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider font-mono">
              DJ Dubbing
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/djs" className="hover:text-white transition-colors">
                  All Commentators
                </Link>
              </li>
              <li>
                <Link href="/djs/dj-afro-amigo" className="hover:text-white transition-colors">
                  DJ Afro Amigo
                </Link>
              </li>
              <li>
                <Link href="/djs/dj-murphy" className="hover:text-white transition-colors">
                  DJ Murphy
                </Link>
              </li>
              <li>
                <Link href="/djs/dj-smith" className="hover:text-white transition-colors">
                  DJ Smith
                </Link>
              </li>
              <li>
                <Link href="/djs/dj-black" className="hover:text-white transition-colors">
                  DJ Black
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Customer Support & Mobile Money */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider font-mono">
              Supported Telcos
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>M-Pesa (Vodacom)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Tigo Pesa (Yas)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-600" />
                <span>Airtel Money</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span>Halopesa</span>
              </li>
              <li className="pt-1">
                <Link href="/library" className="hover:text-white transition-colors underline decoration-dotted">
                  My Downloads &amp; Passes
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Discreet Staff Operations link */}
        <div className="pt-8 border-t border-[#262932]/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-gray-500">
          <p>© 2026 GIFTEDproMovies. All rights reserved. 100% Licensed Entertainment.</p>

          {/* Staff Switcher */}
          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-600 font-mono text-[10px] uppercase">Staff Access:</span>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
            >
              <Shield className="w-3 h-3 text-[#E50914]" />
              <span>Admin Control</span>
            </Link>
            <span className="text-gray-700">•</span>
            <Link
              href="/media-team"
              className="inline-flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
            >
              <Layers className="w-3 h-3 text-blue-400" />
              <span>Media Team Studio</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
