'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { TrailerModal } from '@/components/customer/TrailerModal';
import { LipaModal } from '@/components/customer/LipaModal';
import { SearchDrawer } from '@/components/customer/SearchDrawer';
import { useCustomer } from '@/context/CustomerContext';
import {
  Film,
  Play,
  Download,
  Clock,
  Crown,
  CheckCircle2,
  ShieldCheck,
  User,
  ArrowRight,
} from 'lucide-react';

export default function CustomerLibraryPage() {
  const { isAuthenticated, toggleAuth, profile, entitlements, continueWatching } = useCustomer();
  const [activeTab, setActiveTab] = useState<'continue' | 'passes' | 'downloads'>('continue');

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      <CustomerHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-8">
        {/* User Account Bar */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#111318] border border-[#262932] shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#E50914] to-[#D6A84F] flex items-center justify-center font-black text-2xl text-white shadow-xl">
              {isAuthenticated ? profile.fullName.charAt(0) : 'G'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  {isAuthenticated ? profile.fullName : 'Guest Explorer'}
                </h1>
                {isAuthenticated && (
                  <span className="px-2 py-0.5 rounded-full bg-[#D6A84F]/20 text-[#D6A84F] border border-[#D6A84F]/40 text-[10px] font-mono font-bold uppercase flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    <span>{profile.vipTierName}</span>
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-gray-400 mt-0.5">
                {isAuthenticated
                  ? `${profile.email} • Mobile Money Linked`
                  : 'Browsing in Guest Mode (Preview Library)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button
                onClick={toggleAuth}
                className="px-4 py-2 rounded-xl bg-[#181A21] hover:bg-[#262932] text-xs font-mono text-gray-300 border border-[#262932]"
              >
                Sign Out
              </button>
            ) : (
              <Link
                href="/login?returnTo=/library"
                className="px-4 py-2 rounded-xl bg-[#181A21] hover:bg-[#262932] text-xs font-mono text-[#E50914] font-bold border border-[#262932]"
              >
                Sign In to Save
              </Link>
            )}
            <Link
              href="/subscriptions"
              className="px-4 py-2 rounded-xl bg-[#E50914] hover:bg-[#B11226] text-white text-xs font-bold shadow-md shadow-[#E50914]/20"
            >
              Manage Pass
            </Link>
          </div>
        </div>

        {/* Library Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#262932] pb-3 text-xs font-mono">
          <button
            onClick={() => setActiveTab('continue')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'continue'
                ? 'bg-white text-black font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Continue Watching ({continueWatching.length})
          </button>
          <button
            onClick={() => setActiveTab('passes')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'passes'
                ? 'bg-white text-black font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Active Passes &amp; Entitlements ({entitlements.length})
          </button>
          <button
            onClick={() => setActiveTab('downloads')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'downloads'
                ? 'bg-white text-black font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Offline Downloads
          </button>
        </div>

        {/* Tab 1: Continue Watching */}
        {activeTab === 'continue' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {continueWatching.map((item) => (
              <div
                key={item.id}
                className="group rounded-3xl bg-[#111318] border border-[#262932] hover:border-[#E50914]/50 overflow-hidden shadow-xl p-4 flex flex-col justify-between space-y-4"
              >
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-neutral-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.backdropUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-[#E50914]/40 transition-colors">
                    <Play className="w-8 h-8 text-white fill-current" />
                  </div>
                  {/* Scrubber bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                    <div
                      className="h-full bg-[#E50914]"
                      style={{ width: `${item.progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-[#D6A84F] uppercase">
                    {item.djName}
                  </span>
                  <h3 className="text-sm font-bold text-white truncate">{item.title}</h3>
                  <div className="flex items-center justify-between text-xs font-mono text-gray-400 pt-1">
                    <span>{item.progressPercent}% watched</span>
                    <span>{item.lastWatchedAt}</span>
                  </div>
                </div>

                <Link
                  href={`/watch/${item.slug}?dj=${encodeURIComponent(item.djName)}`}
                  className="w-full py-2.5 rounded-xl bg-[#E50914] hover:bg-[#B11226] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume Playback</span>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Active Entitlements & Passes */}
        {activeTab === 'passes' && (
          <div className="rounded-3xl bg-[#111318] border border-[#262932] overflow-hidden divide-y divide-[#262932]">
            {entitlements.map((ent) => (
              <div
                key={ent.id}
                className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase">
                      {ent.accessType === 'vip_pass' ? 'VIP Pass' : ent.accessType === 'download' ? 'Offline License' : 'Stream License'}
                    </span>
                    <span className="text-xs font-mono text-gray-400">Order: {ent.orderNumber}</span>
                  </div>
                  <h3 className="text-base font-bold text-white">{ent.itemTitle}</h3>
                  {ent.djName && (
                    <p className="text-xs font-mono text-[#D6A84F]">Audio: {ent.djName}</p>
                  )}
                  <p className="text-xs font-mono text-gray-500">
                    Expires on: <span className="text-gray-300">{ent.expiresAt}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-black font-mono text-white">
                    TSh {ent.amountTsh.toLocaleString()}
                  </span>
                  <Link
                    href={
                      ent.accessType === 'download'
                        ? `/movies/${ent.itemSlug}`
                        : `/watch/${ent.itemSlug}?dj=${encodeURIComponent(ent.djName || '')}`
                    }
                    className="px-4 py-2 rounded-xl bg-[#E50914] hover:bg-[#B11226] text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Watch Now</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Offline Downloads */}
        {activeTab === 'downloads' && (
          <div className="p-12 text-center space-y-4 rounded-3xl bg-[#111318] border border-[#262932]">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto">
              <Download className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">Offline Downloads Ready</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              You have 1 active offline download license (John Wick: Chapter 4). You can save high-fidelity MP4 files to any Android, iOS, or PC browser.
            </p>
            <Link
              href="/movies/john-wick-chapter-4"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs hover:bg-neutral-200"
            >
              <span>Download Movie File</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </main>

      <TrailerModal />
      <LipaModal />
      <SearchDrawer />
      <CustomerFooter />
    </div>
  );
}
