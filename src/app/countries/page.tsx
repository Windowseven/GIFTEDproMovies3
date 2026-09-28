'use client';

import React from 'react';
import Link from 'next/link';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { TrailerModal } from '@/components/customer/TrailerModal';
import { LipaModal } from '@/components/customer/LipaModal';
import { SearchDrawer } from '@/components/customer/SearchDrawer';
import { customerCountries } from '@/data/mock/customerData';
import { Globe, ArrowRight } from 'lucide-react';

export default function CountriesHubPage() {
  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      <CustomerHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-mono font-bold uppercase">
            <Globe className="w-3.5 h-3.5" />
            <span>Geographic Discovery</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Movies by Origin Country
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 max-w-2xl leading-relaxed">
            Explore films by cultural origin and production territory. From local Tanzanian cinema and Nollywood epics to Hollywood blockbusters and Bollywood sagas.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {customerCountries.map((country) => (
            <Link
              key={country.code}
              href={`/countries/${country.code.toLowerCase()}`}
              className="group p-5 rounded-3xl bg-[#111318] border border-[#262932] hover:border-blue-500/60 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-between shadow-lg"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl group-hover:scale-125 transition-transform">
                  {country.flagEmoji}
                </span>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                    {country.name}
                  </h3>
                  <p className="text-xs font-mono text-gray-400">
                    {country.contentCount} Available Titles
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
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
