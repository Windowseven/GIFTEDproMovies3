'use client';

import React, { useState, useEffect, useMemo } from "react";
import {
  Globe,
  Plus,
  Search,
  CheckCircle2,
  X,
  Check,
  Trash2,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import { adminRepository } from "@/lib/repositories/adminRepository";
import { AdminCountry } from "@/types/admin";
import { WORLD_COUNTRIES_CATALOG, CountryPreset, getFlagEmoji } from "@/lib/data/worldCountries";

export default function AdminCountriesPage() {
  const [countries, setCountries] = useState<AdminCountry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Smart Add Country Form State
  const [typeSearch, setTypeSearch] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<CountryPreset | null>(null);
  const [customName, setCustomName] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [customFlag, setCustomFlag] = useState("🌍");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadCountries = async () => {
    const data = await adminRepository.getCountries();
    setCountries(data);
  };

  useEffect(() => {
    loadCountries();
  }, []);

  // Filter existing countries for search bar on main page
  const filteredCountries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [countries, searchQuery]);

  // Autocomplete matching presets for modal
  const matchingPresets = useMemo(() => {
    const q = typeSearch.toLowerCase().trim();
    if (!q) return WORLD_COUNTRIES_CATALOG.slice(0, 8);
    return WORLD_COUNTRIES_CATALOG.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q)
    );
  }, [typeSearch]);

  const handleSelectPreset = (preset: CountryPreset) => {
    setSelectedPreset(preset);
    setTypeSearch(preset.name);
    setCustomName(preset.name);
    setCustomCode(preset.code);
    setCustomFlag(preset.flag);
    setIsDropdownOpen(false);
  };

  const handleCustomTypeChange = (val: string) => {
    setTypeSearch(val);
    setSelectedPreset(null);
    setCustomName(val);
    setIsDropdownOpen(true);

    // If matches exactly with a preset, link it automatically
    const exact = WORLD_COUNTRIES_CATALOG.find(
      (c) => c.name.toLowerCase() === val.toLowerCase().trim()
    );
    if (exact) {
      setSelectedPreset(exact);
      setCustomCode(exact.code);
      setCustomFlag(exact.flag);
    } else if (val.trim().length >= 2) {
      // Inferred ISO code
      const inferredCode = val.trim().slice(0, 2).toUpperCase();
      setCustomCode(inferredCode);
      setCustomFlag(getFlagEmoji(inferredCode));
    }
  };

  const handleAddCountry = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = customName.trim() || typeSearch.trim();
    const finalCode = customCode.trim().toUpperCase();

    if (!finalName || !finalCode) {
      showToast("Please select or enter a valid country name and ISO code.");
      return;
    }

    if (countries.some((c) => c.code.toLowerCase() === finalCode.toLowerCase())) {
      showToast(`A region with ISO code "${finalCode}" already exists.`);
      return;
    }

    await adminRepository.addCountry({
      code: finalCode,
      name: finalName,
      flagEmoji: customFlag || getFlagEmoji(finalCode),
      contentCount: 0,
      isActive: true,
    });

    setIsModalOpen(false);
    resetModal();
    showToast(`Country "${finalName}" (${finalCode}) successfully added.`);
    loadCountries();
  };

  const handleDeleteCountry = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove "${name}" from platform countries?`)) {
      await adminRepository.deleteCountry(id);
      showToast(`Country "${name}" removed.`);
      loadCountries();
    }
  };

  const handleToggleStatus = async (id: string) => {
    await adminRepository.toggleCountryStatus(id);
    loadCountries();
  };

  const resetModal = () => {
    setTypeSearch("");
    setSelectedPreset(null);
    setCustomName("");
    setCustomCode("");
    setCustomFlag("🌍");
    setShowAdvanced(false);
    setIsDropdownOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#181A21] border border-[#10B981]/40 text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-[#10B981]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#111318] via-[#181A21] to-[#111318] border border-[#262932] p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#B11226]" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Countries & Regional Origins
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#181A21] text-[#A6A8B0] border border-[#262932]">
              {countries.length} Registered
            </span>
          </div>
          <p className="text-xs text-[#A6A8B0]">
            Manage content country tags, regional origin flags, and catalog discovery filters.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetModal();
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-[#B11226] text-white font-semibold text-xs hover:bg-[#8F0D1E] transition-all flex items-center justify-center gap-2 shadow-md shadow-[#B11226]/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Country</span>
        </button>
      </div>

      {/* Search & Statistics Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#70737C]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search registered countries by name or ISO code..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-[#D6A84F]/50"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#A6A8B0]">
          <span>Active: <strong className="text-emerald-400 font-bold">{countries.filter(c => c.isActive).length}</strong></span>
          <span>•</span>
          <span>Total Titles Linked: <strong className="text-white font-bold">{countries.reduce((acc, c) => acc + c.contentCount, 0)}</strong></span>
        </div>
      </div>

      {/* Countries Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCountries.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-[#111318] border border-[#262932] rounded-2xl space-y-2">
            <Globe className="w-8 h-8 text-[#70737C] mx-auto" />
            <p className="text-sm font-semibold text-white">No countries matched your search</p>
            <p className="text-xs text-[#70737C]">Try a different keyword or click "Add Country" above.</p>
          </div>
        ) : (
          filteredCountries.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-2xl bg-[#111318] border border-[#262932] hover:border-[#70737C]/40 transition-colors flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-[#181A21] border border-[#262932] flex items-center justify-center text-3xl shrink-0 shadow-inner">
                  {c.flagEmoji}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{c.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#181A21] text-[#A6A8B0] border border-[#262932] font-semibold">
                      {c.code}
                    </span>
                    <span className="text-[11px] font-mono text-[#70737C]">
                      {c.contentCount} title{c.contentCount === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Active Toggle Button */}
                <button
                  type="button"
                  onClick={() => handleToggleStatus(c.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                    c.isActive
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                      : "bg-zinc-500/15 text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/25"
                  }`}
                  title="Toggle country visibility in discovery filters"
                >
                  {c.isActive ? "ACTIVE" : "INACTIVE"}
                </button>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => handleDeleteCountry(c.id, c.name)}
                  className="p-1.5 rounded-lg text-[#70737C] hover:text-[#DC2626] hover:bg-[#DC2626]/10 transition-colors"
                  title="Remove Country"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Smart Country Addition Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="relative w-full max-w-lg rounded-2xl bg-[#181A21] border border-[#262932] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#262932]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D6A84F]" />
                <h3 className="text-sm font-bold text-white">Add Country Origin</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#70737C] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCountry} className="space-y-4 text-xs">
              {/* Intelligent Country Search / Typing Field */}
              <div className="space-y-1 relative">
                <label className="text-[#A6A8B0] font-medium flex items-center justify-between">
                  <span>Type Country Name</span>
                  <span className="text-[10px] text-[#70737C] font-mono">Auto-detects Flag & ISO Code</span>
                </label>

                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={typeSearch}
                    onChange={(e) => handleCustomTypeChange(e.target.value)}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder="e.g. Kenya, Nigeria, South Africa, Turkey..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none focus:border-[#B11226] text-xs"
                  />
                  {typeSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setTypeSearch("");
                        setSelectedPreset(null);
                        setCustomName("");
                        setCustomCode("");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#70737C] hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {isDropdownOpen && matchingPresets.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto bg-[#111318] border border-[#262932] rounded-xl shadow-2xl z-30 divide-y divide-[#262932]/40 scrollbar-thin">
                    {matchingPresets.map((preset) => {
                      const isAlreadyAdded = countries.some(
                        (c) => c.code.toLowerCase() === preset.code.toLowerCase()
                      );

                      return (
                        <div
                          key={preset.code}
                          onClick={() => {
                            if (!isAlreadyAdded) handleSelectPreset(preset);
                          }}
                          className={`p-2.5 flex items-center justify-between transition-colors ${
                            isAlreadyAdded
                              ? "opacity-50 cursor-not-allowed bg-black/20"
                              : "cursor-pointer hover:bg-[#181A21]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl shrink-0">{preset.flag}</span>
                            <div>
                              <span className="font-bold text-white text-xs block">
                                {preset.name}
                              </span>
                              <span className="text-[10px] font-mono text-[#70737C]">
                                {preset.region}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#181A21] text-[#A6A8B0] border border-[#262932]">
                              {preset.code}
                            </span>
                            {isAlreadyAdded && (
                              <span className="text-[10px] text-amber-400 font-mono">
                                In Catalog
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Instant Auto-Detection Preview Card */}
              {(selectedPreset || (customName.trim() && customCode.trim())) && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-[#111318] to-[#181A21] border border-emerald-500/40 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Auto-Detection Ready
                    </span>
                    <span className="text-[10px] font-mono text-[#70737C]">
                      ISO-3166 Standard
                    </span>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <div className="w-14 h-14 rounded-xl bg-[#111318] border border-[#262932] flex items-center justify-center text-4xl shrink-0 shadow-lg">
                      {customFlag || (selectedPreset ? selectedPreset.flag : "🌍")}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-base font-bold text-white truncate">
                        {customName || selectedPreset?.name}
                      </h4>
                      <p className="text-xs font-mono text-[#A6A8B0] flex items-center gap-2 mt-0.5">
                        <span>ISO Code: <strong className="text-white font-bold">{customCode || selectedPreset?.code}</strong></span>
                        {selectedPreset && <span>• {selectedPreset.region}</span>}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced / Custom Override Toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1.5 text-[11px] text-[#70737C] hover:text-[#A6A8B0] transition-colors"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>{showAdvanced ? "Hide Manual Adjustments" : "Need to adjust ISO code or Flag emoji manually?"}</span>
                  {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showAdvanced && (
                  <div className="mt-3 p-3.5 rounded-xl bg-[#111318] border border-[#262932] space-y-3 animate-in fade-in">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[#A6A8B0] font-medium text-[11px]">ISO Code (2-char)</label>
                        <input
                          type="text"
                          maxLength={2}
                          value={customCode}
                          onChange={(e) => {
                            const code = e.target.value.toUpperCase();
                            setCustomCode(code);
                            if (code.length === 2) {
                              setCustomFlag(getFlagEmoji(code));
                            }
                          }}
                          placeholder="e.g. KE"
                          className="w-full px-3 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-white focus:outline-none font-mono uppercase text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[#A6A8B0] font-medium text-[11px]">Flag Emoji</label>
                        <input
                          type="text"
                          value={customFlag}
                          onChange={(e) => setCustomFlag(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-white focus:outline-none text-base"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-[#262932] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#111318] border border-[#262932] text-[#A6A8B0] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!customName.trim() || !customCode.trim()}
                  className="px-5 py-2 rounded-xl bg-[#B11226] text-white font-semibold hover:bg-[#8F0D1E] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-[#B11226]/20"
                >
                  Add Country to Platform
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
