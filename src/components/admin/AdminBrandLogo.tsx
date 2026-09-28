import React from 'react';
import Image from 'next/image';

interface AdminBrandLogoProps {
  className?: string;
  showOpsTag?: boolean;
}

export const AdminBrandLogo: React.FC<AdminBrandLogoProps> = ({
  className = '',
  showOpsTag = true,
}) => {
  return (
    <div
      className={`flex items-center gap-2.5 sm:gap-3 select-none group transition-transform duration-200 hover:scale-[1.01] ${className}`}
    >
      {/* 3D Emblem with Ambient Red Rim Glow */}
      <div className="relative shrink-0 flex items-center justify-center">
        <Image
          src="/brand/logo.png"
          alt="GIFTEDproMovies"
          width={40}
          height={40}
          className="w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow-[0_0_12px_rgba(229,9,20,0.45)] transition-transform duration-300 group-hover:scale-105"
          priority
        />
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <span className="font-extrabold tracking-tight text-lg text-white font-sans leading-none">
            GIFTED<span className="text-[#E50914] font-black">pro</span>Movies
          </span>
          {showOpsTag && (
            <span className="bg-[#E50914] text-white text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase font-mono">
              ADMIN OPS
            </span>
          )}
        </div>
        <span className="text-[9px] font-mono tracking-widest text-[#70737C] uppercase pt-0.5">
          East African Cinematic Stream
        </span>
      </div>
    </div>
  );
};
