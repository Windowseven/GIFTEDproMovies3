'use client';

import React from 'react';
import Link from 'next/link';
import { CategoryItem } from '@/types/customer';
import { Grid, ArrowRight, Film } from 'lucide-react';

interface CategoryRailProps {
  categories: CategoryItem[];
}

export function CategoryRail({ categories }: CategoryRailProps) {
  return (
    <section className="relative py-6 sm:py-8 space-y-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-[#E50914] font-bold flex items-center gap-1.5">
            <Grid className="w-3.5 h-3.5" />
            <span>Curated Collections</span>
          </p>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
            Movies by Categories
          </h2>
        </div>

        <Link
          href="/categories"
          className="group inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-white transition-colors"
        >
          <span>All Categories</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {categories.slice(0, 12).map((cat) => (
            <Link
              key={cat.id}
              href={`/categories/${cat.slug}`}
              className="group relative p-4 rounded-2xl bg-[#111318] border border-[#262932] hover:border-[#E50914]/60 overflow-hidden transition-all duration-300 transform hover:scale-[1.02] shadow-md flex flex-col justify-between h-28"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-[#E50914]/5 rounded-full blur-xl group-hover:bg-[#E50914]/15 transition-colors pointer-events-none" />

              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-xl bg-[#181A21] border border-[#262932] flex items-center justify-center text-[#E50914] group-hover:scale-110 transition-transform">
                  <Film className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-mono text-gray-500 font-bold">
                  {cat.contentCount} titles
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-[#E50914] transition-colors truncate">
                  {cat.name}
                </h4>
                <p className="text-[10px] text-gray-400 font-mono truncate">
                  Explore Genre →
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
