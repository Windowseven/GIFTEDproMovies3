'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Tv,
  Layers,
  Play,
  Download,
  Clock,
  Mic,
  Plus,
  CheckCircle2,
  DollarSign,
  Edit2,
  AlertCircle,
  Tag,
  Check,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { AdminSeries, AdminSeason, AdminEpisode } from '@/types/admin';
import { adminRepository } from '@/lib/repositories/adminRepository';

interface SeriesEpisodeDrawerProps {
  series: AdminSeries | null;
  isOpen: boolean;
  onClose: () => void;
  onSeriesUpdated: (updated: AdminSeries) => void;
}

export const SeriesEpisodeDrawer: React.FC<SeriesEpisodeDrawerProps> = ({
  series,
  isOpen,
  onClose,
  onSeriesUpdated,
}) => {
  const [activeSeasonNum, setActiveSeasonNum] = useState<number>(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit episode price modal state
  const [editingEpisode, setEditingEpisode] = useState<AdminEpisode | null>(null);
  const [editStreamPrice, setEditStreamPrice] = useState<number>(500);
  const [editDownloadPrice, setEditDownloadPrice] = useState<number>(1000);

  // Add episode modal state
  const [isAddEpOpen, setIsAddEpOpen] = useState(false);
  const [newEpTitle, setNewEpTitle] = useState('');
  const [newEpDuration, setNewEpDuration] = useState<number>(55);
  const [newEpStreamPrice, setNewEpStreamPrice] = useState<number>(500);
  const [newEpDownloadPrice, setNewEpDownloadPrice] = useState<number>(1000);
  const [newEpDescription, setNewEpDescription] = useState('');

  // Edit season pass price modal state
  const [isEditingSeasonPass, setIsEditingSeasonPass] = useState(false);
  const [newSeasonPassPrice, setNewSeasonPassPrice] = useState<number>(3500);

  useEffect(() => {
    if (series?.seasons && series.seasons.length > 0) {
      setActiveSeasonNum(series.seasons[0].seasonNumber);
    }
  }, [series]);

  if (!isOpen || !series) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const currentSeason = series.seasons?.find(s => s.seasonNumber === activeSeasonNum) || series.seasons?.[0];
  const episodes = currentSeason?.episodes || [];

  const handleToggleEpisode = async (episode: AdminEpisode) => {
    try {
      const updated = await adminRepository.toggleEpisodeStatus(
        series.id,
        currentSeason?.seasonNumber || 1,
        episode.id
      );
      onSeriesUpdated(updated);
      const nextStatus = episode.status === 'published' ? 'draft' : 'published';
      showToast(`Episode ${episode.episodeNumber} is now ${nextStatus.toUpperCase()}`);
    } catch {
      showToast('Failed to update episode status');
    }
  };

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEpisode || !currentSeason) return;

    try {
      const updated = await adminRepository.updateEpisodePrice(
        series.id,
        currentSeason.seasonNumber,
        editingEpisode.id,
        editStreamPrice,
        editDownloadPrice
      );
      onSeriesUpdated(updated);
      setEditingEpisode(null);
      showToast(`Pricing updated for Episode ${editingEpisode.episodeNumber}`);
    } catch {
      showToast('Failed to update episode pricing');
    }
  };

  const handleAddEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEpTitle.trim() || !currentSeason) return;

    const nextEpNum = episodes.length > 0 ? Math.max(...episodes.map(ep => ep.episodeNumber)) + 1 : 1;

    try {
      const updated = await adminRepository.addEpisodeToSeason(
        series.id,
        currentSeason.seasonNumber,
        {
          episodeNumber: nextEpNum,
          title: newEpTitle.trim(),
          durationMinutes: newEpDuration,
          description: newEpDescription.trim() || `Official Swahili voiceover release of Episode ${nextEpNum}.`,
          streamingStatus: 'streaming_ready',
          downloadStatus: 'download_ready',
          streamPriceTsh: newEpStreamPrice,
          downloadPriceTsh: newEpDownloadPrice,
          status: 'published',
          viewsCount: 0,
        }
      );
      onSeriesUpdated(updated);
      setIsAddEpOpen(false);
      setNewEpTitle('');
      setNewEpDescription('');
      showToast(`Episode ${nextEpNum} added successfully to ${currentSeason.title}`);
    } catch {
      showToast('Failed to add episode');
    }
  };

  const handleSaveSeasonPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSeason) return;

    try {
      const updated = await adminRepository.updateSeasonPassPrice(
        series.id,
        currentSeason.seasonNumber,
        newSeasonPassPrice
      );
      onSeriesUpdated(updated);
      setIsEditingSeasonPass(false);
      showToast(`Season Pass price updated to TZS ${newSeasonPassPrice.toLocaleString()}`);
    } catch {
      showToast('Failed to update season pass price');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* Slide-out Drawer */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10">
        <div className="w-screen max-w-2xl bg-[#111318] border-l border-[#262932] shadow-2xl flex flex-col justify-between overflow-hidden">
          
          {/* Header Banner */}
          <div className="relative border-b border-[#262932] bg-[#181A21] overflow-hidden">
            {/* Background art if available */}
            {series.backdropUrl && (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-15"
                style={{ backgroundImage: `url(${series.backdropUrl})` }}
              />
            )}
            <div className="relative z-10 p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-16 rounded-lg bg-[#08090C] overflow-hidden border border-[#262932] shrink-0">
                    <img src={series.posterUrl} alt={series.title} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#B11226]/20 text-[#B11226] border border-[#B11226]/30 uppercase">
                        Series Architecture
                      </span>
                      <span className="text-[11px] font-mono text-[#A6A8B0]">
                        {series.releaseYear} • {series.seasonsCount} Season{series.seasonsCount > 1 ? 's' : ''}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5 truncate">
                      {series.title}
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-[#70737C] hover:text-white hover:bg-[#111318] transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Lead DJ & Series Policy Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* Single Lead DJ Badge */}
                <div className="p-3 rounded-xl bg-[#111318]/90 border border-[#262932] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-[#70737C]">Lead Voiceover DJ</p>
                    <p className="text-xs font-bold text-white truncate">
                      {series.leadDjName || 'DJ Afro Amigo'}
                    </p>
                    <span className="text-[9px] text-blue-400/80 font-mono">Applies to all episodes in series</span>
                  </div>
                </div>

                {/* Commercial Pricing Tier */}
                <div className="p-3 rounded-xl bg-[#111318]/90 border border-[#262932] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-[#70737C]">Default PPV Pricing</p>
                    <p className="text-xs font-mono font-bold text-emerald-400">
                      TZS {series.defaultEpisodeStreamPriceTsh || 500} <span className="text-[#70737C] font-normal text-[10px]">Stream</span> • TZS {series.defaultEpisodeDownloadPriceTsh || 1000} <span className="text-[#70737C] font-normal text-[10px]">DL</span>
                    </p>
                    <span className="text-[9px] text-[#A6A8B0] font-mono">Individual pricing customizable below</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Season Switcher Tabs */}
            <div className="px-5 sm:px-6 flex items-center gap-2 overflow-x-auto border-t border-[#262932]/70 bg-[#111318]/60 pt-2 pb-0">
              {(series.seasons || []).map((season) => (
                <button
                  key={season.id}
                  type="button"
                  onClick={() => setActiveSeasonNum(season.seasonNumber)}
                  className={`px-4 py-2.5 border-b-2 text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                    activeSeasonNum === season.seasonNumber
                      ? 'border-[#B11226] text-white bg-[#181A21]/80 rounded-t-lg'
                      : 'border-transparent text-[#70737C] hover:text-[#A6A8B0]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-[#B11226]" />
                  <span>{season.title}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#111318] border border-[#262932] text-[#A6A8B0]">
                    {season.episodes.length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Scrollable Episodes Section */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 scrollbar-thin">
            {/* Season Subheader with Pass Pricing & Add Button */}
            {currentSeason && (
              <div className="p-3.5 rounded-xl bg-[#181A21] border border-[#262932] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">Full Season Pass:</span>
                      <span className="text-xs font-mono font-black text-emerald-400">
                        TZS {currentSeason.seasonPassPriceTsh.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewSeasonPassPrice(currentSeason.seasonPassPriceTsh);
                          setIsEditingSeasonPass(true);
                        }}
                        className="text-[#70737C] hover:text-white text-[11px] underline ml-1"
                      >
                        Edit
                      </button>
                    </div>
                    <p className="text-[10px] text-[#A6A8B0] font-mono">
                      Packaged access to all {episodes.length} episodes in {currentSeason.title}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setNewEpStreamPrice(series.defaultEpisodeStreamPriceTsh || 500);
                    setNewEpDownloadPrice(series.defaultEpisodeDownloadPriceTsh || 1000);
                    setIsAddEpOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#B11226] hover:bg-[#8F0D1E] text-white font-semibold text-xs transition-all shadow-md shadow-[#B11226]/20 flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Episode</span>
                </button>
              </div>
            )}

            {/* Episodes List */}
            <div className="space-y-2.5">
              {episodes.length === 0 ? (
                <div className="p-8 text-center bg-[#181A21] border border-[#262932] rounded-xl space-y-2">
                  <Tv className="w-8 h-8 text-[#70737C] mx-auto" />
                  <p className="text-sm font-semibold text-white">No episodes configured in this season</p>
                  <p className="text-xs text-[#70737C]">Click "Add Episode" above to register the first episode.</p>
                </div>
              ) : (
                episodes.map((ep) => (
                  <div
                    key={ep.id}
                    className="p-3.5 rounded-xl bg-[#181A21] border border-[#262932] hover:border-[#70737C]/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {/* Episode Identification */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[#111318] border border-[#262932] flex items-center justify-center font-mono font-black text-xs text-white shrink-0">
                        {ep.episodeNumber < 10 ? `E0${ep.episodeNumber}` : `E${ep.episodeNumber}`}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                            {ep.title}
                          </h4>
                          <span className="text-[11px] font-mono text-[#70737C] flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3" />
                            {ep.durationMinutes}m
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {/* Single Lead DJ Confirmation */}
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                            <Mic className="w-2.5 h-2.5" />
                            {series.leadDjName || 'DJ Afro Amigo'}
                          </span>

                          {/* Media Readiness */}
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Stream Ready
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            DL Ready
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pricing & Publication Controls */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#262932]">
                      {/* Individual Episode Price Badge & Trigger */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEpisode(ep);
                          setEditStreamPrice(ep.streamPriceTsh);
                          setEditDownloadPrice(ep.downloadPriceTsh);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-[#111318] border border-[#262932] hover:border-emerald-500/40 text-left transition-all"
                        title="Click to change price for this episode"
                      >
                        <p className="text-[9px] font-mono text-[#70737C] uppercase">Episode PPV</p>
                        <p className="text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                          TZS {ep.streamPriceTsh} / {ep.downloadPriceTsh}
                          <Edit2 className="w-2.5 h-2.5 text-[#70737C]" />
                        </p>
                      </button>

                      {/* 1-Click Publishing Status Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleEpisode(ep)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                          ep.status === 'published'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                            : ep.status === 'pending_review'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
                            : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/25'
                        }`}
                        title="Click to toggle live publication"
                      >
                        {ep.status === 'published'
                          ? '● LIVE'
                          : ep.status === 'pending_review'
                          ? '⏳ PENDING'
                          : '○ DRAFT'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer Bar */}
          <div className="p-4 border-t border-[#262932] bg-[#181A21] flex items-center justify-between">
            <span className="text-xs font-mono text-[#70737C]">
              {episodes.length} Episodes configured • Voiced by {series.leadDjName || 'DJ Afro Amigo'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#111318] hover:bg-[#262932] text-white text-xs font-semibold border border-[#262932] transition-colors"
            >
              Close
            </button>
          </div>

        </div>
      </div>

      {/* Modal: Edit Episode Pricing */}
      {editingEpisode && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#181A21] border border-[#262932] rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#A6A8B0]">Episode Pricing</span>
                <h3 className="text-sm font-bold text-white">
                  E{editingEpisode.episodeNumber}: {editingEpisode.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingEpisode(null)}
                className="text-[#70737C] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePrice} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#A6A8B0]">Streaming Price (TZS)</label>
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={editStreamPrice}
                  onChange={(e) => setEditStreamPrice(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#A6A8B0]">Download Price (TZS)</label>
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={editDownloadPrice}
                  onChange={(e) => setEditDownloadPrice(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEpisode(null)}
                  className="px-3 py-2 rounded-xl bg-[#111318] text-xs text-[#A6A8B0] border border-[#262932]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
                >
                  Save Episode Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Season Pass Price */}
      {isEditingSeasonPass && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#181A21] border border-[#262932] rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#A6A8B0]">Package Discount</span>
                <h3 className="text-sm font-bold text-white">
                  {currentSeason?.title} Pass
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingSeasonPass(false)}
                className="text-[#70737C] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSeasonPass} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#A6A8B0]">Full Season Pass Price (TZS)</label>
                <input
                  type="number"
                  step="500"
                  min="0"
                  value={newSeasonPassPrice}
                  onChange={(e) => setNewSeasonPassPrice(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-[#70737C] font-mono mt-1">
                  Grants full access to all episodes in this season.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingSeasonPass(false)}
                  className="px-3 py-2 rounded-xl bg-[#111318] text-xs text-[#A6A8B0] border border-[#262932]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
                >
                  Save Pass Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Episode */}
      {isAddEpOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#181A21] border border-[#262932] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#A6A8B0]">New Episode Entry</span>
                <h3 className="text-base font-bold text-white">
                  Add to {currentSeason?.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddEpOpen(false)}
                className="text-[#70737C] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEpisode} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#A6A8B0]">Episode Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter Eleven: The Final Stand"
                  value={newEpTitle}
                  onChange={(e) => setNewEpTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-xs text-white focus:outline-none focus:border-[#B11226]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#A6A8B0]">Runtime (Min)</label>
                  <input
                    type="number"
                    min="1"
                    value={newEpDuration}
                    onChange={(e) => setNewEpDuration(parseInt(e.target.value, 10) || 50)}
                    className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-xs font-mono text-white focus:outline-none focus:border-[#B11226]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#A6A8B0]">Stream (TZS)</label>
                  <input
                    type="number"
                    step="100"
                    value={newEpStreamPrice}
                    onChange={(e) => setNewEpStreamPrice(parseInt(e.target.value, 10) || 500)}
                    className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-xs font-mono text-white focus:outline-none focus:border-[#B11226]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#A6A8B0]">Download (TZS)</label>
                  <input
                    type="number"
                    step="100"
                    value={newEpDownloadPrice}
                    onChange={(e) => setNewEpDownloadPrice(parseInt(e.target.value, 10) || 1000)}
                    className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-xs font-mono text-white focus:outline-none focus:border-[#B11226]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#A6A8B0]">Voiceover Edition</label>
                <div className="p-2.5 rounded-xl bg-[#111318] border border-[#262932] text-xs text-white font-mono flex items-center gap-2">
                  <Mic className="w-3.5 h-3.5 text-blue-400" />
                  <span>{series.leadDjName || 'DJ Afro Amigo'} (Locked for Series Consistency)</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#A6A8B0]">Short Synopsis</label>
                <textarea
                  rows={2}
                  placeholder="Episode summary or key plot event..."
                  value={newEpDescription}
                  onChange={(e) => setNewEpDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-xs text-white focus:outline-none focus:border-[#B11226] resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddEpOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-[#111318] text-xs text-[#A6A8B0] border border-[#262932]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#B11226] hover:bg-[#8F0D1E] text-xs font-semibold text-white transition-colors"
                >
                  Register Episode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
