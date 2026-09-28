'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { HeroBillboard } from '@/components/customer/HeroBillboard';
import { ContentRail } from '@/components/customer/ContentRail';
import { CategoryRail } from '@/components/customer/CategoryRail';
import { CountryRail } from '@/components/customer/CountryRail';
import { DjSpotlightRail } from '@/components/customer/DjSpotlightRail';
import { VipPassPromoBanner } from '@/components/customer/VipPassPromoBanner';
import { TrailerModal } from '@/components/customer/TrailerModal';
import { LipaModal } from '@/components/customer/LipaModal';
import { SearchDrawer } from '@/components/customer/SearchDrawer';
import {
  billboardMovies,
  trendingMovies,
  newReleases,
  popularMovies,
  customerCategories,
  customerCountries,
  customerDjs,
} from '@/data/mock/customerData';
import { adminRepository } from '@/lib/repositories/adminRepository';
import { MovieItem, CategoryItem, CountryItem, DjItem } from '@/types/customer';
import { useCustomer } from '@/context/CustomerContext';
import { Play } from 'lucide-react';
import Link from 'next/link';

export default function CustomerHomePage() {
  const { isAuthenticated, continueWatching } = useCustomer();

  const [heroList, setHeroList] = useState<MovieItem[]>(billboardMovies);
  const [releasesList, setReleasesList] = useState<MovieItem[]>(newReleases);
  const [trendingList, setTrendingList] = useState<MovieItem[]>(trendingMovies);
  const [popularList, setPopularList] = useState<MovieItem[]>(popularMovies);
  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>(customerCategories);
  const [countriesList, setCountriesList] = useState<CountryItem[]>(customerCountries);
  const [djsList, setDjsList] = useState<DjItem[]>(customerDjs);

  const loadData = useCallback(async () => {
    try {
      const [hero, releases, trending, popular, cats, countries, djs] = await Promise.all([
        adminRepository.getHeroBillboardMovies(),
        adminRepository.getCustomerNewReleases(),
        adminRepository.getCustomerTrendingMovies(),
        adminRepository.getCustomerPopularMovies(),
        adminRepository.getCategories(),
        adminRepository.getCountries(),
        adminRepository.getDJs(),
      ]);

      if (hero && hero.length > 0) setHeroList(hero);
      if (releases && releases.length > 0) setReleasesList(releases);
      if (trending && trending.length > 0) setTrendingList(trending);
      if (popular && popular.length > 0) setPopularList(popular);
      if (cats && cats.length > 0) setCategoriesList(cats);
      if (countries && countries.length > 0) setCountriesList(countries);
      if (djs && djs.length > 0) setDjsList(djs);
    } catch (e) {
      console.error('Error synchronizing customer home data:', e);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('giftedpro_data_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('giftedpro_data_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [loadData]);

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      {/* Global Customer Navigation */}
      <CustomerHeader />

      {/* Main Content Area */}
      <main className="flex-1 pb-16 space-y-4">
        {/* 1. Cinematic Hero Billboard Carousel (Live Connected to Admin) */}
        <HeroBillboard movies={heroList} />

        {/* Continue Watching Rail (Shown when authenticated or has watch history) */}
        {isAuthenticated && continueWatching.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  Resume Playback
                </p>
                <h3 className="text-xl sm:text-2xl font-black text-white">Continue Watching</h3>
              </div>
              <Link
                href="/library"
                className="text-xs font-mono text-gray-400 hover:text-white"
              >
                View Library →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {continueWatching.map((item) => (
                <Link
                  key={item.id}
                  href={`/movies/${item.slug}`}
                  className="group relative rounded-2xl bg-[#111318] border border-[#262932] hover:border-[#E50914]/50 overflow-hidden flex gap-4 p-3 transition-all hover:scale-[1.01]"
                >
                  <div className="relative w-24 h-16 rounded-xl overflow-hidden bg-neutral-900 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.backdropUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-[#E50914]/40 transition-colors">
                      <Play className="w-5 h-5 text-white fill-current" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-center">
                    <h4 className="text-xs font-bold text-white group-hover:text-[#E50914] transition-colors truncate">
                      {item.title}
                    </h4>
                    <p className="text-[11px] font-mono text-[#D6A84F] truncate mt-0.5">
                      {item.djName}
                    </p>
                    {/* Progress Bar */}
                    <div className="w-full h-1 bg-white/15 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-[#E50914] rounded-full"
                        style={{ width: `${item.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 1. Automated: New Releases (Newest Uploaded & Dubbed Titles) */}
        <ContentRail
          title="New Releases"
          subtitle="Recently Uploaded &amp; Dubbed"
          movies={releasesList}
          featuredBadge={true}
          seeAllHref="/movies"
        />

        {/* 2. Automated: Trending Movies (#1 to #10 in East Africa) */}
        <ContentRail
          title="Trending Movies"
          subtitle="Top 10 In East Africa"
          movies={trendingList}
          showRank={true}
          seeAllHref="/movies"
        />

        {/* 3. Automated: Popular Movies (Most Watched & Downloaded) */}
        <ContentRail
          title="Popular Movies"
          subtitle="Most Watched &amp; Downloaded"
          movies={popularList}
          seeAllHref="/movies"
        />

        {/* 4. Required Order: Movies by Categories */}
        <CategoryRail categories={categoriesList} />

        {/* 5. Required Order: Movies by Country */}
        <CountryRail countries={countriesList} />

        {/* 6. Required Order: DJs / Translators Collection */}
        <DjSpotlightRail djs={djsList} />

        {/* VIP Pass Callout Banner */}
        <VipPassPromoBanner />
      </main>

      {/* Global Interactive Modals */}
      <TrailerModal />
      <LipaModal />
      <SearchDrawer />

      {/* Global Customer Footer */}
      <CustomerFooter />
    </div>
  );
}
