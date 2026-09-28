'use client';

import React, { useState } from 'react';
import {
  Globe,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Flag,
} from 'lucide-react';
import { mockAvailableCountries } from '@/data/mock/mediaTeamData';

export default function MediaTeamCountriesPage() {
  const [countries, setCountries] = useState<string[]>([...mockAvailableCountries]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newCountryName, setNewCountryName] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredCountries = countries.filter(c =>
    c.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddCountry = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCountryName.trim();
    if (!trimmed) return;
    if (countries.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`Country "${trimmed}" already exists.`);
      return;
    }

    setCountries(prev => [...prev, trimmed]);
    setNewCountryName('');
    showToast(`Country "${trimmed}" added to catalog.`);
  };

  const handleRemoveCountry = (country: string) => {
    if (confirm(`Remove country "${country}" from active options?`)) {
      setCountries(prev => prev.filter(c => c !== country));
      showToast(`Country "${country}" removed.`);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-[#181A21] border border-emerald-500/40 text-white px-4 py-3 rounded-xl shadow-2xl text-xs backdrop-blur-md animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-[#111318] via-[#181A21] to-[#111318] p-6 rounded-2xl border border-[#262932] shadow-xl">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
            Taxonomies
          </span>
          <span className="text-xs text-[#70737C] font-mono">
            {countries.length} Countries Defined
          </span>
        </div>
        <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
          Catalog Origin Countries
        </h1>
        <p className="text-[#A6A8B0] text-xs mt-1 max-w-2xl font-sans">
          Manage production origin countries used to organize and filter international content.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Add Country Form */}
        <div className="bg-[#111318] border border-[#262932] rounded-2xl p-5 space-y-4 shadow-sm h-fit">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white">Add Origin Country</h2>
          </div>

          <form onSubmit={handleAddCountry} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-300">Country Name</label>
              <input
                type="text"
                value={newCountryName}
                onChange={e => setNewCountryName(e.target.value)}
                placeholder="e.g. Spain"
                className="w-full bg-[#181A21] border border-[#262932] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shadow-md shadow-blue-600/20"
            >
              Add Country
            </button>
          </form>
        </div>

        {/* Countries List */}
        <div className="md:col-span-2 bg-[#111318] border border-[#262932] rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-[#70737C] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search country..."
                className="w-full bg-[#181A21] border border-[#262932] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-blue-500"
              />
            </div>
            <span className="text-xs font-mono text-[#70737C] shrink-0">
              {filteredCountries.length} countries
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredCountries.map(country => (
              <div
                key={country}
                className="bg-[#181A21] border border-[#262932] hover:border-[#323642] rounded-xl p-3 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#111318] border border-[#262932] flex items-center justify-center text-blue-400">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-white">{country}</span>
                </div>

                <button
                  onClick={() => handleRemoveCountry(country)}
                  className="p-1.5 rounded text-[#70737C] hover:text-rose-400 hover:bg-[#111318] transition-colors"
                  title="Delete country"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
