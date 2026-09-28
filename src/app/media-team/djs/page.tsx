'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Mic,
  Search,
  CheckCircle2,
  ExternalLink,
  Info,
  Copy,
} from 'lucide-react';
import { mockAvailableDjs } from '@/data/mock/mediaTeamData';

export default function MediaTeamDJsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyDj = (name: string) => {
    navigator.clipboard?.writeText(name);
    showToast(`DJ "${name}" copied to clipboard.`);
  };

  const filteredDjs = mockAvailableDjs.filter(dj =>
    dj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dj.dialect.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (dj.legalName && dj.legalName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-[#181A21] border border-emerald-500/40 text-white px-4 py-3 rounded-xl shadow-2xl text-xs backdrop-blur-md animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-[#111318] via-[#181A21] to-[#111318] p-6 rounded-2xl border border-[#262932] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#D6A84F]/20 text-[#D6A84F] border border-[#D6A84F]/30 uppercase">
              Admin-Approved Roster
            </span>
            <span className="text-xs text-[#70737C] font-mono">
              {mockAvailableDjs.length} Voice Translators Licensed
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
            DJs &amp; Voice Translators
          </h1>
          <p className="text-[#A6A8B0] text-xs mt-1 max-w-2xl font-sans">
            Commentators, voice actors, and translators are registered and licensed by Platform Administrators. Media operators assign editions from this approved talent roster.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/media-team/movies/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#B11226] hover:bg-[#8F0D1E] text-white font-semibold text-xs transition-all shadow-md shadow-[#B11226]/20 border border-[#B11226]/40"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Assign in New Title</span>
          </Link>
        </div>
      </div>

      {/* Admin Authority Advisory Card */}
      <div className="bg-[#111318] border border-[#262932] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#D6A84F]/10 border border-[#D6A84F]/20 flex items-center justify-center text-[#D6A84F] shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">
              DJ Registration & Licensing is Managed by Platform Administrators
            </h3>
            <p className="text-[11px] text-[#A6A8B0] mt-0.5">
              The media team uses already created voice translators from Admin and picks them when adding audio commentary editions. To onboard a new talent or renew licensing, manage them in Admin Operations.
            </p>
          </div>
        </div>

        <Link
          href="/admin/djs"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#181A21] hover:bg-[#262932] text-xs font-mono text-gray-300 hover:text-white border border-[#262932] shrink-0 transition-colors"
        >
          <span>Admin DJ Roster Manager</span>
          <ExternalLink className="w-3.5 h-3.5 text-[#D6A84F]" />
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#111318] border border-[#262932] rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#70737C] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search approved DJs by stage name, dialect, or legal name..."
            className="w-full bg-[#181A21] border border-[#262932] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-white/30"
          />
        </div>
        <span className="text-xs font-mono text-[#70737C] shrink-0">
          Showing <strong className="text-white">{filteredDjs.length}</strong> approved talent profiles
        </span>
      </div>

      {/* DJs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredDjs.map(dj => (
          <div
            key={dj.id}
            className="bg-[#111318] border border-[#262932] hover:border-white/20 rounded-2xl p-4 space-y-3 transition-colors flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#181A21] border border-[#262932] flex items-center justify-center text-[#D6A84F] shrink-0 font-mono font-bold text-xs">
                    {dj.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{dj.name}</h3>
                    {dj.legalName && (
                      <p className="text-[10px] text-[#70737C] font-mono">{dj.legalName}</p>
                    )}
                  </div>
                </div>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  Approved
                </span>
              </div>

              <div className="space-y-1 bg-[#181A21]/60 p-2.5 rounded-xl border border-[#262932]/50 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#70737C]">Dialect / Style:</span>
                  <span className="text-gray-300 font-medium">{dj.dialect}</span>
                </div>
                {dj.tier && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#70737C]">Roster Tier:</span>
                    <span className="text-[#D6A84F] font-mono text-[10px]">{dj.tier}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#262932] text-xs font-mono">
              <span className="text-[#70737C] text-[11px]">
                {dj.activeTitlesCount} Catalog Titles
              </span>

              <button
                type="button"
                onClick={() => handleCopyDj(dj.name)}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-white transition-colors"
                title="Copy DJ name"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
