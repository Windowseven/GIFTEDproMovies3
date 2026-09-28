'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Film,
  Video,
  Eye,
  Check,
  X,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  Lock,
} from 'lucide-react';
import { mediaTeamRepository } from '@/lib/repositories/mediaTeamRepository';
import { adminRepository } from '@/lib/repositories/adminRepository';
import { useAuth } from '@/context/AuthContext';
import { MediaContentItem, MediaContentStatus } from '@/types/mediaTeam';
import { ContentCompletenessBadge } from '@/components/media-team/ContentCompletenessBadge';

export default function MediaTeamReviewPage() {
  const { role } = useAuth();
  const [publishingRequiresApproval, setPublishingRequiresApproval] = useState(true);
  const [movies, setMovies] = useState<MediaContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY_FOR_REVIEW' | 'DRAFT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    adminRepository.isPublishingApprovalRequired().then(required => {
      setPublishingRequiresApproval(required);
    });
  }, []);

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
  }, []);

  const filteredMovies = useMemo(() => {
    return movies.filter(m => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.codeId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'READY_FOR_REVIEW' && m.status === 'READY_FOR_REVIEW') ||
        (statusFilter === 'DRAFT' && m.status === 'DRAFT');

      return matchesSearch && matchesStatus;
    });
  }, [movies, searchQuery, statusFilter]);

  const handleApproveAndPublish = async (movie: MediaContentItem) => {
    try {
      const updated = await mediaTeamRepository.updateMovie(movie.id, { status: 'PUBLISHED' });
      setMovies(prev => prev.map(m => (m.id === movie.id ? updated : m)));
      showToast(`Title "${movie.title}" successfully approved and published!`);
    } catch {
      showToast('Error publishing title.');
    }
  };

  const handleSubmitForReview = async (movie: MediaContentItem) => {
    try {
      const updated = await mediaTeamRepository.updateMovie(movie.id, { status: 'READY_FOR_REVIEW' });
      setMovies(prev => prev.map(m => (m.id === movie.id ? updated : m)));
      showToast(`Title "${movie.title}" submitted to editorial review queue.`);
    } catch {
      showToast('Error submitting for review.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-[#181A21] border border-emerald-500/40 text-white px-4 py-3 rounded-xl shadow-2xl text-xs backdrop-blur-md animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#111318] via-[#181A21] to-[#111318] p-6 rounded-2xl border border-[#262932] shadow-xl">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 uppercase">
            Publishing Gate
          </span>
          {publishingRequiresApproval ? (
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/25 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Admin Approval Required
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Direct Publishing Authorized
            </span>
          )}
        </div>
        <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
          Review & Readiness Queue
        </h1>
        <p className="text-[#A6A8B0] text-xs mt-1 max-w-2xl font-sans">
          Verify content quality checklist, poster aspect ratios, DJ audio editions, and media availability before publishing to live customer catalog.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#111318] border border-[#262932] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#70737C] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search queue..."
            className="w-full bg-[#181A21] border border-[#262932] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              statusFilter === 'ALL'
                ? 'bg-purple-600/20 text-purple-400 border-purple-500/40'
                : 'bg-[#181A21] text-[#70737C] border-[#262932]'
            }`}
          >
            All ({movies.length})
          </button>
          <button
            onClick={() => setStatusFilter('READY_FOR_REVIEW')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              statusFilter === 'READY_FOR_REVIEW'
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40'
                : 'bg-[#181A21] text-[#70737C] border-[#262932]'
            }`}
          >
            Ready for Review ({movies.filter(m => m.status === 'READY_FOR_REVIEW').length})
          </button>
          <button
            onClick={() => setStatusFilter('DRAFT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              statusFilter === 'DRAFT'
                ? 'bg-amber-600/20 text-amber-400 border-amber-500/40'
                : 'bg-[#181A21] text-[#70737C] border-[#262932]'
            }`}
          >
            Drafts ({movies.filter(m => m.status === 'DRAFT').length})
          </button>
        </div>
      </div>

      {/* Review Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center font-mono text-xs text-[#70737C]">
            Loading review queue...
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="bg-[#111318] border border-[#262932] rounded-2xl p-12 text-center text-[#70737C] font-mono text-xs">
            No items pending review in this view.
          </div>
        ) : (
          filteredMovies.map(movie => (
            <div
              key={movie.id}
              className="bg-[#111318] border border-[#262932] hover:border-[#323642] rounded-2xl p-5 space-y-4 transition-all shadow-md"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-20 rounded-xl bg-[#181A21] border border-[#262932] overflow-hidden shrink-0 flex items-center justify-center">
                    {movie.posterUrl ? (
                      <img src={movie.posterUrl || "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80"} alt={movie.title} onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80"; }} className="w-full h-full object-cover" />
                    ) : (
                      <Film className="w-6 h-6 text-gray-600" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[#70737C]">{movie.codeId}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          movie.status === 'PUBLISHED'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : movie.status === 'READY_FOR_REVIEW'
                            ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {movie.status}
                      </span>
                    </div>

                    <h2 className="text-base font-bold text-white mt-1">{movie.title}</h2>
                    <p className="text-xs text-[#A6A8B0] font-mono mt-0.5">
                      {movie.originalTitle} ({movie.releaseYear}) • {movie.categoryNames.join(', ')} • {movie.countryNames.join(', ')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:items-end gap-2 shrink-0">
                  <ContentCompletenessBadge
                    percent={movie.completenessPercent}
                    showDetails={false}
                    checklist={movie.checklist}
                  />
                  <div className="text-[11px] font-mono text-gray-400">
                    Stream: <strong className={movie.streamingStatus === 'ready' ? 'text-emerald-400' : 'text-amber-400'}>{movie.streamingStatus.toUpperCase()}</strong>
                    {' '}| Download: <strong className={movie.downloadStatus === 'ready' ? 'text-emerald-400' : 'text-[#70737C]'}>{movie.downloadStatus.toUpperCase()}</strong>
                  </div>
                </div>
              </div>

              {/* Checklist Breakdown */}
              <div className="bg-[#181A21] rounded-xl p-3 border border-[#262932] grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                <div className="flex items-center gap-1.5">
                  {movie.checklist.basicInfo ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-400" />}
                  <span className="text-gray-300">Basic Info</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {movie.checklist.poster ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-400" />}
                  <span className="text-gray-300">Poster Artwork</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {movie.checklist.djAssigned ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-400" />}
                  <span className="text-gray-300">DJ Edition</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {movie.checklist.streamingMedia ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-400" />}
                  <span className="text-gray-300">Streaming Video</span>
                </div>
              </div>

              {/* Review Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-[#262932]">
                <Link
                  href={`/media-team/movies/${movie.id}/edit`}
                  className="text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <span>Edit in Catalog</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>

                <div className="flex items-center gap-2">
                  {movie.status !== 'READY_FOR_REVIEW' && movie.status !== 'PUBLISHED' && (
                    <button
                      onClick={() => handleSubmitForReview(movie)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shadow-sm"
                    >
                      Submit for Review
                    </button>
                  )}
                  {movie.status !== 'PUBLISHED' && (
                    publishingRequiresApproval && role !== 'ADMIN' ? (
                      <span
                        title="Platform policy requires Admin review before publishing live."
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181A21] border border-amber-500/30 text-amber-400 text-xs font-medium cursor-not-allowed select-none"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Awaiting Admin Approval</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleApproveAndPublish(movie)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve & Publish Live</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
