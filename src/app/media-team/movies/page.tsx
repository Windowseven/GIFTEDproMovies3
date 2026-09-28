'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Film,
  Plus,
  Search,
  SlidersHorizontal,
  Edit3,
  Trash2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Mic,
  ArrowUpDown,
  Sparkles,
  Layers,
  X,
  Play,
  Download,
  Lock,
} from 'lucide-react';
import { mediaTeamRepository } from '@/lib/repositories/mediaTeamRepository';
import { adminRepository } from '@/lib/repositories/adminRepository';
import { useAuth } from '@/context/AuthContext';
import { MediaContentItem, MediaContentStatus } from '@/types/mediaTeam';
import { ContentCompletenessBadge } from '@/components/media-team/ContentCompletenessBadge';
import {
  mockAvailableCategories,
  mockAvailableDjs,
} from '@/data/mock/mediaTeamData';

export default function MediaTeamMoviesPage() {
  const [movies, setMovies] = useState<MediaContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [djFilter, setDjFilter] = useState('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { role } = useAuth();
  const [publishingRequiresApproval, setPublishingRequiresApproval] = useState(true);

  // Preview Drawer
  const [previewMovie, setPreviewMovie] = useState<MediaContentItem | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadMovies = async () => {
    try {
      const data = await mediaTeamRepository.getMovies();
      setMovies(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovies();
    adminRepository.isPublishingApprovalRequired().then(setPublishingRequiresApproval);
  }, []);

  const filteredMovies = useMemo(() => {
    return movies.filter(m => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.originalTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.codeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.versions.some(v => v.djName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      const matchesCategory =
        categoryFilter === 'all' ||
        m.categoryNames.some(c => c.toLowerCase() === categoryFilter.toLowerCase());
      const matchesDj =
        djFilter === 'all' ||
        m.versions.some(v => v.djName.toLowerCase().includes(djFilter.toLowerCase()));

      return matchesSearch && matchesStatus && matchesCategory && matchesDj;
    });
  }, [movies, searchQuery, statusFilter, categoryFilter, djFilter]);

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to remove movie "${title}" from the studio catalog?`)) {
      try {
        await mediaTeamRepository.deleteMovie(id);
        setMovies(prev => prev.filter(m => m.id !== id));
        showToast(`Movie "${title}" removed from catalog.`);
      } catch {
        showToast('Error removing movie.');
      }
    }
  };

  const handleToggleStatus = async (movie: MediaContentItem) => {
    if (publishingRequiresApproval && role !== 'ADMIN') {
      if (movie.status === 'DRAFT') {
        const updated = await mediaTeamRepository.updateMovie(movie.id, { status: 'READY_FOR_REVIEW' });
        setMovies(prev => prev.map(m => (m.id === movie.id ? updated : m)));
        showToast(`"${movie.title}" submitted to Admin for release approval.`);
      } else if (movie.status === 'READY_FOR_REVIEW') {
        showToast(`"${movie.title}" is awaiting Admin authorization.`);
      } else {
        showToast('Only Platform Administrators can alter published live titles.');
      }
      return;
    }

    const nextStatus: MediaContentStatus = movie.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      const updated = await mediaTeamRepository.updateMovie(movie.id, { status: nextStatus });
      setMovies(prev => prev.map(m => (m.id === movie.id ? updated : m)));
      showToast(`Status of "${movie.title}" updated to ${nextStatus}.`);
    } catch {
      showToast('Error updating status.');
    }
  };

  const getReadinessBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <span className="text-emerald-400 font-semibold">Ready</span>;
      case 'processing':
        return <span className="text-amber-400 font-semibold">Processing</span>;
      case 'needs_attention':
        return <span className="text-amber-400 font-semibold">Needs Attention</span>;
      default:
        return <span className="text-[#70737C]">Not Available</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 bg-[#181A21] border border-emerald-500/40 text-white px-5 py-3.5 rounded-xl shadow-2xl backdrop-blur-md animate-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm font-medium">{toastMessage}</p>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#111318] via-[#181A21] to-[#111318] p-6 rounded-2xl border border-[#262932] relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#181A21] text-[#A6A8B0] border border-[#262932] uppercase">
              Media Library
            </span>
            <span className="text-xs text-gray-400 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {movies.length} Movies Registered
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
            Movie Library
          </h1>
          <p className="text-gray-400 text-xs mt-1 max-w-2xl font-sans">
            Manage movie titles, visual artwork, translating DJ voice artists, online streaming, and direct download links.
          </p>
        </div>

        <Link
          href="/media-team/movies/new"
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#B11226] hover:bg-[#8F0D1E] text-white font-semibold text-xs transition-all shadow-md shadow-[#B11226]/20 border border-[#B11226]/40 shrink-0 active:scale-98"
        >
          <Plus className="w-4 h-4 text-white" />
          Add New Movie
        </Link>
      </div>

      {/* Controls Bar (Search & Multi-Filters) */}
      <div className="bg-[#111318] border border-[#262932] rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full lg:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search movie title, original title, or ID..."
            className="w-full bg-[#181A21] border border-[#262932] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-white/30 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-mono"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Status filter */}
          <div className="flex items-center gap-1.5 bg-[#181A21] border border-[#262932] rounded-xl px-3 py-1.5 text-xs text-gray-400">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="font-mono">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent text-white focus:outline-none text-xs font-medium cursor-pointer"
            >
              <option value="all" className="bg-[#181A21]">All Statuses</option>
              <option value="PUBLISHED" className="bg-[#181A21]">Published (Live)</option>
              <option value="DRAFT" className="bg-[#181A21]">Draft</option>
              <option value="READY_FOR_REVIEW" className="bg-[#181A21]">Ready for Review</option>
              <option value="ARCHIVED" className="bg-[#181A21]">Archived</option>
            </select>
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-1.5 bg-[#181A21] border border-[#262932] rounded-xl px-3 py-1.5 text-xs text-gray-400">
            <span className="font-mono">Category:</span>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-transparent text-white focus:outline-none text-xs font-medium cursor-pointer"
            >
              <option value="all" className="bg-[#181A21]">All Categories</option>
              {mockAvailableCategories.map(cat => (
                <option key={cat} value={cat} className="bg-[#181A21]">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* DJ Voice filter */}
          <div className="flex items-center gap-1.5 bg-[#181A21] border border-[#262932] rounded-xl px-3 py-1.5 text-xs text-gray-400">
            <span className="font-mono">DJ:</span>
            <select
              value={djFilter}
              onChange={e => setDjFilter(e.target.value)}
              className="bg-transparent text-white focus:outline-none text-xs font-medium cursor-pointer"
            >
              <option value="all" className="bg-[#181A21]">All DJs</option>
              {mockAvailableDjs.map(dj => (
                <option key={dj.id} value={dj.name} className="bg-[#181A21]">
                  {dj.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs font-mono text-[#70737C] ml-auto">
            Results: <span className="text-white font-bold">{filteredMovies.length}</span>
          </div>
        </div>
      </div>

      {/* Movies Table */}
      <div className="bg-[#111318] border border-[#262932] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-[#181A21] border-b border-[#262932] text-xs font-mono text-[#70737C] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Movie / Identification</th>
                <th className="py-3.5 px-4">Categories & Country</th>
                <th className="py-3.5 px-4">DJ Editions</th>
                <th className="py-3.5 px-4">Media Readiness</th>
                <th className="py-3.5 px-4">Completeness</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262932]/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#70737C] font-mono text-xs">
                    Loading movie library...
                  </td>
                </tr>
              ) : filteredMovies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#70737C] font-mono text-xs">
                    No movies match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredMovies.map(movie => (
                  <tr key={movie.id} className="hover:bg-[#181A21]/40 transition-colors group">
                    {/* Title & Info */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-16 rounded-lg bg-[#181A21] border border-[#262932] overflow-hidden shrink-0 flex items-center justify-center">
                          {movie.posterUrl ? (
                            <img
                              src={movie.posterUrl || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80"}
                              alt={movie.title}
                              onError={(e) => {
                                e.currentTarget.src = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80";
                              }}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Film className="w-5 h-5 text-gray-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4
                              onClick={() => setPreviewMovie(movie)}
                              className="text-white font-bold hover:text-white/80 cursor-pointer transition-colors truncate text-sm"
                            >
                              {movie.title}
                            </h4>
                            <span className="font-mono text-[10px] text-[#70737C] shrink-0">
                              {movie.codeId}
                            </span>
                          </div>
                          <p className="text-xs text-[#A6A8B0] font-mono mt-0.5 truncate">
                            {movie.originalTitle} ({movie.releaseYear}) • {movie.durationMinutes} min
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Classification */}
                    <td className="py-4 px-4 font-mono text-xs">
                      <div className="flex flex-wrap gap-1">
                        {movie.categoryNames.map((c, i) => (
                          <span
                            key={i}
                            className="bg-[#181A21] border border-[#262932] px-2 py-0.5 rounded text-[#A6A8B0] text-[10px]"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-[#70737C] mt-1">
                        {movie.countryNames.join(', ')}
                      </p>
                    </td>

                    {/* DJ Versions */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1">
                        {movie.versions.map((ver, i) => (
                          <div
                            key={i}
                            className="inline-flex items-center gap-1.5 text-xs font-mono"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                ver.readinessStatus === 'ready' ? 'bg-emerald-400' : 'bg-amber-400'
                              }`}
                            />
                            <span className="text-gray-200">{ver.djName}</span>
                            {ver.versionLabel && (
                              <span className="text-[#70737C] text-[10px]">
                                ({ver.versionLabel})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Media Readiness (Stream / Download) */}
                    <td className="py-4 px-4 text-xs font-mono">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Play className="w-3 h-3 text-white/70" />
                          <span>Stream:</span>
                          {getReadinessBadge(movie.streamingStatus)}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Download className="w-3 h-3 text-emerald-400" />
                          <span>Download:</span>
                          {getReadinessBadge(movie.downloadStatus)}
                        </div>
                      </div>
                    </td>

                    {/* Content Completeness */}
                    <td className="py-4 px-4 w-44">
                      <ContentCompletenessBadge
                        percent={movie.completenessPercent}
                        showDetails={false}
                        checklist={movie.checklist}
                      />
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(movie)}
                        title={
                          movie.status === 'READY_FOR_REVIEW'
                            ? 'Awaiting Admin Approval to go Live'
                            : movie.status === 'PUBLISHED'
                            ? 'Live Catalog Title'
                            : 'Draft - Click to submit for review'
                        }
                        className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold border transition-all ${
                          movie.status === 'PUBLISHED'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                            : movie.status === 'READY_FOR_REVIEW'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
                            : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/25'
                        }`}
                      >
                        {movie.status === 'PUBLISHED'
                          ? '● LIVE'
                          : movie.status === 'READY_FOR_REVIEW'
                          ? '⏳ PENDING APPROVAL'
                          : '○ DRAFT'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewMovie(movie)}
                          title="Preview movie details"
                          className="p-2 rounded-lg bg-[#181A21] text-[#A6A8B0] hover:text-white border border-[#262932] transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/media-team/movies/${movie.id}/edit`}
                          title="Edit movie metadata & assets"
                          className="p-2 rounded-lg bg-[#181A21] text-[#A6A8B0] hover:text-[#D6A84F] border border-[#262932] transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(movie.id, movie.title)}
                          title="Delete movie"
                          className="p-2 rounded-lg bg-[#181A21] text-[#A6A8B0] hover:text-rose-400 border border-[#262932] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Movie Details Preview Drawer */}
      {previewMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111318] border border-[#262932] rounded-2xl w-full max-w-xl shadow-2xl p-6 relative">
            <button
              onClick={() => setPreviewMovie(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-20 h-28 rounded-xl bg-[#181A21] border border-[#262932] overflow-hidden flex items-center justify-center shrink-0">
                {previewMovie.posterUrl ? (
                  <img
                    src={previewMovie.posterUrl}
                    alt={previewMovie.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Film className="w-8 h-8 text-white/70" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  {previewMovie.status}
                </span>
                <h3 className="text-xl font-bold text-white mt-1 truncate">{previewMovie.title}</h3>
                <p className="text-xs text-gray-400 font-mono">
                  {previewMovie.originalTitle} ({previewMovie.releaseYear}) • {previewMovie.durationMinutes} min
                </p>
                <p className="text-xs text-gray-300 mt-2 font-sans line-clamp-3">
                  {previewMovie.description}
                </p>
              </div>
            </div>

            {/* Checklist */}
            <div className="my-5 bg-[#181A21] p-4 rounded-xl border border-[#262932] space-y-3">
              <span className="text-xs font-mono text-gray-400 uppercase tracking-wider block">
                Catalog Readiness Checklist:
              </span>
              <ContentCompletenessBadge
                percent={previewMovie.completenessPercent}
                showDetails={true}
                checklist={previewMovie.checklist}
              />
            </div>

            {/* Versions */}
            <div className="space-y-2 text-xs font-mono">
              <span className="text-[#A6A8B0] block uppercase tracking-wider text-[11px]">
                DJ Voiceover Editions:
              </span>
              {previewMovie.versions.map((v, i) => (
                <div
                  key={i}
                  className="bg-[#181A21] p-2.5 rounded-lg border border-[#262932] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Mic className="w-3.5 h-3.5 text-[#D6A84F]" />
                    <span className="text-white font-bold">{v.djName}</span>
                    {v.versionLabel && (
                      <span className="text-[#70737C] text-[10px]">({v.versionLabel})</span>
                    )}
                  </div>
                  <div className="text-gray-400 text-[11px] flex items-center gap-2">
                    <span>Stream: {v.streamingStatus}</span>
                    <span>•</span>
                    <span>Download: {v.downloadStatus}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Link
                href={`/media-team/movies/${previewMovie.id}/edit`}
                className="px-4 py-2 rounded-xl bg-[#B11226] hover:bg-[#8F0D1E] text-white font-semibold text-xs transition-colors shadow-md shadow-[#B11226]/20 border border-[#B11226]/40"
              >
                Open Full Editor
              </Link>
              <button
                onClick={() => setPreviewMovie(null)}
                className="px-4 py-2 rounded-xl bg-[#181A21] border border-[#262932] hover:bg-[#20232D] text-gray-300 hover:text-white text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
