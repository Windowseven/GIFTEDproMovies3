'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { MovieItem } from '@/types/customer';
import { MovieCard } from './MovieCard';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

interface ContentRailProps {
  title: string;
  subtitle?: string;
  movies: MovieItem[];
  showRank?: boolean;
  featuredBadge?: boolean;
  seeAllHref?: string;
}

export function ContentRail({
  title,
  subtitle,
  movies,
  showRank = false,
  featuredBadge = false,
  seeAllHref,
}: ContentRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [movies]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -500 : 500;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  if (!movies || movies.length === 0) return null;

  return (
    <section className="relative py-4 sm:py-6 space-y-3 sm:space-y-4">
      {/* Section Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-end justify-between gap-4">
        <div>
          {subtitle && (
            <p className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-[#E50914] font-bold">
              {subtitle}
            </p>
          )}
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
            {title}
          </h2>
        </div>

        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="group inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-white transition-colors"
          >
            <span>Explore All</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>

      {/* Rail Container with Arrow Overlays */}
      <div className="relative group/rail">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/80 hover:bg-[#E50914] border border-white/20 text-white items-center justify-center backdrop-blur-md shadow-2xl transition-all active:scale-95"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/80 hover:bg-[#E50914] border border-white/20 text-white items-center justify-center backdrop-blur-md shadow-2xl transition-all active:scale-95"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Scrollable Track */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex items-center gap-3 sm:gap-4 overflow-x-auto hide-scrollbar px-4 sm:px-6 lg:px-8 py-2 scroll-smooth"
        >
          {movies.map((movie, index) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              rank={showRank ? index + 1 : undefined}
              featuredBadge={featuredBadge}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
