'use client';

import React from 'react';
import Link from 'next/link';
import { MovieItem } from '@/types/customer';
import { useCustomer } from '@/context/CustomerContext';
import { Play, Film, Star, Clock, Sparkles, Plus, Check } from 'lucide-react';

interface MovieCardProps {
  movie: MovieItem;
  rank?: number;
  featuredBadge?: boolean;
}

export function MovieCard({ movie, rank, featuredBadge }: MovieCardProps) {
  const { openLipa, openTrailer } = useCustomer();

  return (
    <div className="group relative shrink-0 w-44 sm:w-52 md:w-56 select-none transition-all duration-300">
      {/* 2:3 Portrait Card Container */}
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-[#111318] border border-[#262932] group-hover:border-[#E50914]/60 group-hover:shadow-2xl group-hover:shadow-black/80 transition-all duration-300 transform group-hover:scale-[1.03] group-hover:z-20">
        {/* Poster Image with Subtle Zoom */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={movie.posterUrl || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80"}
          alt={movie.title}
          loading="lazy"
          onError={(e) => {
            // Fallback if local or broken link
            e.currentTarget.src = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80";
          }}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none">
          {rank ? (
            <div className="w-8 h-8 rounded-xl bg-black/80 backdrop-blur-md border border-[#E50914]/50 flex items-center justify-center font-black text-sm text-[#E50914] shadow-lg">
              #{rank}
            </div>
          ) : featuredBadge ? (
            <span className="px-2 py-0.5 rounded-md bg-[#D6A84F]/90 backdrop-blur-md text-[10px] font-mono font-bold text-black uppercase tracking-wider">
              VIP Pick
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono font-semibold text-gray-300 border border-white/10">
              4K HD
            </span>
          )}

          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono text-emerald-400 font-bold">
            <Star className="w-2.5 h-2.5 fill-current text-amber-400" />
            <span>{movie.rating}</span>
          </div>
        </div>

        {/* Permanent Bottom Gradient Scrim */}
        <div className="absolute inset-0 scrim-card pointer-events-none" />

        {/* Card Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-3.5 z-10 flex flex-col justify-end">
          {/* DJ Edition Pill */}
          {movie.availableDjs && movie.availableDjs.length > 0 && (
            <div className="inline-flex items-center gap-1 max-w-full">
              <span className="px-1.5 py-0.5 rounded bg-[#E50914]/80 text-[9px] font-mono font-bold text-white uppercase tracking-tight truncate">
                {movie.availableDjs[0]}
              </span>
            </div>
          )}

          <h4 className="text-xs sm:text-sm font-extrabold text-white leading-tight mt-1 line-clamp-1 group-hover:text-[#E50914] transition-colors">
            {movie.title}
          </h4>

          <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mt-1">
            <span>{movie.releaseYear}</span>
            <span>•</span>
            <span>{movie.genres[0]}</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">
              TSh {(movie.streamPriceTsh || 1500).toLocaleString()}
            </span>
          </div>

          {/* Desktop Hover Quick Action Buttons */}
          <div className="hidden sm:flex items-center gap-2 pt-2.5 mt-2 border-t border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openLipa({
                  itemTitle: movie.title,
                  itemType: 'movie',
                  accessType: 'stream',
                  amountTsh: movie.streamPriceTsh || 1500,
                  djName: movie.availableDjs?.[0] || 'Swahili Dub',
                  durationLabel: '48 Hours Access',
                  itemSlug: movie.slug,
                });
              }}
              className="flex-1 py-1.5 px-2 rounded-lg bg-[#E50914] hover:bg-[#B11226] text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-md shadow-[#E50914]/30 active:scale-95 transition-transform"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Watch</span>
            </button>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openTrailer(movie.title);
              }}
              className="p-1.5 rounded-lg bg-[#181A21] hover:bg-[#262932] text-gray-300 hover:text-white border border-[#262932] transition-colors"
              title="Watch Trailer"
            >
              <Film className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Link covers entire card for direct tap/click navigation */}
        <Link
          href={`/movies/${movie.slug}`}
          className="absolute inset-0 z-0"
          aria-label={`View details for ${movie.title}`}
        />
      </div>
    </div>
  );
}
