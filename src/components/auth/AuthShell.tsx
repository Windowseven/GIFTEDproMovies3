'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Shield } from 'lucide-react';

interface AuthShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showBackToHome?: boolean;
}

export function AuthShell({
  children,
  title,
  subtitle,
  showBackToHome = true,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col justify-between relative overflow-hidden select-none">
      {/* Background cinematic atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle radial glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#E50914]/10 rounded-full blur-[140px] opacity-40" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-[#D6A84F]/5 rounded-full blur-[120px] opacity-30" />
        {/* Grid texture overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#262932_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <Link
          href="/"
          className="group flex items-center gap-3 transition-transform duration-200 hover:scale-[1.02]"
          aria-label="GIFTEDproMovies Home"
        >
          <div className="relative shrink-0 flex items-center justify-center">
            <Image
              src="/brand/logo.png"
              alt="GIFTEDproMovies Logo"
              width={42}
              height={42}
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow-[0_2px_12px_rgba(229,9,20,0.4)] transition-transform duration-300 group-hover:scale-105"
              priority
            />
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center text-xl sm:text-2xl font-black tracking-tight text-white leading-none">
              <span className="tracking-tighter font-extrabold text-white">GIFTED</span>
              <span className="text-[#E50914] font-black px-0.5">pro</span>
              <span className="tracking-tight text-white">Movies</span>
            </div>
            <span className="text-[9px] font-mono tracking-widest text-[#D6A84F] uppercase pt-1 font-semibold">
              Swahili &amp; Global Cinema
            </span>
          </div>
        </Link>

        {showBackToHome && (
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111318] border border-[#262932] text-xs text-gray-400 hover:text-white hover:border-gray-600 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to</span> Browse
          </Link>
        )}
      </header>

      {/* Main Content Card */}
      <main className="relative z-10 w-full max-w-md mx-auto px-4 py-8 flex flex-col justify-center">
        <div className="rounded-2xl bg-[#0E1015]/95 border border-[#262932] p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Subtle top rim glow on card */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#E50914]/60 to-transparent" />

          {/* Heading */}
          <div className="text-center space-y-1.5 mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-[#A6A8B0] leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 py-6 text-center text-xs text-[#70737C]">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
          <span>© 2026 GIFTEDproMovies. All rights reserved.</span>
          <span>•</span>
          <span className="inline-flex items-center gap-1 text-gray-400">
            <Shield className="w-3.5 h-3.5 text-[#D6A84F]" />
            Official Account Gateway
          </span>
        </div>
      </footer>
    </div>
  );
}
