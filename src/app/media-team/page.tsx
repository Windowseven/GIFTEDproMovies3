'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Film,
  Video,
  PlusCircle,
  CheckSquare,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  UploadCloud,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Clock,
} from 'lucide-react';
import { mediaTeamRepository } from '@/lib/repositories/mediaTeamRepository';
import { adminRepository } from '@/lib/repositories/adminRepository';
import {
  MediaTeamMetrics,
  AttentionItem,
  MediaContentItem,
  SeriesContentItem,
} from '@/types/mediaTeam';
import { ContentCompletenessBadge } from '@/components/media-team/ContentCompletenessBadge';

export default function MediaTeamDashboardPage() {
  const [metrics, setMetrics] = useState<MediaTeamMetrics | null>(null);
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [recentMovies, setRecentMovies] = useState<MediaContentItem[]>([]);
  const [recentSeries, setRecentSeries] = useState<SeriesContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [publishingRequiresApproval, setPublishingRequiresApproval] = useState(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    try {
      const [m, att, movs, ser, isApprovalReq] = await Promise.all([
        mediaTeamRepository.getMetrics(),
        mediaTeamRepository.getAttentionItems(),
        mediaTeamRepository.getMovies(),
        mediaTeamRepository.getSeries(),
        adminRepository.isPublishingApprovalRequired(),
      ]);
      setMetrics(m);
      setAttentionItems(att);
      setRecentMovies(movs.slice(0, 5));
      setRecentSeries(ser.slice(0, 3));
      setPublishingRequiresApproval(isApprovalReq);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResolveAttention = async (id: string, title: string) => {
    try {
      await mediaTeamRepository.resolveAttentionItem(id);
      setAttentionItems(prev => prev.filter(item => item.id !== id));
      showToast(`Attention item for "${title}" marked as resolved.`);
    } catch {
      showToast('Error updating attention item.');
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center font-mono text-xs text-[#70737C]">
        Loading content operations workspace...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-[#181A21] border border-emerald-500/40 text-white px-4 py-3 rounded-xl shadow-2xl text-xs backdrop-blur-md animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <section className="bg-gradient-to-r from-[#111318] via-[#181A21] to-[#111318] border border-[#262932] p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
              Content Operations Studio
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#181A21] text-[#A6A8B0] border border-[#262932] uppercase font-bold">
              Media Studio
            </span>
          </div>
          <p className="text-xs text-[#A6A8B0] max-w-2xl">
            Ingest, curate, and prepare movie titles, serialized episodes, DJ vocal tracks, and visual artwork for GIFTEDproMovies.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/media-team/series/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#181A21] hover:bg-[#262932] text-white text-xs font-semibold border border-[#262932] transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-blue-400" />
            <span>New Series</span>
          </Link>

          <Link
            href="/media-team/movies/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#B11226] hover:bg-[#8F0D1E] text-white text-xs font-semibold shadow-md shadow-[#B11226]/20 border border-[#B11226]/40 transition-all active:scale-98"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>New Movie</span>
          </Link>
        </div>
      </section>

      {/* Policy Notification Banner */}
      {publishingRequiresApproval && (
        <section className="bg-gradient-to-r from-amber-500/10 via-[#181A21] to-[#111318] border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 sm:mt-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-2">
                <span>Admin Approval Policy is Active</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold">
                  Review Policy
                </span>
              </p>
              <p className="text-[11px] text-[#A6A8B0] mt-0.5">
                All newly uploaded movies and series are routed to the Admin for commercial review and will be published live once authorized.
              </p>
            </div>
          </div>
          <Link
            href="/media-team/review"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 shrink-0 self-start sm:self-center"
          >
            <span>Review Queue</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </section>
      )}

      {/* Content Overview KPIs (Strictly Content Metrics - Zero Financial Data) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Movies */}
        <div className="bg-[#111318] border border-[#262932] p-5 rounded-2xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A6A8B0]">Movie Library</span>
            <Film className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-2xl lg:text-3xl font-black text-white font-mono">
              {metrics?.totalMovies.toLocaleString()}
            </div>
            <p className="text-[11px] text-emerald-400 mt-0.5">
              {metrics?.publishedMovies.toLocaleString()} Published & Live
            </p>
          </div>
        </div>

        {/* Total Series */}
        <div className="bg-[#111318] border border-[#262932] p-5 rounded-2xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A6A8B0]">Series & Seasons</span>
            <Video className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-2xl lg:text-3xl font-black text-white font-mono">
              {metrics?.totalSeries.toLocaleString()}
            </div>
            <p className="text-[11px] text-blue-400 mt-0.5">
              {metrics?.totalEpisodes.toLocaleString()} Total Episodes
            </p>
          </div>
        </div>

        {/* Ready for Review */}
        <div className="bg-[#111318] border border-[#262932] p-5 rounded-2xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A6A8B0]">Ready for Review</span>
            <CheckSquare className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl lg:text-3xl font-black text-white font-mono">
              {metrics?.readyForReviewCount}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Completed & Awaiting Approval
            </p>
          </div>
        </div>

        {/* Needs Attention */}
        <div className="bg-[#111318] border border-[#262932] p-5 rounded-2xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A6A8B0]">Needs Attention</span>
            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <div>
            <div className="text-2xl lg:text-3xl font-black text-white font-mono text-[#F59E0B]">
              {attentionItems.length}
            </div>
            <p className="text-[11px] text-[#A6A8B0] mt-0.5">
              Missing Assets or Metadata
            </p>
          </div>
        </div>
      </section>

      {/* Quick Workspace Navigation Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/media-team/movies"
          className="bg-[#111318] hover:bg-[#181A21] border border-[#262932] hover:border-emerald-500/50 p-4 rounded-xl flex items-center gap-3.5 transition-all group shadow-sm text-left"
        >
          <div className="w-11 h-11 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Film className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
              Movie Library
            </div>
            <div className="text-xs text-[#70737C] truncate">
              Browse, search & edit movies
            </div>
          </div>
        </Link>

        <Link
          href="/media-team/series"
          className="bg-[#111318] hover:bg-[#181A21] border border-[#262932] hover:border-blue-500/50 p-4 rounded-xl flex items-center gap-3.5 transition-all group shadow-sm"
        >
          <div className="w-11 h-11 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Video className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
              Series & TV Shows
            </div>
            <div className="text-xs text-[#70737C] truncate">
              Seasons, episodes & video files
            </div>
          </div>
        </Link>

        <Link
          href="/media-team/review"
          className="bg-[#111318] hover:bg-[#181A21] border border-[#262932] hover:border-amber-500/50 p-4 rounded-xl flex items-center gap-3.5 transition-all group shadow-sm"
        >
          <div className="w-11 h-11 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
              Review Queue
            </div>
            <div className="text-xs text-[#70737C] truncate">
              Quality verification & publish gate
            </div>
          </div>
        </Link>
      </section>

      {/* Needs Attention Section */}
      {attentionItems.length > 0 && (
        <section className="bg-[#111318] border border-[#262932] rounded-2xl p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Needs Attention ({attentionItems.length})
              </h2>
            </div>
            <span className="text-[11px] text-[#A6A8B0]">
              Content blocked from publishing until resolved
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {attentionItems.map(item => (
              <div
                key={item.id}
                className="bg-[#181A21] border border-[#262932] hover:border-[#F59E0B]/40 rounded-xl p-4 flex flex-col justify-between gap-3 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {item.issueType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-[#70737C] font-mono">
                        {item.timeFormatted}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-white">
                      {item.contentTitle}
                    </h3>
                    <p className="text-[11px] text-[#A6A8B0] mt-1 leading-snug">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#262932]/60">
                  <span className="text-[10px] text-amber-300 font-medium">
                    Priority: {item.severity.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResolveAttention(item.id, item.contentTitle)}
                      className="px-2.5 py-1 rounded bg-[#262932] hover:bg-[#323642] text-white text-[10px] font-medium transition-colors"
                    >
                      Dismiss
                    </button>
                    <Link
                      href={item.actionUrl}
                      className="px-2.5 py-1 rounded bg-[#D6A84F] hover:bg-[#C49740] text-[#08090C] text-[10px] font-bold transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <span>Fix Now</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Movies Preview */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-white" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Recently Added Movies
            </h2>
          </div>
          <Link
            href="/media-team/movies"
            className="text-xs font-semibold text-[#A6A8B0] hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>View All Movies ({metrics?.totalMovies})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-[#111318] border border-[#262932] rounded-2xl overflow-hidden shadow-md">
          <div className="divide-y divide-[#262932]/60">
            {recentMovies.map(movie => (
              <div
                key={movie.id}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#181A21]/50 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-16 rounded-lg bg-[#181A21] border border-[#262932] overflow-hidden shrink-0 flex items-center justify-center">
                    {movie.posterUrl ? (
                      <img
                        src={movie.posterUrl || "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80"}
                        alt={movie.title}
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80";
                        }}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Film className="w-5 h-5 text-gray-600" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-white truncate">
                        {movie.title}
                      </h3>
                      <span className="text-[10px] text-[#70737C] font-mono">
                        ({movie.releaseYear})
                      </span>
                      {movie.status === 'READY_FOR_REVIEW' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/25 flex items-center gap-1 font-semibold">
                          <Clock className="w-3 h-3" />
                          Pending Admin Approval
                        </span>
                      )}
                      {movie.status === 'PUBLISHED' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-semibold">
                          Live
                        </span>
                      )}
                      {movie.status === 'DRAFT' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#181A21] text-[#70737C] border border-[#262932]">
                          Draft
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] text-[#A6A8B0]">
                        {movie.categoryNames.join(', ')} • {movie.countryNames.join(', ')}
                      </span>
                      <span className="text-[#323642]">•</span>
                      <span className="text-[10px] text-[#A6A8B0]">
                        {movie.versions.length} DJ Version{movie.versions.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Version badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {movie.versions.map(v => (
                        <span
                          key={v.id}
                          className="px-2 py-0.5 rounded text-[9px] font-mono bg-[#181A21] border border-[#262932] text-[#A6A8B0]"
                        >
                          {v.djName}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right readiness indicators and actions */}
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <div className="flex flex-col items-end gap-1">
                    <ContentCompletenessBadge
                      percent={movie.completenessPercent}
                      checklist={movie.checklist}
                    />
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span
                        className={
                          movie.streamingStatus === 'ready'
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }
                      >
                        Stream: {movie.streamingStatus.toUpperCase()}
                      </span>
                      <span className="text-[#323642]">|</span>
                      <span
                        className={
                          movie.downloadStatus === 'ready'
                            ? 'text-emerald-400'
                            : 'text-[#70737C]'
                        }
                      >
                        Download: {movie.downloadStatus.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/media-team/movies/${movie.id}/edit`}
                      className="px-3 py-1.5 rounded-lg bg-[#181A21] hover:bg-[#262932] text-white text-xs font-semibold border border-[#262932] transition-colors"
                    >
                      Edit Title
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Series Preview */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Recently Added Series
            </h2>
          </div>
          <Link
            href="/media-team/series"
            className="text-xs font-semibold text-blue-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>View All Series ({metrics?.totalSeries})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recentSeries.map(s => (
            <div
              key={s.id}
              className="bg-[#111318] border border-[#262932] hover:border-[#323642] rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-16 rounded-lg bg-[#181A21] border border-[#262932] overflow-hidden shrink-0 flex items-center justify-center">
                  {s.posterUrl ? (
                    <img
                      src={s.posterUrl}
                      alt={s.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Video className="w-5 h-5 text-gray-600" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase font-bold">
                      {s.seasons.length} Season{s.seasons.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-[10px] text-[#70737C] font-mono">
                      {s.totalEpisodes} Episodes
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1 truncate">
                    {s.title}
                  </h3>
                  <p className="text-[11px] text-[#A6A8B0] mt-0.5">
                    {s.categoryNames.join(', ')} • {s.countryNames.join(', ')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#262932]/60">
                <ContentCompletenessBadge
                  percent={s.completenessPercent}
                />
                <Link
                  href={`/media-team/series/${s.id}/edit`}
                  className="text-xs font-semibold text-blue-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <span>Manage</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
