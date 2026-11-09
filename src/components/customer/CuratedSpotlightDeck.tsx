"use client";

import React from "react";
import Link from "next/link";
import { MovieItem } from "@/types/customer";
import { Mic, Star, Clock, ArrowRight, Play, Sparkles } from "lucide-react";

interface CuratedSpotlightDeckProps {
  movies: MovieItem[];
}

export function CuratedSpotlightDeck({ movies }: CuratedSpotlightDeckProps) {
  if (!movies || movies.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-[#E50914] font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Curated Releases</span>
          </p>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
            Featured Cinema Selection
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Certified Swahili translations &amp; commentary by East Africa&apos;s leading voice artists.
          </p>
        </div>

        <Link
          href="/movies"
          className="group inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-white transition-colors"
        >
          <span>Explore All ({movies.length})</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Editorial Landscape Deck */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {movies.map((movie) => {
          const primaryDj = movie.availableDjs?.[0] || "Swahili Dub";
          const additionalDjs = (movie.availableDjs?.length || 1) - 1;

          return (
            <Link
              key={movie.id}
              href={movie.id.startsWith("s-") ? `/series/${movie.slug}` : `/movies/${movie.slug}`}
              className="group relative rounded-3xl bg-[#111318] border border-[#262932] hover:border-[#E50914]/60 overflow-hidden flex flex-col transition-all duration-300 transform hover:scale-[1.01] hover:shadow-2xl hover:shadow-black/80"
            >
              {/* Widescreen 16:9 Backdrop Image */}
              <div className="relative aspect-video w-full overflow-hidden bg-neutral-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={movie.backdropUrl || movie.posterUrl}
                  alt={movie.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111318] via-transparent to-black/30" />

                {/* Badges on image */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-mono text-[#D6A84F] font-bold">
                    <Mic className="w-3 h-3 text-[#E50914]" />
                    <span>{primaryDj}</span>
                    {additionalDjs > 0 && <span className="text-gray-400">+{additionalDjs}</span>}
                  </span>

                  <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 fill-current text-amber-400" />
                    <span>{movie.rating || "8.5"}</span>
                  </span>
                </div>

                {/* Subtle Play Overlay */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#E50914] text-white flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                    <Play className="w-5 h-5 fill-current translate-x-0.5" />
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white group-hover:text-[#E50914] transition-colors line-clamp-1">
                    {movie.title}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                    {movie.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#262932] flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 text-gray-400">
                    <span>{movie.releaseYear}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <span>{movie.durationMinutes}m</span>
                    </span>
                  </div>

                  <span className="text-emerald-400 font-bold">
                    TSh {(movie.streamPriceTsh || 1500).toLocaleString()}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
