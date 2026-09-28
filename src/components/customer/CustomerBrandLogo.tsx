import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface CustomerBrandLogoProps {
  className?: string;
  showSubtitle?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CustomerBrandLogo({
  className = '',
  showSubtitle = false,
  size = 'md',
}: CustomerBrandLogoProps) {
  const iconSize = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8 sm:w-9 sm:h-9',
    lg: 'w-10 h-10 sm:w-12 sm:h-12',
  }[size];

  const textSize = {
    sm: 'text-lg sm:text-xl',
    md: 'text-xl sm:text-2xl',
    lg: 'text-2xl sm:text-3xl',
  }[size];

  return (
    <Link
      href="/"
      className={`group flex items-center gap-2.5 sm:gap-3 select-none transition-transform duration-200 hover:scale-[1.01] ${className}`}
      aria-label="GIFTEDproMovies Home"
    >
      {/* 3D Emblem with Ambient Red Rim Glow */}
      <div className="relative shrink-0 flex items-center justify-center">
        <Image
          src="/brand/logo.png"
          alt="GIFTEDproMovies Logo"
          width={48}
          height={48}
          className={`${iconSize} object-contain drop-shadow-[0_2px_10px_rgba(229,9,20,0.4)] transition-transform duration-300 group-hover:scale-105`}
          priority
        />
      </div>

      {/* Brand Wordmark & Subtitle */}
      <div className="flex flex-col justify-center">
        <div className={`flex items-center font-black tracking-tight text-white leading-none ${textSize}`}>
          <span className="tracking-tighter font-extrabold text-white">GIFTED</span>
          <span className="text-[#E50914] font-black px-0.5">pro</span>
          <span className="tracking-tight text-white">Movies</span>
        </div>
        {showSubtitle && (
          <span className="text-[9px] sm:text-[10px] font-mono tracking-widest text-[#D6A84F] uppercase pt-1 font-semibold">
            Swahili &amp; Global Cinema
          </span>
        )}
      </div>
    </Link>
  );
}
