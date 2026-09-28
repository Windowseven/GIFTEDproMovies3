'use client';

import React, { useState } from 'react';
import { useCustomer } from '@/context/CustomerContext';
import { X, Play, Pause, Volume2, VolumeX, Maximize, Film } from 'lucide-react';

export function TrailerModal() {
  const { trailerModal, closeTrailer, openLipa } = useCustomer();
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  if (!trailerModal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-xl animate-billboard-fade">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={closeTrailer} />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-4xl bg-[#111318] border border-[#262932] rounded-3xl overflow-hidden shadow-2xl animate-modal-enter">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262932] bg-[#0E1015]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#E50914]/20 border border-[#E50914]/40 flex items-center justify-center text-[#E50914]">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-mono text-gray-400 uppercase">Official Preview</p>
              <h3 className="text-sm font-bold text-white truncate max-w-md">
                {trailerModal.title}
              </h3>
            </div>
          </div>
          <button
            onClick={closeTrailer}
            className="p-1.5 rounded-full bg-[#181A21] border border-[#262932] text-gray-400 hover:text-white transition-colors"
            aria-label="Close trailer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Canvas Area */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {/* Mock Cinematic Video Frame */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 z-10 pointer-events-none" />
          
          <div className="relative z-0 w-full h-full flex flex-col items-center justify-center bg-neutral-950">
            <div className="w-20 h-20 rounded-full bg-[#E50914]/20 border border-[#E50914] flex items-center justify-center text-[#E50914] animate-pulse">
              <Play className="w-10 h-10 fill-current translate-x-0.5" />
            </div>
            <p className="text-sm font-semibold text-white/90 mt-4 tracking-wide">
              {trailerModal.title} — Official 4K Trailer
            </p>
            <p className="text-xs text-gray-500 font-mono mt-1">
              Audio: Swahili DJ Commentary Edition (Sample)
            </p>
          </div>

          {/* Player Controls Bar */}
          <div className="absolute bottom-0 left-0 right-0 z-20 p-4 sm:p-6 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-3">
            {/* Scrubber line */}
            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer">
              <div className="w-1/3 h-full bg-[#E50914] rounded-full" />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-300">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsPlaying((prev) => !prev)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setIsMuted((prev) => !prev)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <span className="font-mono text-[11px] text-gray-400">00:42 / 02:18</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    closeTrailer();
                    openLipa({
                      itemTitle: trailerModal.title,
                      itemType: 'movie',
                      accessType: 'stream',
                      amountTsh: 1500,
                      durationLabel: '48 Hours Access',
                    });
                  }}
                  className="px-4 py-1.5 rounded-full bg-[#E50914] hover:bg-[#B11226] text-white font-bold text-xs shadow-md shadow-[#E50914]/30 transition-transform active:scale-95"
                >
                  Watch Full Movie
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
