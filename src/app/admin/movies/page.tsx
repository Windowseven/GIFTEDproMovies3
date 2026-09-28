'use client';

import React, { useState, useEffect, useMemo } from "react";
import {
  Film,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Crown,
  Eye,
  Edit2,
  Trash2,
  Layers,
  X,
  Check,
  Lock,
} from "lucide-react";
import { adminRepository } from "@/lib/repositories/adminRepository";
import { AdminMovie, MovieVersion, ContentPublishStatus } from "@/types/admin";

export default function AdminMoviesPage() {
  const [movies, setMovies] = useState<AdminMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [selectedMovie, setSelectedMovie] = useState<AdminMovie | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formOriginalTitle, setFormOriginalTitle] = useState("");
  const [showOriginalTitle, setShowOriginalTitle] = useState(false);
  const [formYear, setFormYear] = useState(2024);
  const [formDuration, setFormDuration] = useState(120);
  const [formGenres, setFormGenres] = useState<string[]>(["Action"]);
  const [formAgeRating, setFormAgeRating] = useState("16+");
  const [formStreamPrice, setFormStreamPrice] = useState(1500);
  const [formDownloadPrice, setFormDownloadPrice] = useState(2500);
  const [formLeadDj, setFormLeadDj] = useState("DJ Afro Amigo");
  const [formStatus, setFormStatus] = useState<ContentPublishStatus>("published");

  const [publishingRequiresApproval, setPublishingRequiresApproval] = useState(true);

  const availableGenres = ["Action", "Thriller", "Drama", "Kung-Fu & Martial Arts", "Epic & History", "Sci-Fi & Fantasy", "Comedy"];
  const availableDjs = ["DJ Afro Amigo", "DJ Murphy", "DJ Smith", "DJ Black"];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadMovies = async () => {
    try {
      const data = await adminRepository.getMovies();
      setMovies(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovies();
    adminRepository.isPublishingApprovalRequired().then(setPublishingRequiresApproval);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlStatus = params.get("status");
      if (urlStatus) {
        setStatusFilter(urlStatus);
      }
    }
  }, []);

  const pendingCount = useMemo(() => movies.filter(m => m.status === "pending_review").length, [movies]);
  const publishedCount = useMemo(() => movies.filter(m => m.status === "published").length, [movies]);
  const draftCount = useMemo(() => movies.filter(m => m.status === "draft").length, [movies]);

  const handleApproveMovie = async (movie: AdminMovie) => {
    await adminRepository.updateMovie(movie.id, { status: "published" });
    showToast(`"${movie.title}" has been approved and published live to viewers!`);
    loadMovies();
  };

  const filteredMovies = useMemo(() => {
    return movies.filter((m) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.originalTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.versions.some((v) => v.djName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === "all" || m.status === statusFilter;
      const matchesGenre =
        genreFilter === "all" || m.genres.some((g) => g.toLowerCase() === genreFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesGenre;
    });
  }, [movies, searchQuery, statusFilter, genreFilter]);

  const handleSaveMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (selectedMovie) {
      await adminRepository.updateMovie(selectedMovie.id, {
        title: formTitle,
        originalTitle: formOriginalTitle,
        releaseYear: formYear,
        durationMinutes: formDuration,
        genres: formGenres,
        ageRating: formAgeRating,
        status: formStatus,
      });
      showToast(`Updated "${formTitle}" successfully.`);
    } else {
      await adminRepository.addMovie({
        title: formTitle,
        originalTitle: formOriginalTitle || formTitle,
        slug: formTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        releaseYear: formYear,
        durationMinutes: formDuration,
        posterUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1200&auto=format&fit=crop&q=80",
        description: "New catalog addition managed by Admin.",
        genres: formGenres,
        countries: ["Tanzania"],
        ageRating: formAgeRating,
        rating: 8.5,
        streamingStatus: "streaming_ready",
        downloadStatus: "download_ready",
        status: formStatus,
        isFeatured: false,
        isTrending: false,
        versions: [
          {
            id: `v-${Date.now()}`,
            djId: "dj-1",
            djName: formLeadDj,
            streamingPriceTsh: formStreamPrice,
            downloadPriceTsh: formDownloadPrice,
            accessDurationHours: 48,
            streamingStatus: "streaming_ready",
            downloadStatus: "download_ready",
            isDefault: true,
          },
        ],
        viewsCount: 0,
        purchasesCount: 0,
        downloadsCount: 0,
        publishedAt: "Just now",
      });
      showToast(`Added "${formTitle}" to catalog.`);
    }

    setIsModalOpen(false);
    setSelectedMovie(null);
    loadMovies();
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to remove "${title}" from the catalog?`)) {
      await adminRepository.deleteMovie(id);
      showToast(`Movie "${title}" removed.`);
      loadMovies();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast */}
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
            <Film className="w-4 h-4 text-[#B11226]" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Movie Catalog Management
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#181A21] text-[#A6A8B0] border border-[#262932]">
              {movies.length} Titles
            </span>
            {publishingRequiresApproval && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/25 flex items-center gap-1 font-semibold">
                <Lock className="w-3 h-3" />
                Approval Gate Active
              </span>
            )}
          </div>
          <p className="text-xs text-[#A6A8B0]">
            Manage movie catalog titles, translating DJ voice artists, pricing, and publishing releases.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedMovie(null);
            setFormTitle("");
            setFormOriginalTitle("");
            setShowOriginalTitle(false);
            setFormYear(2024);
            setFormDuration(115);
            setFormGenres(["Action"]);
            setFormAgeRating("16+");
            setFormStreamPrice(1500);
            setFormDownloadPrice(2500);
            setFormStatus("published");
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-[#B11226] text-white font-semibold text-xs hover:bg-[#B11226]/90 transition-colors flex items-center gap-2 self-start sm:self-auto shadow-md shadow-[#B11226]/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Movie</span>
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
          All Titles ({movies.length})
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

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#70737C]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search movie by title or DJ..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-[#D6A84F]/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-[#A6A8B0] focus:outline-none focus:border-[#D6A84F]/50"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="pending_review">Pending Review</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-[#A6A8B0] focus:outline-none focus:border-[#D6A84F]/50"
          >
            <option value="all">All Genres</option>
            {availableGenres.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Movies Table */}
      <div className="p-5 rounded-2xl bg-[#111318] border border-[#262932] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#262932] text-[#70737C] font-mono text-[10px] uppercase">
                <th className="pb-3 font-semibold">Movie</th>
                <th className="pb-3 font-semibold">Versions (DJs)</th>
                <th className="pb-3 font-semibold">Media Readiness</th>
                <th className="pb-3 font-semibold">PPV Pricing</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262932]">
              {filteredMovies.map((movie) => (
                <tr key={movie.id} className="hover:bg-[#181A21]/50 transition-colors">
                  <td className="py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-14 rounded-lg bg-[#181A21] overflow-hidden shrink-0 border border-[#262932]">
                        <img src={movie.posterUrl || "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80"} alt={movie.title} onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80"; }} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 max-w-[220px]">
                        <p className="font-bold text-white truncate">{movie.title}</p>
                        <p className="text-[11px] text-[#70737C] mt-0.5">
                          {movie.releaseYear} • {movie.durationMinutes}m • {movie.genres.join(", ")}
                        </p>
                        {movie.uploadedBy ? (
                          <p className="text-[10px] text-blue-400 font-mono mt-0.5 truncate">
                            By: {movie.uploadedBy.name}
                          </p>
                        ) : (
                          <p className="text-[10px] text-[#70737C] font-mono mt-0.5">
                            By: Media Studio
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5">
                    <div className="space-y-1">
                      {movie.versions.map((v) => (
                        <span
                          key={v.id}
                          className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-[#181A21] text-[#D6A84F] border border-[#D6A84F]/20 mr-1"
                        >
                          {v.djName}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="py-3.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className={`w-1.5 h-1.5 rounded-full ${movie.streamingStatus === "streaming_ready" ? "bg-[#10B981]" : "bg-[#F59E0B]"}`} />
                        <span className="text-[#A6A8B0]">
                          {movie.streamingStatus === "streaming_ready" ? "Streaming — Ready" : "Streaming — Processing"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className={`w-1.5 h-1.5 rounded-full ${movie.downloadStatus === "download_ready" ? "bg-[#10B981]" : "bg-[#70737C]"}`} />
                        <span className="text-[#70737C]">
                          {movie.downloadStatus === "download_ready" ? "Download — Ready" : "Download — Unavailable"}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5">
                    <div className="font-mono text-white text-[11px]">
                      <div>Stream: TZS {movie.versions[0]?.streamingPriceTsh.toLocaleString() || "1,500"}</div>
                      <div className="text-[#70737C]">Download: TZS {movie.versions[0]?.downloadPriceTsh.toLocaleString() || "2,500"}</div>
                    </div>
                  </td>

                  <td className="py-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold capitalize ${
                        movie.status === "published"
                          ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
                          : movie.status === "pending_review"
                          ? "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30"
                          : "bg-[#70737C]/15 text-[#A6A8B0] border border-[#70737C]/30"
                      }`}
                    >
                      {movie.status.replace("_", " ")}
                    </span>
                  </td>

                  <td className="py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {movie.status === "pending_review" && (
                        <button
                          type="button"
                          onClick={() => handleApproveMovie(movie)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                          title="Approve & Publish Live"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve & Publish</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMovie(movie);
                          setFormTitle(movie.title);
                          setFormOriginalTitle(movie.originalTitle || "");
                          setShowOriginalTitle(Boolean(movie.originalTitle && movie.originalTitle !== movie.title));
                          setFormYear(movie.releaseYear);
                          setFormDuration(movie.durationMinutes);
                          setFormGenres(movie.genres);
                          setFormAgeRating(movie.ageRating);
                          setFormStatus(movie.status);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-[#181A21] border border-[#262932] text-[#A6A8B0] hover:text-white hover:border-[#D6A84F]/40 transition-colors"
                        title="Edit movie"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(movie.id, movie.title)}
                        className="p-1.5 rounded-lg bg-[#181A21] border border-[#262932] text-[#70737C] hover:text-[#DC2626] hover:border-[#DC2626]/40 transition-colors"
                        title="Delete movie"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Movie Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-[#181A21] border border-[#262932] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#262932]">
              <h3 className="text-sm font-bold text-white">
                {selectedMovie ? "Edit Movie Metadata" : "Add New Movie to Catalog"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#70737C] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMovie} className="space-y-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[#A6A8B0] font-medium">Movie Title *</label>
                  {!showOriginalTitle && (
                    <button
                      type="button"
                      onClick={() => setShowOriginalTitle(true)}
                      className="text-[11px] text-[#D6A84F] hover:underline flex items-center gap-1 font-medium"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add original / Hollywood title (optional)</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Extraction 2"
                  className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none focus:border-[#D6A84F]/50"
                />
              </div>

              {/* Click-to-expand Original / Hollywood Title */}
              {showOriginalTitle && (
                <div className="space-y-1 p-3 rounded-xl bg-[#111318]/60 border border-[#262932] animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="text-[#A6A8B0] font-medium">Original / Hollywood Title (Optional)</label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowOriginalTitle(false);
                        setFormOriginalTitle("");
                      }}
                      className="text-[10px] text-[#70737C] hover:text-white"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formOriginalTitle}
                    onChange={(e) => setFormOriginalTitle(e.target.value)}
                    placeholder="e.g. Extraction 2 (Cinema Title)"
                    className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none focus:border-[#D6A84F]/50"
                  />
                  <p className="text-[10px] text-[#70737C]">Original international release title.</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[#A6A8B0] font-medium">Year</label>
                  <input
                    type="number"
                    value={formYear}
                    onChange={(e) => setFormYear(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none focus:border-[#D6A84F]/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[#A6A8B0] font-medium">Duration (Mins)</label>
                  <input
                    type="number"
                    value={formDuration}
                    onChange={(e) => setFormDuration(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none focus:border-[#D6A84F]/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[#A6A8B0] font-medium">Age Rating</label>
                  <select
                    value={formAgeRating}
                    onChange={(e) => setFormAgeRating(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none focus:border-[#D6A84F]/50"
                  >
                    <option value="All">All Ages</option>
                    <option value="13+">13+</option>
                    <option value="16+">16+</option>
                    <option value="18+">18+</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[#A6A8B0] font-medium">Stream Price (TZS)</label>
                  <input
                    type="number"
                    value={formStreamPrice}
                    onChange={(e) => setFormStreamPrice(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none focus:border-[#D6A84F]/50 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[#A6A8B0] font-medium">Download Price (TZS)</label>
                  <input
                    type="number"
                    value={formDownloadPrice}
                    onChange={(e) => setFormDownloadPrice(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none focus:border-[#D6A84F]/50 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[#A6A8B0] font-medium">Publishing Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as ContentPublishStatus)}
                  className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none focus:border-[#D6A84F]/50"
                >
                  <option value="published">Published (Live to Public)</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

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
                  className="px-4 py-2 rounded-xl bg-[#B11226] text-white font-semibold hover:bg-[#B11226]/90"
                >
                  {selectedMovie ? "Save Changes" : "Create Movie"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
