'use client';

import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  X,
  Check,
  ChevronUp,
  ChevronDown,
  Film,
  Tv,
  Layers,
  SlidersHorizontal,
} from "lucide-react";
import { adminRepository } from "@/lib/repositories/adminRepository";
import { FeaturedItem, AdminMovie, AdminSeries } from "@/types/admin";

export default function AdminFeaturedPage() {
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [movies, setMovies] = useState<AdminMovie[]>([]);
  const [seriesList, setSeriesList] = useState<AdminSeries[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
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
    const [feat, mov, ser] = await Promise.all([
      adminRepository.getFeaturedItems(),
      adminRepository.getMovies(),
      adminRepository.getSeries(),
    ]);
    setItems(feat);
    setMovies(mov);
    setSeriesList(ser);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      return (
        searchQuery.trim() === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [items, searchQuery]);

  const activeCount = useMemo(() => {
    return items.filter((i) => i.isActive).length;
  }, [items]);

  const handleToggle = async (id: string) => {
    await adminRepository.toggleFeaturedItem(id);
    showToast("Hero billboard carousel status updated.");
    loadData();
  };

  const handleMove = async (id: string, direction: "up" | "down") => {
    await adminRepository.moveFeaturedItem(id, direction);
    showToast("Hero slide order updated.");
    loadData();
  };

  const handleRemove = async (id: string, title: string) => {
    if (confirm(`Remove "${title}" from the homepage hero billboard carousel?`)) {
      await adminRepository.removeFeaturedItem(id);
      showToast(`"${title}" removed from hero carousel.`);
      loadData();
    }
  };

  const availableChoices = useMemo(() => {
    const q = modalSearchQuery.toLowerCase().trim();
    if (modalContentType === "movie") {
      return movies.filter(
        (m) =>
          !items.some((f) => f.contentId === m.id) &&
          (q === "" || m.title.toLowerCase().includes(q))
      );
    } else {
      return seriesList.filter(
        (s) =>
          !items.some((f) => f.contentId === s.id) &&
          (q === "" || s.title.toLowerCase().includes(q))
      );
    }
  }, [modalContentType, modalSearchQuery, movies, seriesList, items]);

  const handleAddFeatured = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContent) return;

    await adminRepository.addFeaturedItem({
      contentId: selectedContent.id,
      contentType: modalContentType,
      title: selectedContent.title,
      backdropUrl: selectedContent.backdropUrl || selectedContent.posterUrl,
      posterUrl: selectedContent.posterUrl,
      category:
        modalContentType === "movie"
          ? (selectedContent as AdminMovie).genres?.[0] || "Action"
          : (selectedContent as AdminSeries).genres?.[0] || "Drama",
      placement: "billboard",
      isActive: true,
    });

    setIsModalOpen(false);
    setSelectedContent(null);
    setModalSearchQuery("");
    showToast(`"${selectedContent.title}" added to Hero Billboard Carousel!`);
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
            <Sparkles className="w-4 h-4 text-[#D6A84F]" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Hero Billboard Carousel
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#181A21] text-[#D6A84F] border border-[#D6A84F]/30 font-bold">
              {activeCount} Active in Carousel
            </span>
          </div>
          <p className="text-xs text-[#A6A8B0] max-w-3xl leading-relaxed">
            Curate the top 3–5 rotating blockbuster banners displayed in the full-screen hero slider on the customer homepage. All other rows below (New Releases, Trending, Categories) update automatically based on upload timestamps and viewer activity.
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
          <span>Add to Hero Carousel</span>
        </button>
      </div>

      {/* Guidance Notice */}
      <div className="px-4 py-3 rounded-2xl bg-[#111318] border border-[#262932] flex items-center justify-between text-xs text-[#A6A8B0]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse shrink-0" />
          <span>
            <strong className="text-white font-semibold">Carousel Pro-Tip:</strong> We recommend keeping <strong>3 to 5 slides</strong> in rotation for the best viewer experience and fast homepage loading.
          </span>
        </div>
        <span className="text-[11px] font-mono text-[#70737C] hidden md:inline">
          {items.length} Total Curated
        </span>
      </div>

      {/* Search Toolbar */}
      <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#70737C]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hero billboard titles by name or category..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-[#D6A84F]/50"
          />
        </div>
      </div>

      {/* Hero Carousel Slides List with Reorder Controls */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center bg-[#111318] border border-[#262932] rounded-2xl space-y-2">
            <Sparkles className="w-8 h-8 text-[#70737C] mx-auto" />
            <p className="text-sm font-semibold text-white">No hero carousel slides found</p>
            <p className="text-xs text-[#70737C]">Click "Add to Hero Carousel" above to select movies or series for the top banner.</p>
          </div>
        ) : (
          filteredItems.map((item, index) => (
            <div
              key={item.id}
              className="p-4 sm:p-5 rounded-2xl bg-[#111318] border border-[#262932] hover:border-[#70737C]/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left Details */}
              <div className="flex items-center gap-4 min-w-0">
                {/* Slide Position Badge */}
                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-[#181A21] border border-[#262932] shrink-0">
                  <span className="text-[9px] font-mono uppercase text-[#70737C]">Slide</span>
                  <span className="font-mono font-black text-sm text-[#D6A84F]">#{index + 1}</span>
                </div>

                {/* Wide Backdrop Preview */}
                <div className="w-28 sm:w-36 h-16 rounded-xl bg-[#181A21] overflow-hidden shrink-0 border border-[#262932] shadow-inner relative">
                  <img src={item.backdropUrl || item.posterUrl} alt={item.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute bottom-1 left-1.5 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-black/70 text-white">
                    {item.contentType}
                  </span>
                </div>

                {/* Metadata */}
                <div className="min-w-0 space-y-1">
                  <h3 className="text-sm font-bold text-white truncate max-w-sm">{item.title}</h3>
                  <p className="text-[11px] text-[#70737C]">
                    Genre: <span className="text-[#A6A8B0]">{item.category}</span> • Added: {item.startedAt}
                  </p>
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-[#262932]">
                {/* Active / Paused Switch */}
                <button
                  type="button"
                  onClick={() => handleToggle(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    item.isActive
                      ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30 hover:bg-[#10B981]/25"
                      : "bg-[#70737C]/15 text-[#A6A8B0] border-[#70737C]/30 hover:text-white"
                  }`}
                  title="Toggle homepage hero visibility"
                >
                  {item.isActive ? "● Active in Carousel" : "○ Paused"}
                </button>

                {/* Move Up / Move Down Ordering Buttons */}
                <div className="flex items-center gap-1 bg-[#181A21] border border-[#262932] rounded-xl p-0.5">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => handleMove(item.id, "up")}
                    className="p-1.5 rounded-lg text-[#70737C] hover:text-white hover:bg-[#111318] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Move earlier in slide rotation"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === filteredItems.length - 1}
                    onClick={() => handleMove(item.id, "down")}
                    className="p-1.5 rounded-lg text-[#70737C] hover:text-white hover:bg-[#111318] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Move later in slide rotation"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Remove from Carousel Button */}
                <button
                  type="button"
                  onClick={() => handleRemove(item.id, item.title)}
                  className="p-1.5 rounded-xl text-[#70737C] hover:text-[#DC2626] hover:bg-[#DC2626]/10 border border-transparent hover:border-[#DC2626]/20 transition-colors"
                  title="Remove from Hero Carousel"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add to Hero Carousel Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-[#181A21] border border-[#262932] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#262932]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D6A84F]" />
                <h3 className="text-sm font-bold text-white">Add Title to Hero Carousel</h3>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-[#70737C] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddFeatured} className="space-y-4 text-xs">
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
                  <p className="text-[#70737C] text-center py-4">No matching titles available to feature.</p>
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
                  Add to Hero Carousel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
