'use client';

import React from 'react';
import Link from 'next/link';
import { CountryItem } from '@/types/customer';
import { Globe, ArrowRight } from 'lucide-react';

interface CountryRailProps {
  countries: CountryItem[];
}

export function CountryRail({ countries }: CountryRailProps) {
  return (
    <section className="relative py-6 sm:py-8 space-y-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-blue-400 font-bold flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            <span>Global Origins</span>
          </p>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
            Movies by Country
          </h2>
        </div>

        <Link
          href="/countries"
          className="group inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-white transition-colors"
        >
          <span>All Countries</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
          {countries.map((country) => (
            <Link
              key={country.code}
              href={`/countries/${country.code.toLowerCase()}`}
              className="group p-3.5 rounded-2xl bg-[#111318] border border-[#262932] hover:border-blue-500/50 transition-all duration-300 transform hover:scale-[1.02] flex items-center gap-3 shadow-sm"
            >
              <span className="text-2xl shrink-0 group-hover:scale-125 transition-transform">
                {country.flagEmoji}
              </span>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                  {country.name}
                </h4>
                <p className="text-[10px] font-mono text-gray-500 truncate">
                  {country.contentCount} movies
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
