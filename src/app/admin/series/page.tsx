'use client';

import React, { useState, useEffect, useMemo } from "react";
import {
  Tv,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
  Edit2,
  Trash2,
  X,
  Check,
  Lock,
  Mic,
} from "lucide-react";
import { adminRepository } from "@/lib/repositories/adminRepository";
import { AdminSeries, ContentPublishStatus } from "@/types/admin";
import { SeriesEpisodeDrawer } from "@/components/admin/SeriesEpisodeDrawer";

export default function AdminSeriesPage() {
  const [seriesList, setSeriesList] = useState<AdminSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [publishingRequiresApproval, setPublishingRequiresApproval] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<AdminSeries | null>(null);

  // Drawer State
  const [drawerSeries, setDrawerSeries] = useState<AdminSeries | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formYear, setFormYear] = useState(2024);
  const [formSeasons, setFormSeasons] = useState(1);
  const [formEpisodes, setFormEpisodes] = useState(10);
  const [formLeadDj, setFormLeadDj] = useState("DJ Afro Amigo");
  const [formStreamPrice, setFormStreamPrice] = useState(500);
  const [formDownloadPrice, setFormDownloadPrice] = useState(1000);
  const [formPricingModel, setFormPricingModel] = useState<"per_episode" | "per_season" | "full_series" | "combination">("combination");
  const [formStatus, setFormStatus] = useState<ContentPublishStatus>("published");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadSeries = async () => {
    try {
      const data = await adminRepository.getSeries();
      setSeriesList(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSeries();
    adminRepository.isPublishingApprovalRequired().then(setPublishingRequiresApproval);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlStatus = params.get("status");
      if (urlStatus) {
        setStatusFilter(urlStatus);
      }
    }
  }, []);

  const pendingCount = useMemo(() => seriesList.filter(s => s.status === "pending_review").length, [seriesList]);
  const publishedCount = useMemo(() => seriesList.filter(s => s.status === "published").length, [seriesList]);
  const draftCount = useMemo(() => seriesList.filter(s => s.status === "draft").length, [seriesList]);

  const handleApproveSeries = async (series: AdminSeries) => {
    await adminRepository.updateSeries(series.id, { status: "published" });
    showToast(`"${series.title}" has been approved and published live to viewers!`);
    loadSeries();
  };

  const filteredSeries = seriesList.filter((s) => {
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSeriesUpdated = (updated: AdminSeries) => {
    setSeriesList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setDrawerSeries(updated);
  };

  const handleDeleteSeries = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to remove series "${title}"?`)) {
      await adminRepository.deleteSeries(id);
      showToast(`Series "${title}" removed.`);
      loadSeries();
    }
  };

  const handleSaveSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    await adminRepository.addSeries({
      title: formTitle,
      slug: formTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      releaseYear: formYear,
      seasonsCount: formSeasons,
      episodesCount: formEpisodes,
      posterUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
      backdropUrl: "https://images.unsplash.com/photo-1528164344705-475426879c0d?w=1200&auto=format&fit=crop&q=80",
      genres: ["Drama", "Action"],
      countries: ["United States"],
      pricingModel: formPricingModel,
      status: formStatus,
      isFeatured: false,
      isTrending: false,
      leadDjName: formLeadDj,
      defaultEpisodeStreamPriceTsh: formStreamPrice,
      defaultEpisodeDownloadPriceTsh: formDownloadPrice,
      seasons: [
        {
          id: `seas-${Date.now()}`,
          seasonNumber: 1,
          title: "Season 1",
          seasonPassPriceTsh: formStreamPrice * Math.max(1, Math.floor(formEpisodes * 0.7)),
          episodes: Array.from({ length: formEpisodes }, (_, i) => ({
            id: `ep-${Date.now()}-${i + 1}`,
            episodeNumber: i + 1,
            title: `Episode ${i + 1}`,
            durationMinutes: 55,
            description: `Official Swahili voiceover release of Episode ${i + 1}.`,
            streamingStatus: "streaming_ready",
            downloadStatus: "download_ready",
            streamPriceTsh: formStreamPrice,
            downloadPriceTsh: formDownloadPrice,
            status: "published",
            viewsCount: 0,
          })),
        },
      ],
    });

    setIsModalOpen(false);
    loadSeries();
    showToast(`Series "${formTitle}" registered with ${formEpisodes} episodes.`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
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
          <div className="flex flex-wrap items-center gap-2">
            <Tv className="w-4 h-4 text-[#B11226]" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Series & Seasons Management
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#181A21] text-[#A6A8B0] border border-[#262932]">
              {seriesList.length} Series
            </span>
            {publishingRequiresApproval && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/25 flex items-center gap-1 font-semibold">
                <Lock className="w-3 h-3" />
                Approval Gate Active
              </span>
            )}
          </div>
          <p className="text-xs text-[#A6A8B0]">
            Manage serialized cinematic shows, episode releases, season packages, and modular pricing models.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedSeries(null);
            setFormTitle("");
            setFormYear(2024);
            setFormSeasons(1);
            setFormEpisodes(10);
            setFormPricingModel("combination");
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-[#B11226] text-white font-semibold text-xs hover:bg-[#B11226]/90 transition-colors flex items-center gap-2 shadow-md shadow-[#B11226]/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Series</span>
        </button>
      </div>

      {/* Quick Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
            statusFilter === "all"
              ? "bg-[#181A21] text-white border-white/20 shadow-sm"
              : "bg-[#111318] text-[#70737C] border-[#262932] hover:text-[#A6A8B0]"
          }`}
        >
          All Series ({seriesList.length})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("pending_review")}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all ${
            statusFilter === "pending_review"
              ? "bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10"
              : "bg-[#111318] text-[#D6A84F] border-[#262932] hover:border-amber-500/30"
          }`}
        >
          {pendingCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
          <span>Pending Approval ({pendingCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("published")}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
            statusFilter === "published"
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-sm"
              : "bg-[#111318] text-[#70737C] border-[#262932] hover:text-[#A6A8B0]"
          }`}
        >
          Published ({publishedCount})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("draft")}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
            statusFilter === "draft"
              ? "bg-[#181A21] text-white border-white/20 shadow-sm"
              : "bg-[#111318] text-[#70737C] border-[#262932] hover:text-[#A6A8B0]"
          }`}
        >
          Drafts ({draftCount})
        </button>
      </div>

      {/* Toolbar */}
      <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#70737C]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search series by title..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-[#D6A84F]/50"
          />
        </div>
      </div>

      {/* Series Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSeries.map((series) => (
          <div
            key={series.id}
            className="p-4 rounded-2xl bg-[#111318] border border-[#262932] hover:border-[#70737C]/40 transition-colors flex gap-4"
          >
            <div className="w-20 h-28 rounded-xl bg-[#181A21] overflow-hidden shrink-0 border border-[#262932]">
              <img src={series.posterUrl} alt={series.title} className="w-full h-full object-cover" />
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white truncate">{series.title}</h3>
                  <p className="text-[11px] text-[#70737C] mt-0.5">
                    {series.releaseYear} • {series.seasonsCount} Season(s) • {series.episodesCount} Episodes
                  </p>
                  {series.uploadedBy ? (
                    <p className="text-[10px] text-blue-400 font-mono mt-0.5 truncate">
                      By: {series.uploadedBy.name}
                    </p>
                  ) : (
                    <p className="text-[10px] text-[#70737C] font-mono mt-0.5">
                      By: Media Studio
                    </p>
                  )}
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold capitalize shrink-0 ${
                    series.status === "published"
                      ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
                      : series.status === "pending_review"
                      ? "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30"
                      : "bg-[#70737C]/15 text-[#A6A8B0] border border-[#70737C]/30"
                  }`}
                >
                  {series.status.replace("_", " ")}
                </span>
              </div>

              {/* Lead DJ & Pricing Row */}
              <div className="pt-2 border-t border-[#262932] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-blue-400 font-mono font-semibold">
                  <Mic className="w-3.5 h-3.5" />
                  <span>{series.leadDjName || 'DJ Afro Amigo'}</span>
                  <span className="text-[9px] text-[#70737C] font-normal">(Lead DJ)</span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-[#A6A8B0] text-[10px]">Episode: </span>
                  <span className="text-emerald-400 font-bold">TZS {series.defaultEpisodeStreamPriceTsh || 500}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#70737C]">Total Streams:</span>
                <span className="font-mono text-white">{series.totalStreams.toLocaleString()}</span>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-2 border-t border-[#262932] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDrawerSeries(series);
                    setIsDrawerOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#181A21] hover:bg-[#262932] text-white text-xs font-semibold border border-[#262932] flex items-center gap-1.5 transition-colors shadow-sm active:scale-95"
                  title="Inspect and manage seasons & episodes"
                >
                  <Layers className="w-3.5 h-3.5 text-[#B11226]" />
                  <span>Episodes ({series.episodesCount})</span>
                </button>

                <div className="flex items-center gap-2">
                  {series.status === "pending_review" && (
                    <button
                      type="button"
                      onClick={() => handleApproveSeries(series)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                      title="Approve & Publish Live"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteSeries(series.id, series.title)}
                    className="p-1.5 rounded-lg text-[#70737C] hover:text-[#DC2626] hover:bg-[#DC2626]/10 transition-colors"
                    title="Delete Series"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Series Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-[#181A21] border border-[#262932] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#262932]">
              <h3 className="text-sm font-bold text-white">Add New Series</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-[#70737C] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSeries} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[#A6A8B0] font-medium">Series Title</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Shogun"
                  className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none focus:border-[#D6A84F]/50"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[#A6A8B0] font-medium">Year</label>
                  <input
                    type="number"
                    value={formYear}
                    onChange={(e) => setFormYear(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[#A6A8B0] font-medium">Seasons</label>
                  <input
                    type="number"
                    value={formSeasons}
                    onChange={(e) => setFormSeasons(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[#A6A8B0] font-medium">Episodes</label>
                  <input
                    type="number"
                    value={formEpisodes}
                    onChange={(e) => setFormEpisodes(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[#A6A8B0] font-medium">Lead Voiceover DJ</label>
                  <select
                    value={formLeadDj}
                    onChange={(e) => setFormLeadDj(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none"
                  >
                    <option value="DJ Afro Amigo">DJ Afro Amigo</option>
                    <option value="DJ Murphy">DJ Murphy</option>
                    <option value="DJ Smith">DJ Smith</option>
                    <option value="DJ Black">DJ Black</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[#A6A8B0] font-medium">Per-Ep Stream Price</label>
                  <input
                    type="number"
                    step="100"
                    value={formStreamPrice}
                    onChange={(e) => setFormStreamPrice(parseInt(e.target.value, 10) || 500)}
                    className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[#A6A8B0] font-medium">Pricing Model</label>
                <select
                  value={formPricingModel}
                  onChange={(e) => setFormPricingModel(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none"
                >
                  <option value="combination">Combination (Per Episode & Season Bundle)</option>
                  <option value="per_episode">Per Episode Only</option>
                  <option value="per_season">Per Season Only</option>
                  <option value="full_series">Full Series Access Only</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#262932] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#111318] border border-[#262932] text-[#A6A8B0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#B11226] text-white font-semibold hover:bg-[#B11226]/90"
                >
                  Create Series
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Series Episode & Season Drawer */}
      <SeriesEpisodeDrawer
        series={drawerSeries}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSeriesUpdated={handleSeriesUpdated}
      />
    </div>
  );
}
