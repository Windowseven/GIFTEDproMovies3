'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { TrailerModal } from '@/components/customer/TrailerModal';
import { LipaModal } from '@/components/customer/LipaModal';
import { SearchDrawer } from '@/components/customer/SearchDrawer';
import { adminRepository } from '@/lib/repositories/adminRepository';
import { CategoryItem } from '@/types/customer';
import { Grid, Film, ArrowRight, RefreshCw } from 'lucide-react';

export default function CategoriesHubPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    async function load() {
      try {
        const cats = await adminRepository.getCategories();
        if (!isCancelled) setCategories(cats || []);
      } catch (err) {
        console.error('Failed to load categories:', err);
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E50914]/15 border border-[#E50914]/30 text-[#E50914] text-xs font-mono font-bold uppercase">
            <Grid className="w-3.5 h-3.5" />
            <span>Genre Architecture</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Movie &amp; Series Categories
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 max-w-2xl leading-relaxed">
            Browse our catalog curated by cinematic genres. From intense adrenaline-fueled action to heartwarming comedy and terrifying horror.
          </p>
        </div>

        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3 text-gray-400">
            <RefreshCw className="w-8 h-8 text-[#E50914] animate-spin" />
            <p className="text-xs font-mono">Loading curated categories from catalog...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={'/categories/' + cat.slug}
                className="group p-5 rounded-3xl bg-[#111318] border border-[#262932] hover:border-[#E50914]/60 overflow-hidden transition-all duration-300 transform hover:scale-[1.03] shadow-lg flex flex-col justify-between h-36"
              >
                <div className="flex items-center justify-between">
                  <span className="w-10 h-10 rounded-2xl bg-[#181A21] border border-[#262932] flex items-center justify-center text-[#E50914] group-hover:scale-110 transition-transform">
                    <Film className="w-5 h-5" />
                  </span>
                  <span className="text-xs font-mono text-gray-500 font-bold">
                    {cat.contentCount && cat.contentCount > 0 ? cat.contentCount : 'Curated'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-[#E50914] transition-colors truncate">
                    {cat.name}
                  </h3>
                  <p className="text-[11px] font-mono text-gray-400 mt-0.5 flex items-center gap-1">
                    <span>Browse titles</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </p>
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
