'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { MovieItem } from '@/types/customer';
import { useCustomer } from '@/context/CustomerContext';
import {
  Play,
  Film,
  Info,
  ChevronLeft,
  ChevronRight,
  Star,
  Clock,
  Sparkles,
  Mic,
} from 'lucide-react';

interface HeroBillboardProps {
  movies: MovieItem[];
}

export function HeroBillboard({ movies }: HeroBillboardProps) {
  const { openLipa, openTrailer } = useCustomer();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);

  // Touch swipe refs
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const totalSlides = movies.length;

  const nextSlide = useCallback(() => {
    if (totalSlides === 0) return;
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
    setProgressKey((prev) => prev + 1);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    if (totalSlides === 0) return;
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
    setProgressKey((prev) => prev + 1);
  }, [totalSlides]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setProgressKey((prev) => prev + 1);
  };

  // Auto-advance billboard every 6.5s unless hovered or interacted with
  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;

    const timer = setTimeout(() => {
      nextSlide();
    }, 6500);

    return () => clearTimeout(timer);
  }, [currentIndex, isPaused, totalSlides, nextSlide, progressKey]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) {
      // Swiped left -> next slide
      nextSlide();
    } else if (distance < -50) {
      // Swiped right -> prev slide
      prevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!movies || movies.length === 0) return null;

  return (
    <div
      className="relative w-full h-[68vh] min-h-[520px] max-h-[720px] overflow-hidden bg-[#08090C] select-none group/billboard"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Horizontal Continuous Sliding Track */}
      <div
        className="flex h-full w-full transition-transform duration-800 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {movies.map((movie, index) => {
          const isActive = currentIndex === index;
          const streamPrice = movie.streamPriceTsh || 1500;
          const primaryDj = movie.availableDjs?.[0] || 'Swahili Dub';

          return (
            <div
              key={movie.id}
              className="w-full shrink-0 h-full relative overflow-hidden flex flex-col justify-end"
            >
              {/* Slide Backdrop Image with Smooth Ken-Burns subtle zoom */}
              <div
                className={`absolute inset-0 bg-cover bg-center ${
                  isActive ? 'animate-kenburns' : ''
                } transition-all duration-700`}
                style={{ backgroundImage: `url(${movie.backdropUrl})` }}
              />

              {/* Multi-Directional Scrim Gradients */}
              <div className="absolute inset-0 scrim-hero z-10 pointer-events-none" />
              <div className="absolute inset-0 scrim-bottom z-10 pointer-events-none" />

              {/* Slide Content Box */}
              <div className="relative z-20 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16">
                <div
                  className={`max-w-2xl space-y-4 transition-all duration-700 ${
                    isActive
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-6 pointer-events-none'
                  }`}
                >
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E50914] text-white text-[11px] font-mono font-black tracking-wider uppercase shadow-md shadow-[#E50914]/30">
                      <Sparkles className="w-3 h-3" />
                      <span>Trending Spotlight</span>
                    </span>

                    {movie.availableDjs && movie.availableDjs.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D6A84F]/20 border border-[#D6A84F]/40 text-[#D6A84F] text-[11px] font-mono font-bold uppercase">
                        <Mic className="w-3 h-3" />
                        <span>{primaryDj} Dub Edition</span>
                      </span>
                    )}

                    <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono text-gray-300">
                      {movie.ageRating || '16+'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono text-emerald-400 font-bold">
                      4K UHD
                    </span>
                  </div>

                  {/* Title */}
                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none drop-shadow-2xl">
                    {movie.title}
                  </h1>

                  {/* Metadata line */}
                  <div className="flex items-center gap-3 text-xs sm:text-sm font-mono text-gray-300">
                    <div className="flex items-center gap-1 text-emerald-400 font-bold">
                      <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
                      <span>{movie.rating} Rating</span>
                    </div>
                    <span>•</span>
                    <span>{movie.releaseYear}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span>{movie.durationMinutes} min</span>
                    </span>
                    <span>•</span>
                    <span className="text-gray-400">{movie.genres.join(', ')}</span>
                  </div>

                  {/* Synopsis */}
                  <p className="text-xs sm:text-sm text-gray-300 line-clamp-3 leading-relaxed max-w-xl drop-shadow-md">
                    {movie.description}
                  </p>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() =>
                        openLipa({
                          itemTitle: movie.title,
                          itemType: movie.id.startsWith('s-') ? 'series' : 'movie',
                          accessType: 'stream',
                          amountTsh: streamPrice,
                          djName: primaryDj,
                          durationLabel: movie.id.startsWith('s-') ? 'Season Pass Access' : '48 Hours Access',
                          itemSlug: movie.slug,
                        })
                      }
                      className="px-6 py-3 rounded-full bg-[#E50914] hover:bg-[#B11226] text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-[#E50914]/35 transition-all transform hover:scale-105 active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>WATCH / LIPA TSh {streamPrice.toLocaleString()}</span>
                    </button>

                    <button
                      onClick={() => openTrailer(movie.title)}
                      className="px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 backdrop-blur-md border border-white/15 transition-all active:scale-95"
                    >
                      <Film className="w-4 h-4" />
                      <span>Watch Trailer</span>
                    </button>

                    <Link
                      href={movie.id.startsWith('s-') ? `/series/${movie.slug}` : `/movies/${movie.slug}`}
                      className="px-4 py-3 rounded-full bg-[#111318]/80 hover:bg-[#181A21] text-gray-300 hover:text-white text-xs sm:text-sm flex items-center gap-1.5 border border-[#262932] transition-colors"
                    >
                      <Info className="w-4 h-4" />
                      <span>Details</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide Navigation Controls */}
      <div className="absolute bottom-6 right-6 z-30 flex items-center gap-3">
        {/* Previous button */}
        <button
          onClick={prevSlide}
          className="w-9 h-9 rounded-full bg-black/60 hover:bg-[#E50914] border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-90 shadow-xl"
          aria-label="Previous blockbuster"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Live Progress Bar Capsules */}
        <div className="flex items-center gap-2 px-1">
          {movies.map((_, idx) => {
            const isSelected = currentIndex === idx;

            if (isSelected) {
              return (
                <button
                  key={idx}
                  onClick={() => goToSlide(idx)}
                  className="w-12 sm:w-16 h-1.5 rounded-full bg-white/25 overflow-hidden relative cursor-pointer transition-all"
                  aria-label={`Current slide ${idx + 1}`}
                >
                  <div
                    key={`progress-${progressKey}-${idx}`}
                    className={`h-full bg-[#E50914] rounded-full animate-slide-progress ${
                      isPaused ? 'paused' : ''
                    }`}
                  />
                </button>
              );
            }

            return (
              <button
                key={idx}
                onClick={() => goToSlide(idx)}
                className="w-2 h-1.5 rounded-full bg-white/30 hover:bg-white/80 transition-all cursor-pointer"
                aria-label={`Go to slide ${idx + 1}`}
              />
            );
          })}
        </div>

        {/* Next button */}
        <button
          onClick={nextSlide}
          className="w-9 h-9 rounded-full bg-black/60 hover:bg-[#E50914] border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-90 shadow-xl"
          aria-label="Next blockbuster"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
