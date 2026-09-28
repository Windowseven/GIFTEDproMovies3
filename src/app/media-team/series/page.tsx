'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Video,
  Plus,
  Search,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Edit3,
  Trash2,
  X,
  ChevronDown,
  Clock,
  Mic,
  Play,
  Download,
} from 'lucide-react';
import { mediaTeamRepository } from '@/lib/repositories/mediaTeamRepository';
import { SeriesContentItem, SeasonItem, EpisodeItem } from '@/types/mediaTeam';
import { ContentCompletenessBadge } from '@/components/media-team/ContentCompletenessBadge';

export default function MediaTeamSeriesPage() {
  const [seriesList, setSeriesList] = useState<SeriesContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected series for episode inspector
  const [inspectSeries, setInspectSeries] = useState<SeriesContentItem | null>(null);
  const [expandedSeason, setExpandedSeason] = useState<number>(1);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadSeries = async () => {
    try {
      const data = await mediaTeamRepository.getSeries();
      setSeriesList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSeries();
  }, []);

  const filteredSeries = seriesList.filter(s => {
    const q = searchQuery.toLowerCase().trim();
    return (
      q === '' ||
      s.title.toLowerCase().includes(q) ||
      s.originalTitle.toLowerCase().includes(q) ||
      s.codeId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-[#181A21] border border-emerald-500/40 text-white px-4 py-3 rounded-xl shadow-2xl text-xs backdrop-blur-md animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#111318] via-[#181A21] to-[#111318] p-6 rounded-2xl border border-[#262932] relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
              Media Library
            </span>
            <span className="text-xs text-gray-400 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {seriesList.length} Series Titles
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
            Series & TV Shows
          </h1>
          <p className="text-gray-400 text-xs mt-1 max-w-2xl font-sans">
            Manage episodic hierarchy, season configurations, sequential episode ordering, and DJ voiceover editions.
          </p>
        </div>

        <Link
          href="/media-team/series/new"
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-lg shadow-blue-600/25 shrink-0 active:scale-98"
        >
          <Plus className="w-4 h-4" />
          Add New Series
        </Link>
      </div>

      {/* Search Bar */}
      <div className="bg-[#111318] border border-[#262932] rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search series by title or code ID..."
            className="w-full bg-[#181A21] border border-[#262932] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="text-xs font-mono text-[#70737C]">
          Total Series: <strong className="text-white">{filteredSeries.length}</strong>
        </div>
      </div>

      {/* Series Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredSeries.map(series => (
          <div
            key={series.id}
            className="bg-[#111318] border border-[#262932] rounded-2xl p-5 hover:border-[#323642] transition-all space-y-4 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="w-16 h-24 rounded-xl bg-[#181A21] border border-[#262932] overflow-hidden shrink-0 flex items-center justify-center">
                {series.posterUrl ? (
                  <img src={series.posterUrl || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80"} alt={series.title} onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80"; }} className="w-full h-full object-cover" />
                ) : (
                  <Video className="w-8 h-8 text-blue-400" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500/15 text-emerald-400 font-mono text-[9px] font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                    {series.status}
                  </span>
                  <span className="font-mono text-[10px] text-[#70737C]">{series.codeId}</span>
                </div>

                <h3 className="text-base font-bold text-white mt-1 truncate">{series.title}</h3>
                <p className="text-xs text-[#A6A8B0] font-mono">
                  {series.originalTitle} • {series.releaseYear}
                </p>

                <div className="flex items-center gap-3 mt-2 text-xs font-mono text-gray-300">
                  <span className="bg-[#181A21] px-2 py-1 rounded border border-[#262932] text-[#A6A8B0]">
                    {series.seasons.length} Season{series.seasons.length !== 1 ? 's' : ''}
                  </span>
                  <span className="bg-[#181A21] px-2 py-1 rounded border border-[#262932] text-blue-400">
                    {series.totalEpisodes} Total Episodes
                  </span>
                </div>
              </div>
            </div>

            {/* Completeness */}
            <div className="pt-2 border-t border-[#262932]">
              <ContentCompletenessBadge percent={series.completenessPercent} />
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-[#262932] text-xs font-mono">
              <span className="text-[#70737C]">Updated {series.updatedAt}</span>
              <div className="flex items-center gap-2">
                <Link
                  href={`/media-team/series/${series.id}/edit`}
                  className="px-3 py-1.5 rounded-lg bg-[#181A21] hover:bg-[#262932] text-white border border-[#262932] flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Edit Series</span>
                </Link>
                <button
                  onClick={() => setInspectSeries(series)}
                  className="px-3 py-1.5 rounded-lg bg-[#181A21] hover:bg-[#262932] text-white border border-[#262932] flex items-center gap-1 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Series Season & Episode Inspector Modal */}
      {inspectSeries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111318] border border-[#262932] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl p-6 relative">
            <button
              onClick={() => setInspectSeries(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
              Episode Operations
            </span>
            <h2 className="text-xl font-bold text-white mt-1 truncate">
              {inspectSeries.title}
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              {inspectSeries.originalTitle} • {inspectSeries.totalEpisodes} Total Episodes
            </p>

            {/* Seasons Accordion */}
            <div className="mt-5 space-y-3">
              {inspectSeries.seasons.map(season => (
                <div
                  key={season.id}
                  className="bg-[#181A21] rounded-xl border border-[#262932] overflow-hidden"
                >
                  <div
                    onClick={() =>
                      setExpandedSeason(
                        expandedSeason === season.seasonNumber ? 0 : season.seasonNumber
                      )
                    }
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-[#262932]/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-white">
                      <Layers className="w-4 h-4 text-blue-400" />
                      {season.title}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-gray-400">
                        {season.episodes.length} Episodes
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          expandedSeason === season.seasonNumber ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {expandedSeason === season.seasonNumber && (
                    <div className="p-3 pt-0 space-y-2 border-t border-[#262932]">
                      {season.episodes.map(ep => (
                        <div
                          key={ep.id}
                          className="bg-[#111318] p-3 rounded-lg border border-[#262932] flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-bold text-white flex items-center gap-2">
                              <span className="w-5 h-5 rounded bg-blue-600/20 text-blue-400 font-mono text-[10px] flex items-center justify-center">
                                {ep.episodeNumber}
                              </span>
                              {ep.title}
                            </p>
                            <p className="text-[#A6A8B0] text-[11px] mt-0.5 font-mono">
                              Duration: {ep.durationMinutes}m {ep.djName ? `• DJ: ${ep.djName}` : ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 font-mono text-[10px]">
                            <span className="text-emerald-400">Stream: {ep.streamingStatus}</span>
                            <span className="text-[#70737C]">•</span>
                            <span className="text-gray-400">Download: {ep.downloadStatus}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setInspectSeries(null)}
                className="px-5 py-2.5 rounded-xl bg-[#181A21] hover:bg-[#262932] text-white font-mono text-xs border border-[#262932]"
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
