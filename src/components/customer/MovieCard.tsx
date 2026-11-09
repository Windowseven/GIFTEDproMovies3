'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MovieItem } from '@/types/customer';
import { Star, Mic, ArrowRight } from 'lucide-react';

interface MovieCardProps {
  movie: MovieItem;
  rank?: number;
  featuredBadge?: boolean;
  layout?: 'rail' | 'grid';
}

export function MovieCard({ movie, rank, featuredBadge, layout = 'rail' }: MovieCardProps) {
  const [imgError, setImgError] = useState(false);
  const primaryDj = movie.availableDjs?.[0] || 'Swahili Dub';
  const additionalDjsCount = (movie.availableDjs?.length || 1) - 1;
  const targetHref = movie.id?.startsWith('s-') ? `/series/${movie.slug}` : `/movies/${movie.slug}`;

  return (
    <Link
      href={targetHref}
      className={`group relative select-none rounded-2xl block transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E50914] ${
        layout === 'rail' ? 'shrink-0 w-44 sm:w-52 md:w-56' : 'w-full'
      }`}
      aria-label={`View ${movie.title}`}
    >
      {/* 2:3 Portrait Card Container */}
      <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[#111318] border border-[#262932] group-hover:border-[#E50914]/60 group-hover:shadow-2xl group-hover:shadow-black/80 transition-all duration-300 transform group-hover:scale-[1.03] group-hover:z-20">
        {/* Poster Image with Subtle Zoom or Branded Fallback */}
        {!imgError && movie.posterUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={movie.posterUrl}
            alt={movie.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-[#181A21] via-[#111318] to-[#08090C] flex flex-col items-center justify-center p-4 text-center">
            <span className="w-12 h-12 rounded-2xl bg-[#E50914]/20 border border-[#E50914]/40 flex items-center justify-center text-[#E50914] font-black text-xl mb-2 font-bebas">
              GPM
            </span>
            <p className="text-xs font-bold text-gray-300 line-clamp-2">{movie.title}</p>
            <span className="text-[10px] font-mono text-gray-500 mt-1">{movie.releaseYear}</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none">
          {rank ? (
            <div className="w-8 h-8 rounded-xl bg-black/85 backdrop-blur-md border border-[#E50914]/60 flex items-center justify-center font-black text-sm text-[#E50914] shadow-lg">
              #{rank}
            </div>
          ) : featuredBadge ? (
            <span className="px-2 py-0.5 rounded-md bg-[#D6A84F] backdrop-blur-md text-[10px] font-mono font-bold text-black uppercase tracking-wider shadow">
              VIP Pick
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md text-[10px] font-mono font-semibold text-gray-300 border border-white/10">
              4K HD
            </span>
          )}

          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-mono text-emerald-400 font-bold">
            <Star className="w-2.5 h-2.5 fill-current text-amber-400" />
            <span>{movie.rating || '8.5'}</span>
          </div>
        </div>

        {/* Permanent Bottom Gradient Scrim for Readability */}
        <div className="absolute inset-0 scrim-card pointer-events-none" />

        {/* Card Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-3.5 z-10 flex flex-col justify-end">
          {/* DJ Edition Pill + Multi-Dub Indicator */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#E50914]/85 text-[9px] font-mono font-bold text-white uppercase tracking-tight truncate max-w-[130px]">
              <Mic className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{primaryDj}</span>
            </span>
            {additionalDjsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-[#181A21] border border-white/15 text-[9px] font-mono font-bold text-[#D6A84F] uppercase tracking-tight">
                +{additionalDjsCount} dub{additionalDjsCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <h4 className="text-xs sm:text-sm font-bold text-white leading-snug mt-1.5 line-clamp-2 group-hover:text-[#E50914] transition-colors">
            {movie.title}
          </h4>

          <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mt-1">
            <span>{movie.releaseYear}</span>
            <span>•</span>
            <span className="truncate max-w-[70px]">{movie.genres?.[0] || 'Cinema'}</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">
              TSh {(movie.streamPriceTsh || 1500).toLocaleString()}
            </span>
          </div>

          {/* Touch-Friendly Action Cue on Hover or Mobile */}
          <div className="pt-2 mt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-gray-400 group-hover:text-white transition-colors">
            <span>Explore Details</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform text-[#E50914]" />
          </div>
        </div>
      </div>
    </Link>
  );
}
