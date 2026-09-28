'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  Search,
  CheckCircle2,
  Tag,
  ExternalLink,
  Info,
  Copy,
} from 'lucide-react';
import { mockAvailableCategoryDetails } from '@/data/mock/mediaTeamData';

export default function MediaTeamCategoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyCategory = (name: string) => {
    navigator.clipboard?.writeText(name);
    showToast(`Category "${name}" copied to clipboard.`);
  };

  const filteredCategories = mockAvailableCategoryDetails.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.description.toLowerCase().includes(searchQuery.toLowerCase())
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
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#181A21] text-[#A6A8B0] border border-[#262932] uppercase">
              Admin-Defined Taxonomies
            </span>
            <span className="text-xs text-[#70737C] font-mono">
              {mockAvailableCategoryDetails.length} Categories Active
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
            Catalog Categories & Genres
          </h1>
          <p className="text-[#A6A8B0] text-xs mt-1 max-w-2xl font-sans">
            Categories are defined and governed by Platform Administrators. Media operators pick from these official genre taxonomies when cataloging movies and serialized titles.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/media-team/movies/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#B11226] hover:bg-[#8F0D1E] text-white font-semibold text-xs transition-all shadow-md shadow-[#B11226]/20 border border-[#B11226]/40"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Pick in New Title</span>
          </Link>
        </div>
      </div>

      {/* Admin Authority Advisory Card */}
      <div className="bg-[#111318] border border-[#262932] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">
              Category Creation is Managed by Platform Administrators
            </h3>
            <p className="text-[11px] text-[#A6A8B0] mt-0.5">
              The media team uses already created categories from Admin and picks them during intake. Need a new genre or taxonomy tag created? Contact your platform admin or request category creation in Admin Operations.
            </p>
          </div>
        </div>

        <Link
          href="/admin/categories"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#181A21] hover:bg-[#262932] text-xs font-mono text-gray-300 hover:text-white border border-[#262932] shrink-0 transition-colors"
        >
          <span>Admin Taxonomy Manager</span>
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
            placeholder="Search active categories or descriptions..."
            className="w-full bg-[#181A21] border border-[#262932] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-white/30"
          />
        </div>
        <span className="text-xs font-mono text-[#70737C] shrink-0">
          Showing <strong className="text-white">{filteredCategories.length}</strong> categories
        </span>
      </div>

      {/* Category Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredCategories.map(cat => (
          <div
            key={cat.name}
            className="bg-[#111318] border border-[#262932] hover:border-white/20 rounded-2xl p-4 space-y-3 transition-colors flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#181A21] border border-[#262932] flex items-center justify-center text-purple-400">
                    <Tag className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-bold text-white">{cat.name}</h3>
                </div>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  Pickable
                </span>
              </div>

              <p className="text-xs text-[#A6A8B0] line-clamp-2 leading-relaxed">
                {cat.description}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#262932] text-xs font-mono">
              <span className="text-[#70737C] text-[11px]">
                {cat.titlesCount} Titles Tagged
              </span>

              <button
                type="button"
                onClick={() => handleCopyCategory(cat.name)}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-white transition-colors"
                title="Copy category name"
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
