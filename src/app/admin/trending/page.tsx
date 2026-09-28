'use client';

import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  Flame,
  ArrowUpRight,
  Check,
  Star,
  Plus,
  Search,
  Trash2,
  X,
  ChevronUp,
  ChevronDown,
  Film,
  Tv,
  Pin,
  Sparkles,
  BarChart3,
  Eye,
  Info,
} from "lucide-react";
import { adminRepository } from "@/lib/repositories/adminRepository";
import { TrendingItem, AdminMovie, AdminSeries } from "@/types/admin";

export default function AdminTrendingPage() {
  const [items, setItems] = useState<TrendingItem[]>([]);
  const [movies, setMovies] = useState<AdminMovie[]>([]);
  const [seriesList, setSeriesList] = useState<AdminSeries[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "movie" | "series" | "promoted">("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContentType, setModalContentType] = useState<"movie" | "series">("movie");
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [selectedContent, setSelectedContent] = useState<AdminMovie | AdminSeries | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    const [trend, mov, ser] = await Promise.all([
      adminRepository.getTrendingItems(),
      adminRepository.getMovies(),
      adminRepository.getSeries(),
    ]);
    setItems(trend);
    setMovies(mov);
    setSeriesList(ser);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Trending List
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        filterType === "all"
          ? true
          : filterType === "movie"
          ? item.contentType === "movie"
          : filterType === "series"
          ? item.contentType === "series"
          : item.isManuallyPromoted;

      return matchesSearch && matchesFilter;
    });
  }, [items, searchQuery, filterType]);

  // Derived metrics
  const pinnedCount = useMemo(() => items.filter((i) => i.isManuallyPromoted).length, [items]);
  const leaderItem = useMemo(() => items.find((i) => i.rank === 1), [items]);
  const peakVelocity = useMemo(() => {
    if (items.length === 0) return 0;
    return Math.max(...items.map((i) => i.viewsVelocity));
  }, [items]);

  // Handlers
  const handleToggleManual = async (id: string) => {
    await adminRepository.toggleManualTrending(id);
    showToast("Promotion status updated.");
    loadData();
  };

  const handlePinToTop = async (id: string, title: string) => {
    await adminRepository.pinTrendingToTop(id);
    showToast(`"${title}" pinned to Rank #1.`);
    loadData();
  };

  const handleMove = async (id: string, direction: "up" | "down") => {
    await adminRepository.moveTrendingItem(id, direction);
    showToast("Rank position updated.");
    loadData();
  };

  const handleRemove = async (id: string, title: string) => {
    if (confirm(`Remove "${title}" from the Top 10 Trending list?`)) {
      await adminRepository.removeTrendingItem(id);
      showToast(`"${title}" removed from Trending.`);
      loadData();
    }
  };

  // Available Choices for Modal
  const availableChoices = useMemo(() => {
    const q = modalSearchQuery.toLowerCase().trim();
    if (modalContentType === "movie") {
      return movies.filter(
        (m) =>
          !items.some((t) => t.contentId === m.id) &&
          (q === "" || m.title.toLowerCase().includes(q))
      );
    } else {
      return seriesList.filter(
        (s) =>
          !items.some((t) => t.contentId === s.id) &&
          (q === "" || s.title.toLowerCase().includes(q))
      );
    }
  }, [modalContentType, modalSearchQuery, movies, seriesList, items]);

  const handleAddTrending = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContent) return;

    if (items.length >= 10) {
      if (!confirm("The Top 10 list currently has 10 titles. Adding this will place it in trending. Continue?")) {
        return;
      }
    }

    await adminRepository.addTrendingItem({
      contentId: selectedContent.id,
      contentType: modalContentType,
      title: selectedContent.title,
      posterUrl: selectedContent.posterUrl,
      category:
        modalContentType === "movie"
          ? (selectedContent as AdminMovie).genres?.[0] || "Action"
          : (selectedContent as AdminSeries).genres?.[0] || "Drama",
    });

    setIsModalOpen(false);
    setSelectedContent(null);
    setModalSearchQuery("");
    showToast(`"${selectedContent.title}" added to Trending Top 10!`);
    loadData();
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
            <TrendingUp className="w-5 h-5 text-[#B11226]" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Trending Content &amp; Top 10 Velocity
            </h1>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-[#181A21] text-[#D6A84F] border border-[#D6A84F]/30 font-bold">
              {items.length}/10 In Top 10
            </span>
          </div>
          <p className="text-xs text-[#A6A8B0] max-w-3xl leading-relaxed">
            Monitor real-time viewer velocity across East Africa and curate the Top 10 Trending list. Manually pin blockbuster premieres to #1 or #2, reorder positions, or let automated view/download algorithms rank titles organically. Changes sync live to the customer homepage.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedContent(null);
            setModalSearchQuery("");
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-[#B11226] hover:bg-[#8F0D1E] text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-[#B11226]/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add to Trending</span>
        </button>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] space-y-1">
          <div className="flex items-center justify-between text-[#70737C]">
            <span className="text-[11px] font-mono uppercase">Top 10 Capacity</span>
            <Flame className="w-4 h-4 text-[#E50914]" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-white">{items.length} <span className="text-xs font-mono text-[#70737C]">/ 10</span></p>
          <p className="text-[11px] text-[#A6A8B0]">Active titles on Customer rail</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] space-y-1">
          <div className="flex items-center justify-between text-[#70737C]">
            <span className="text-[11px] font-mono uppercase">Admin Pinned</span>
            <Star className="w-4 h-4 text-[#D6A84F]" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#D6A84F]">{pinnedCount} <span className="text-xs font-mono text-[#70737C]">Titles</span></p>
          <p className="text-[11px] text-[#A6A8B0]">Manually boosted rankings</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] space-y-1">
          <div className="flex items-center justify-between text-[#70737C]">
            <span className="text-[11px] font-mono uppercase">#1 Ranked Leader</span>
            <Sparkles className="w-4 h-4 text-[#D6A84F]" />
          </div>
          <p className="text-sm sm:text-base font-black text-white truncate">{leaderItem?.title || "None"}</p>
          <p className="text-[11px] text-[#10B981] font-mono">+{leaderItem?.viewsVelocity || 0} views/hr</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] space-y-1">
          <div className="flex items-center justify-between text-[#70737C]">
            <span className="text-[11px] font-mono uppercase">Peak Velocity</span>
            <TrendingUp className="w-4 h-4 text-[#10B981]" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#10B981]">+{peakVelocity.toLocaleString()} <span className="text-xs font-mono text-[#70737C]">/hr</span></p>
          <p className="text-[11px] text-[#A6A8B0]">Real-time viewer surge</p>
        </div>
      </div>

      {/* Pro-Tip & Customer Sync Notice */}
      <div className="px-4 py-3 rounded-2xl bg-[#111318] border border-[#262932] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#A6A8B0]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse shrink-0" />
          <span>
            <strong className="text-white font-semibold">Live Customer Homepage Sync:</strong> Ranks #1 through #10 below display with numbered badges on the customer homepage &quot;Trending Movies&quot; rail. Reordering ranks or pinning titles updates customer views immediately.
          </span>
        </div>
        <span className="text-[11px] font-mono text-[#D6A84F] shrink-0 font-semibold">
          Auto-Rank + Manual Override Active
        </span>
      </div>

      {/* Search and Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#70737C]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search trending titles by name or category..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-[#D6A84F]/50"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              filterType === "all"
                ? "bg-[#181A21] text-white border-[#D6A84F]/40 shadow-sm"
                : "text-[#70737C] border-transparent hover:text-white"
            }`}
          >
            All Titles ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("movie")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              filterType === "movie"
                ? "bg-[#181A21] text-white border-[#D6A84F]/40 shadow-sm"
                : "text-[#70737C] border-transparent hover:text-white"
            }`}
          >
            Movies
          </button>
          <button
            type="button"
            onClick={() => setFilterType("series")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              filterType === "series"
                ? "bg-[#181A21] text-white border-[#D6A84F]/40 shadow-sm"
                : "text-[#70737C] border-transparent hover:text-white"
            }`}
          >
            Series
          </button>
          <button
            type="button"
            onClick={() => setFilterType("promoted")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              filterType === "promoted"
                ? "bg-[#D6A84F]/15 text-[#D6A84F] border-[#D6A84F]/40 shadow-sm"
                : "text-[#70737C] border-transparent hover:text-[#D6A84F]"
            }`}
          >
            ★ Pinned Only ({pinnedCount})
          </button>
        </div>
      </div>

      {/* Trending Ranking List & Table */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center bg-[#111318] border border-[#262932] rounded-2xl space-y-2">
            <TrendingUp className="w-8 h-8 text-[#70737C] mx-auto" />
            <p className="text-sm font-semibold text-white">No trending titles found</p>
            <p className="text-xs text-[#70737C]">Click &quot;Add to Trending&quot; above to add movies or series into the Top 10.</p>
          </div>
        ) : (
          filteredItems.map((item, index) => {
            const isTop1 = item.rank === 1;
            const isTop3 = item.rank <= 3;

            return (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isTop1
                    ? "bg-gradient-to-r from-[#181A21] via-[#15171E] to-[#111318] border-[#D6A84F]/50 shadow-lg shadow-[#D6A84F]/5"
                    : isTop3
                    ? "bg-[#111318] border-[#383C4A] hover:border-[#D6A84F]/30"
                    : "bg-[#111318] border-[#262932] hover:border-[#70737C]/40"
                }`}
              >
                {/* Left Details */}
                <div className="flex items-center gap-4 min-w-0">
                  {/* Rank Badge */}
                  <div
                    className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl border shrink-0 font-mono ${
                      isTop1
                        ? "bg-[#D6A84F]/15 border-[#D6A84F] text-[#D6A84F]"
                        : isTop3
                        ? "bg-[#181A21] border-[#70737C] text-white"
                        : "bg-[#181A21] border-[#262932] text-[#A6A8B0]"
                    }`}
                  >
                    <span className="text-[9px] uppercase tracking-wider">Rank</span>
                    <span className="font-black text-base">#{item.rank}</span>
                  </div>

                  {/* Poster Thumbnail */}
                  <div className="w-12 h-16 rounded-xl bg-[#181A21] overflow-hidden shrink-0 border border-[#262932] relative shadow-inner">
                    <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 py-0.5 text-center text-[8px] font-mono font-bold uppercase bg-black/80 text-white">
                      {item.contentType}
                    </span>
                  </div>

                  {/* Title and Metadata */}
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
                        {item.title}
                      </h3>
                      {item.isManuallyPromoted && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#D6A84F]/15 text-[#D6A84F] border border-[#D6A84F]/30 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" /> Pinned
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#70737C]">
                      Category: <span className="text-[#A6A8B0]">{item.category}</span> • Velocity:{" "}
                      <span className="font-mono text-[#10B981] font-semibold">+{item.viewsVelocity} views/hr</span>
                    </p>
                  </div>
                </div>

                {/* Right Controls */}
                <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-[#262932]">
                  {/* Quick Pin to #1 (only if not already #1) */}
                  {!isTop1 && (
                    <button
                      type="button"
                      onClick={() => handlePinToTop(item.id, item.title)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#181A21] border border-[#D6A84F]/30 text-xs font-semibold text-[#D6A84F] hover:bg-[#D6A84F]/15 transition-colors flex items-center gap-1.5"
                      title="Instantly pin this title to Rank #1"
                    >
                      <Pin className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Pin to #1</span>
                    </button>
                  )}

                  {/* Promotion Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleManual(item.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      item.isManuallyPromoted
                        ? "bg-[#D6A84F]/15 text-[#D6A84F] border-[#D6A84F]/30 hover:bg-[#D6A84F]/25"
                        : "bg-[#181A21] text-[#A6A8B0] border-[#262932] hover:text-white hover:border-[#70737C]"
                    }`}
                    title={item.isManuallyPromoted ? "Switch back to organic velocity calculation" : "Manually pin in Top 10"}
                  >
                    {item.isManuallyPromoted ? "★ Pinned" : "○ Organic"}
                  </button>

                  {/* Move Up / Down Buttons */}
                  <div className="flex items-center gap-1 bg-[#181A21] border border-[#262932] rounded-xl p-0.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(item.id, "up")}
                      className="p-1.5 rounded-lg text-[#70737C] hover:text-white hover:bg-[#111318] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move higher in Top 10 ranking"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === filteredItems.length - 1}
                      onClick={() => handleMove(item.id, "down")}
                      className="p-1.5 rounded-lg text-[#70737C] hover:text-white hover:bg-[#111318] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move lower in Top 10 ranking"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Remove from Trending */}
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id, item.title)}
                    className="p-1.5 rounded-xl text-[#70737C] hover:text-[#DC2626] hover:bg-[#DC2626]/10 border border-transparent hover:border-[#DC2626]/20 transition-colors"
                    title="Remove from Top 10 Trending"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Title to Trending Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-[#181A21] border border-[#262932] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#262932]">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#B11226]" />
                <h3 className="text-sm font-bold text-white">Add Title to Trending Top 10</h3>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-[#70737C] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTrending} className="space-y-4 text-xs">
              {/* Type Switcher (Movie vs Series) */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#111318] border border-[#262932]">
                <button
                  type="button"
                  onClick={() => {
                    setModalContentType("movie");
                    setSelectedContent(null);
                  }}
                  className={`py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                    modalContentType === "movie"
                      ? "bg-[#181A21] text-white shadow-sm border border-[#262932]"
                      : "text-[#70737C] hover:text-[#A6A8B0]"
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Movie</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalContentType("series");
                    setSelectedContent(null);
                  }}
                  className={`py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                    modalContentType === "series"
                      ? "bg-[#181A21] text-white shadow-sm border border-[#262932]"
                      : "text-[#70737C] hover:text-[#A6A8B0]"
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>Series</span>
                </button>
              </div>

              {/* Title Search Input */}
              <div className="space-y-1">
                <label className="text-[#A6A8B0] font-medium">Search Library Titles</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#70737C]" />
                  <input
                    type="text"
                    value={modalSearchQuery}
                    onChange={(e) => setModalSearchQuery(e.target.value)}
                    placeholder={`Search available ${modalContentType}s...`}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none focus:border-[#D6A84F]"
                  />
                </div>
              </div>

              {/* Title Pick List */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                <label className="text-[10px] text-[#70737C] font-mono uppercase">Select Title *</label>
                {availableChoices.length === 0 ? (
                  <p className="text-[#70737C] text-center py-4">No matching titles available to add to Trending.</p>
                ) : (
                  availableChoices.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedContent(item)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                        selectedContent?.id === item.id
                          ? "bg-[#111318] border-[#D6A84F] text-white"
                          : "bg-[#111318] border-[#262932] text-[#A6A8B0] hover:bg-[#181A21] hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-12 rounded-lg bg-[#08090C] overflow-hidden shrink-0 border border-[#262932]">
                          <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs truncate text-white">{item.title}</p>
                          <p className="text-[10px] text-[#70737C] font-mono">
                            {item.releaseYear} • {item.genres?.join(", ")}
                          </p>
                        </div>
                      </div>

                      {selectedContent?.id === item.id && (
                        <Check className="w-4 h-4 text-[#D6A84F] shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Actions */}
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
                  disabled={!selectedContent}
                  className="px-5 py-2 rounded-xl bg-[#B11226] hover:bg-[#8F0D1E] text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-[#B11226]/20"
                >
                  Add to Trending Top 10
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
