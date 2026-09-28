'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, Home, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { CustomerBrandLogo } from '@/components/customer/CustomerBrandLogo';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { user, role, logout } = useAuth();

  const getRoleAppropriateDestination = () => {
    if (role === 'ADMIN') return '/admin';
    if (role === 'MEDIA_TEAM') return '/media-team';
    return '/';
  };

  const destination = getRoleAppropriateDestination();

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col justify-between p-4 sm:p-8 select-none relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-rose-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between">
        <CustomerBrandLogo />
      </header>

      {/* Main card */}
      <main className="max-w-md mx-auto w-full py-12 text-center space-y-6 relative z-10">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500 shadow-xl shadow-rose-900/20">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 font-bold px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
            HTTP 403 • ACCESS RESTRICTED
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Permission Required
          </h1>
          <p className="text-xs sm:text-sm text-[#A6A8B0] leading-relaxed">
            You are currently signed in as{' '}
            <span className="text-white font-semibold">{user?.email || 'Guest'}</span>{' '}
            ({role}), which does not have permission to access this area.
          </p>
        </div>

        <div className="space-y-3 pt-4">
          <Link
            href={destination}
            className="w-full py-3 px-4 rounded-xl bg-[#E50914] hover:bg-[#B11226] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#E50914]/25 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Return to Allowed Area ({role === 'GUEST' ? 'Home' : role})</span>
          </Link>

          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-[#111318] border border-[#262932] hover:bg-[#181A21] hover:text-white text-gray-300 font-semibold text-xs transition-all flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4 text-gray-400" />
            <span>Switch to Another Account</span>
          </button>
        </div>

        <div className="pt-4 border-t border-[#262932]/70 text-[11px] text-[#70737C]">
          If you believe this is an error, please contact your system administrator.
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-[#70737C]">
        GIFTEDproMovies • Role-based Content Security Matrix
      </footer>
    </div>
  );
}
