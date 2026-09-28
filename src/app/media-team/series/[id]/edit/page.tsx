'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  UploadCloud,
  Play,
  Mic,
  Plus,
  Save,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Globe,
  FileVideo,
  Download,
  Image as ImageIcon,
  ShieldCheck,
  Lock,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { mediaTeamRepository } from '@/lib/repositories/mediaTeamRepository';
import { adminRepository } from '@/lib/repositories/adminRepository';
import { useAuth } from '@/context/AuthContext';
import {
  mockAvailableCategories,
  mockAvailableCountries,
  mockAvailableDjs,
} from '@/data/mock/mediaTeamData';
import {
  SeriesContentItem,
  SeasonItem,
  EpisodeItem,
  MediaContentStatus,
} from '@/types/mediaTeam';
import { ContentCompletenessBadge } from '@/components/media-team/ContentCompletenessBadge';

const STEPS = [
  { step: 1, label: 'Title & Info' },
  { step: 2, label: 'Visual Artwork' },
  { step: 3, label: 'Taxonomies' },
  { step: 4, label: 'Translating DJ' },
  { step: 5, label: 'Seasons & Episodes' },
  { step: 6, label: 'Review & Save' },
];

export default function MediaTeamEditSeriesPage() {
  const router = useRouter();
  const params = useParams();
  const seriesId = params?.id as string;

  const [series, setSeries] = useState<SeriesContentItem | null>(null);
  const { role } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [publishingRequiresApproval, setPublishingRequiresApproval] = useState(true);

  // Step 1: Basic Information
  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [showOriginalTitle, setShowOriginalTitle] = useState(false);
  const [releaseYear, setReleaseYear] = useState(2024);
  const [description, setDescription] = useState('');

  // Step 2: Visual Artwork
  const [posterUrl, setPosterUrl] = useState('');
  const [backdropUrl, setBackdropUrl] = useState('');
  const [trailerUrl, setTrailerUrl] = useState('');

  // Step 3: Taxonomies
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Drama']);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['United States']);

  // Step 4: Translating DJ (Lead DJ for the series)
  const [selectedDjId, setSelectedDjId] = useState<string>('dj-afro');

  // Step 5: Seasons & Episodes with Video Upload Tracking
  const [seasons, setSeasons] = useState<SeasonItem[]>([]);
  const [activeSeasonIdx, setActiveSeasonIdx] = useState<number>(0);
  const [expandedEpId, setExpandedEpId] = useState<string | null>(null);
  const [uploadedVideoNames, setUploadedVideoNames] = useState<Record<string, string>>({});
  const [uploadedDownloadNames, setUploadedDownloadNames] = useState<Record<string, string>>({});

  // Step 6: Status
  const [status, setStatus] = useState<MediaContentStatus>('DRAFT');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    adminRepository.isPublishingApprovalRequired().then(required => {
      setPublishingRequiresApproval(required);
    });

    const fetchSeries = async () => {
      try {
        const data = await mediaTeamRepository.getSeriesById(seriesId);
        if (data) {
          setSeries(data);
          setTitle(data.title);
          setOriginalTitle(data.originalTitle || '');
          if (data.originalTitle && data.originalTitle !== data.title) {
            setShowOriginalTitle(true);
          }
          setReleaseYear(data.releaseYear);
          setDescription(data.description);
          setPosterUrl(data.posterUrl || '');
          setBackdropUrl(data.backdropUrl || '');
          setTrailerUrl(data.trailerUrl || '');
          setSelectedCategories(data.categoryNames || ['Drama']);
          setSelectedCountries(data.countryNames || ['United States']);
          setSeasons(data.seasons || []);
          setStatus(data.status);

          if (data.seasons?.[0]?.episodes?.[0]) {
            setExpandedEpId(data.seasons[0].episodes[0].id);
            if (data.seasons[0].episodes[0].djName) {
              const matchedDj = mockAvailableDjs.find(
                d => d.name.toLowerCase() === data.seasons[0].episodes[0].djName?.toLowerCase()
              );
              if (matchedDj) {
                setSelectedDjId(matchedDj.id);
              }
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (seriesId) {
      fetchSeries();
    }

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const stepParam = urlParams.get('step');
      const tabParam = urlParams.get('tab');
      if (stepParam) {
        const parsed = parseInt(stepParam, 10);
        if (parsed >= 1 && parsed <= 6) setCurrentStep(parsed);
      } else if (tabParam) {
        const tabMap: Record<string, number> = {
          metadata: 1,
          artwork: 2,
          taxonomies: 3,
          djs: 4,
          episodes: 5,
          media: 5,
          checklist: 6,
        };
        if (tabMap[tabParam]) setCurrentStep(tabMap[tabParam]);
      }
    }
  }, [seriesId]);

  // DJ Helper
  const currentDj = mockAvailableDjs.find(d => d.id === selectedDjId) || mockAvailableDjs[0];

  // Season & Episode Operations
  const handleAddSeason = () => {
    const nextNum = seasons.length + 1;
    const epId = `ep-${Date.now()}-1`;
    const newSeason: SeasonItem = {
      id: `seas-${Date.now()}`,
      seasonNumber: nextNum,
      title: `Season ${nextNum}`,
      status: 'DRAFT',
      episodes: [
        {
          id: epId,
          episodeNumber: 1,
          title: 'Episode 1',
          durationMinutes: 50,
          description: 'Episode overview.',
          djName: currentDj.name,
          streamingStatus: 'not_available',
          downloadStatus: 'not_available',
          status: 'DRAFT',
        },
      ],
    };
    setSeasons(prev => [...prev, newSeason]);
    setActiveSeasonIdx(seasons.length);
    setExpandedEpId(epId);
  };

  const handleRemoveSeason = (seasonIndex: number) => {
    if (seasons.length <= 1) {
      showToast('A series must have at least one season.');
      return;
    }
    const updated = seasons.filter((_, i) => i !== seasonIndex);
    setSeasons(updated);
    if (activeSeasonIdx >= updated.length) {
      setActiveSeasonIdx(Math.max(0, updated.length - 1));
    }
  };

  const handleAddEpisode = (seasonIndex: number) => {
    const targetSeason = seasons[seasonIndex];
    const nextEpNum = targetSeason.episodes.length + 1;
    const epId = `ep-${Date.now()}-${nextEpNum}`;
    const newEpisode: EpisodeItem = {
      id: epId,
      episodeNumber: nextEpNum,
      title: `Episode ${nextEpNum}`,
      durationMinutes: 50,
      description: 'Sequential episode release.',
      djName: currentDj.name,
      streamingStatus: 'not_available',
      downloadStatus: 'not_available',
      status: 'DRAFT',
    };

    const updated = [...seasons];
    updated[seasonIndex].episodes.push(newEpisode);
    setSeasons(updated);
    setExpandedEpId(epId);
  };

  const handleRemoveEpisode = (seasonIndex: number, epIndex: number) => {
    if (seasons[seasonIndex].episodes.length <= 1) {
      showToast('Each season must contain at least one episode.');
      return;
    }
    const updated = [...seasons];
    updated[seasonIndex].episodes = updated[seasonIndex].episodes.filter((_, i) => i !== epIndex);
    setSeasons(updated);
  };

  // Completeness calculation
  const totalEpisodes = seasons.reduce((acc, s) => acc + s.episodes.length, 0);
  const hasEpisodes = totalEpisodes > 0;
  const hasBasicInfo = Boolean(title.trim() && description.trim() && releaseYear);
  const hasPoster = Boolean(posterUrl.trim());
  const hasBackdrop = Boolean(backdropUrl.trim());
  const hasCategories = selectedCategories.length > 0;
  const hasCountries = selectedCountries.length > 0;
  const hasDj = Boolean(selectedDjId);

  const checklistItems = [
    hasBasicInfo,
    hasPoster,
    hasBackdrop,
    hasCategories,
    hasCountries,
    hasDj,
    hasEpisodes,
  ];
  const completenessPercent = Math.round(
    (checklistItems.filter(Boolean).length / checklistItems.length) * 100
  );

  const handleSave = async (targetStatus: MediaContentStatus) => {
    if (!title.trim()) {
      showToast('Series title is required.');
      setCurrentStep(1);
      return;
    }

    if (seasons.length === 0 || totalEpisodes === 0) {
      showToast('Please add at least one season and episode.');
      setCurrentStep(5);
      return;
    }

    setIsSubmitting(true);
    try {
      await mediaTeamRepository.updateSeries(seriesId, {
        title: title.trim(),
        originalTitle: originalTitle.trim() || title.trim(),
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        releaseYear,
        description: description.trim(),
        posterUrl: posterUrl || '/posters/fallout.jpg',
        backdropUrl: backdropUrl || undefined,
        trailerUrl: trailerUrl || undefined,
        categoryNames: selectedCategories,
        countryNames: selectedCountries,
        seasons,
        totalEpisodes,
        completenessPercent,
        status: targetStatus,
      });

      setStatus(targetStatus);
      showToast(`Series "${title}" updated successfully with status ${targetStatus}!`);
      setTimeout(() => {
        router.push('/media-team/series');
      }, 1000);
    } catch (err) {
      console.error(err);
      showToast('Error updating series record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center font-mono text-xs text-[#70737C]">
        Loading series details...
      </div>
    );
  }

  if (!series) {
    return (
      <div className="py-24 text-center font-mono text-xs text-[#70737C]">
        Series record not found.{' '}
        <Link href="/media-team/series" className="text-white underline">
          Return to Series & TV Shows
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-24">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-[#181A21] border border-emerald-500/40 text-white px-4 py-3 rounded-xl shadow-2xl text-xs backdrop-blur-md animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#262932] pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/media-team/series"
            className="p-2 rounded-xl bg-[#111318] hover:bg-[#181A21] text-gray-400 hover:text-white border border-[#262932] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold bg-[#181A21] text-[#A6A8B0] border border-[#262932] px-2 py-0.5 rounded uppercase">
                {series.codeId}
              </span>
              <span className="text-xs text-[#70737C] font-mono">
                Fix &amp; Edit Series
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mt-1 truncate max-w-lg">
              {title || series.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-400 bg-[#181A21] border border-[#262932] px-3 py-1.5 rounded-xl">
            {seasons.length} Seasons • {totalEpisodes} Episodes
          </span>
          <ContentCompletenessBadge percent={completenessPercent} />
        </div>
      </div>

      {/* Step Navigation Bar */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {STEPS.map(s => {
          const isActive = currentStep === s.step;
          const isDone = currentStep > s.step;
          return (
            <button
              key={s.step}
              onClick={() => setCurrentStep(s.step)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 ${
                isActive
                  ? 'bg-[#181A21] border-white/40 text-white shadow-sm'
                  : isDone
                  ? 'bg-[#111318] border-emerald-500/30 text-emerald-400 hover:bg-[#181A21]'
                  : 'bg-[#111318] border-[#262932] text-[#70737C] hover:bg-[#181A21]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold">
                  STEP 0{s.step}
                </span>
                {isDone && <Check className="w-3 h-3 text-emerald-400" />}
              </div>
              <span className="text-xs font-semibold truncate text-white">
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Wizard Form Body */}
      <div className="bg-[#111318] border border-[#262932] rounded-2xl p-6 lg:p-8 space-y-6 shadow-xl">
        {/* STEP 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-white">
                1. Basic Series Information
              </h2>
              <p className="text-xs text-[#A6A8B0] mt-1">
                Enter series title, original Hollywood/international title, and description.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-300">
                    Series Title *
                  </label>
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
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Fallout"
                  className="w-full bg-[#181A21] border border-[#262932] rounded-xl px-4 py-3 text-sm text-white placeholder-[#70737C] focus:outline-none focus:border-white/30"
                />
              </div>

              {showOriginalTitle && (
                <div className="space-y-2 md:col-span-2 p-3.5 rounded-xl bg-[#181A21]/50 border border-[#262932] animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#A6A8B0]">
                      Original / International Title (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowOriginalTitle(false);
                        setOriginalTitle('');
                      }}
                      className="text-[10px] text-[#70737C] hover:text-rose-400"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    value={originalTitle}
                    onChange={e => setOriginalTitle(e.target.value)}
                    placeholder="e.g. Fallout (Amazon Original)"
                    className="w-full bg-[#111318] border border-[#262932] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-white/30"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300">
                  Release Year
                </label>
                <input
                  type="number"
                  value={releaseYear}
                  onChange={e => setReleaseYear(Number(e.target.value))}
                  min={1950}
                  max={2030}
                  className="w-full bg-[#181A21] border border-[#262932] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300">
                About the Series
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Briefly describe what this series is about in Swahili or English..."
                className="w-full bg-[#181A21] border border-[#262932] rounded-xl p-4 text-sm text-white placeholder-[#70737C] focus:outline-none focus:border-white/30"
              />
            </div>
          </div>
        )}

        {/* STEP 2: Visual Artwork */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-white">
                2. Visual Artwork &amp; Trailer
              </h2>
              <p className="text-xs text-[#A6A8B0] mt-1">
                Upload the vertical series cover poster, horizontal wide banner, and teaser.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Vertical Series Poster */}
              <div className="bg-[#181A21] border border-[#262932] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#D6A84F]" />
                    <h3 className="text-sm font-bold text-white">
                      Series Poster (Vertical) *
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-[#70737C]">2:3 Ratio</span>
                </div>

                <div className="border border-dashed border-[#262932] hover:border-[#D6A84F]/40 rounded-xl p-4 text-center bg-[#111318]/60 transition-colors">
                  <ImageIcon className="w-6 h-6 text-[#D6A84F] mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-white">
                    {posterUrl ? "Poster selected" : "Click to select series poster"}
                  </p>
                  <p className="text-[10px] text-[#70737C] mt-0.5">JPG, PNG, WebP (Vertical format)</p>
                  <input
                    type="file"
                    id="poster-file-input"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = URL.createObjectURL(file);
                        setPosterUrl(url);
                      }
                    }}
                  />
                  <label
                    htmlFor="poster-file-input"
                    className="mt-2.5 inline-block px-3 py-1.5 rounded-lg bg-[#262932] hover:bg-[#353945] text-white text-[11px] font-medium cursor-pointer transition-colors"
                  >
                    {posterUrl ? "Change Poster" : "Choose from Device"}
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-20 h-28 rounded-lg bg-[#111318] border border-[#262932] overflow-hidden flex items-center justify-center shrink-0">
                    {posterUrl ? (
                      <img
                        src={posterUrl}
                        alt="Poster Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[9px] text-[#70737C] text-center px-1">
                        No Preview
                      </span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] text-[#70737C] font-mono">Or paste Image URL:</label>
                    <input
                      type="text"
                      value={posterUrl}
                      onChange={e => setPosterUrl(e.target.value)}
                      placeholder="https://... or /posters/series.jpg"
                      className="w-full bg-[#111318] border border-[#262932] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-[#D6A84F]/40"
                    />
                  </div>
                </div>
              </div>

              {/* Horizontal Wide Banner Image */}
              <div className="bg-[#181A21] border border-[#262932] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-bold text-white">
                      Wide Banner Image (Horizontal)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-[#70737C]">16:9 Ratio</span>
                </div>

                <div className="border border-dashed border-[#262932] hover:border-blue-500/40 rounded-xl p-4 text-center bg-[#111318]/60 transition-colors">
                  <ImageIcon className="w-6 h-6 text-blue-400 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-white">
                    {backdropUrl ? "Wide banner selected" : "Click to select wide backdrop banner"}
                  </p>
                  <p className="text-[10px] text-[#70737C] mt-0.5">JPG, PNG, WebP (Landscape 16:9 format)</p>
                  <input
                    type="file"
                    id="backdrop-file-input"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = URL.createObjectURL(file);
                        setBackdropUrl(url);
                      }
                    }}
                  />
                  <label
                    htmlFor="backdrop-file-input"
                    className="mt-2.5 inline-block px-3 py-1.5 rounded-lg bg-[#262932] hover:bg-[#353945] text-white text-[11px] font-medium cursor-pointer transition-colors"
                  >
                    {backdropUrl ? "Change Banner" : "Choose from Device"}
                  </label>
                </div>

                <div className="space-y-1.5">
                  <div className="w-full h-20 rounded-lg bg-[#111318] border border-[#262932] overflow-hidden flex items-center justify-center">
                    {backdropUrl ? (
                      <img
                        src={backdropUrl}
                        alt="Backdrop Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-[#70737C] text-center">
                        Wide Banner Preview
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={backdropUrl}
                    onChange={e => setBackdropUrl(e.target.value)}
                    placeholder="Or paste banner image URL: https://..."
                    className="w-full bg-[#111318] border border-[#262932] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>
            </div>

            {/* Trailer preview (Optional) */}
            <div className="bg-[#181A21] border border-[#262932] rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">
                    Trailer Video (Optional)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-[#70737C]">Optional</span>
              </div>
              <p className="text-[11px] text-[#A6A8B0]">
                Add a YouTube or MP4 teaser link for customers to preview before purchasing.
              </p>
              <input
                type="text"
                value={trailerUrl}
                onChange={e => setTrailerUrl(e.target.value)}
                placeholder="e.g. https://www.youtube.com/watch?v=... or /trailers/fallout.mp4"
                className="w-full bg-[#111318] border border-[#262932] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>
        )}

        {/* STEP 3: Taxonomies */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-white">
                3. Taxonomies &amp; Classifications
              </h2>
              <p className="text-xs text-[#A6A8B0] mt-1">
                Pick official genres and assign production origin countries.
              </p>
            </div>

            {/* Categories */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-300 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-white/80" />
                  <span>Pick Categories</span>
                </label>
                <span className="text-[10px] font-mono text-[#70737C]">
                  Select applicable genres
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {mockAvailableCategories.map(cat => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategories(prev =>
                          isSelected ? prev.filter(c => c !== cat) : [...prev, cat]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        isSelected
                          ? 'bg-[#181A21] text-white border-blue-500/50 shadow-sm shadow-blue-500/10 font-semibold ring-1 ring-blue-500/30'
                          : 'bg-[#181A21] text-[#A6A8B0] border-[#262932] hover:border-gray-500'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Countries */}
            <div className="space-y-3 pt-4 border-t border-[#262932]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-300 flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>Countries of Origin</span>
                </label>
                <span className="text-[10px] font-mono text-[#70737C]">
                  Displayed to customers on discovery hub
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {mockAvailableCountries.map(country => {
                  const isSelected = selectedCountries.includes(country);
                  const flagMap: Record<string, string> = {
                    'Tanzania': '🇹🇿',
                    'United States': '🇺🇸',
                    'South Korea': '🇰🇷',
                    'India': '🇮🇳',
                    'China': '🇨🇳',
                    'United Kingdom': '🇬🇧',
                    'France': '🇫🇷',
                    'Nigeria': '🇳🇬',
                    'South Africa': '🇿🇦',
                    'Japan': '🇯🇵',
                    'Australia': '🇦🇺',
                    'Kenya': '🇰🇪',
                  };
                  const flag = flagMap[country] || '🌐';

                  return (
                    <button
                      key={country}
                      type="button"
                      onClick={() => {
                        setSelectedCountries(prev =>
                          isSelected
                            ? prev.filter(c => c !== country)
                            : [...prev, country]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#181A21] text-white border-blue-500/50 shadow-sm shadow-blue-500/10 font-semibold ring-1 ring-blue-500/30'
                          : 'bg-[#181A21] text-[#A6A8B0] border-[#262932] hover:border-gray-500'
                      }`}
                    >
                      <span className="text-sm">{flag}</span>
                      <span>{country}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Translating DJ */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-[#D6A84F]" />
                <h2 className="text-lg font-bold text-white">
                  4. Translating DJ (Lead Voice Artist)
                </h2>
              </div>
              <p className="text-xs text-[#A6A8B0] mt-1">
                Select the primary DJ who translates this series. You can also customize individual episodes in Step 5 if needed.
              </p>
            </div>

            {/* DJ Selector Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {mockAvailableDjs.map((dj) => {
                const isSelected = selectedDjId === dj.id;
                return (
                  <button
                    key={dj.id}
                    type="button"
                    onClick={() => {
                      setSelectedDjId(dj.id);
                      const updated = seasons.map(s => ({
                        ...s,
                        episodes: s.episodes.map(ep => ({
                          ...ep,
                          djName: dj.name,
                        })),
                      }));
                      setSeasons(updated);
                    }}
                    className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#181A21] border-[#D6A84F] shadow-lg shadow-[#D6A84F]/10 ring-1 ring-[#D6A84F]'
                        : 'bg-[#181A21]/60 border-[#262932] hover:border-gray-600 hover:bg-[#181A21]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-full bg-[#111318] border border-[#262932] flex items-center justify-center text-sm font-bold text-white">
                        {dj.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-[#D6A84F] flex items-center justify-center text-black">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-[#262932]" />
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white leading-tight">
                        {dj.name}
                      </h4>
                      <p className="text-[11px] text-[#A6A8B0] mt-0.5 line-clamp-1">
                        {dj.dialect}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-[9px] font-mono uppercase bg-[#111318] border border-[#262932] px-1.5 py-0.5 rounded text-[#70737C]">
                          {dj.tier}
                        </span>
                        <span className="text-[10px] text-[#70737C] font-mono">
                          {dj.activeTitlesCount} titles
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Currently Selected DJ Banner */}
            <div className="bg-[#181A21] border border-[#262932] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#D6A84F]/10 border border-[#D6A84F]/30 flex items-center justify-center text-[#D6A84F]">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#70737C]">Selected Series DJ</span>
                  <p className="text-xs font-bold text-white">
                    {currentDj.name} <span className="text-[#A6A8B0] font-normal">({currentDj.dialect})</span>
                  </p>
                </div>
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Assigned
              </span>
            </div>
          </div>
        )}

        {/* STEP 5: Seasons & Episodes Builder with Direct Video Upload */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">
                  5. Seasons, Episodes &amp; Video Files
                </h2>
                <p className="text-xs text-[#A6A8B0] mt-1">
                  Upload the master translated video for each episode and organize sequential chapters.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddSeason}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-semibold transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Season</span>
              </button>
            </div>

            {/* Season Tabs */}
            {seasons.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#262932]">
                {seasons.map((season, idx) => (
                  <button
                    key={season.id}
                    type="button"
                    onClick={() => setActiveSeasonIdx(idx)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                      activeSeasonIdx === idx
                        ? 'bg-[#181A21] border border-blue-500/40 text-white shadow-sm'
                        : 'bg-[#111318] border border-[#262932] text-[#70737C] hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    <span>{season.title}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-gray-400">
                      {season.episodes.length} ep
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Active Season Detail */}
            {seasons[activeSeasonIdx] && (
              <div className="bg-[#181A21] border border-[#262932] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#262932] pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-[#A6A8B0]">Season Title:</span>
                    <input
                      type="text"
                      value={seasons[activeSeasonIdx].title}
                      onChange={e => {
                        const updated = [...seasons];
                        updated[activeSeasonIdx].title = e.target.value;
                        setSeasons(updated);
                      }}
                      className="bg-[#111318] border border-[#262932] rounded-lg px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddEpisode(activeSeasonIdx)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Episode</span>
                    </button>
                    {seasons.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSeason(activeSeasonIdx)}
                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs transition-colors"
                        title="Delete Season"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Episodes Accordion List */}
                <div className="space-y-3">
                  {seasons[activeSeasonIdx].episodes.map((ep, epIdx) => {
                    const isExpanded = expandedEpId === ep.id;
                    const videoFileName = uploadedVideoNames[ep.id];
                    const downloadFileName = uploadedDownloadNames[ep.id];
                    const hasVideo = ep.streamingStatus === 'ready' || Boolean(videoFileName);

                    return (
                      <div
                        key={ep.id}
                        className={`rounded-xl border transition-all ${
                          isExpanded
                            ? 'bg-[#111318] border-blue-500/40 shadow-lg'
                            : 'bg-[#111318]/70 border-[#262932] hover:border-gray-600'
                        }`}
                      >
                        {/* Episode Header Bar */}
                        <div
                          className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                          onClick={() => setExpandedEpId(isExpanded ? null : ep.id)}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                              {ep.episodeNumber}
                            </span>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-white truncate">
                                {ep.title || `Episode ${ep.episodeNumber}`}
                              </h4>
                              <p className="text-[11px] text-[#70737C] font-mono mt-0.5">
                                {ep.durationMinutes} min • DJ: <span className="text-[#D6A84F]">{ep.djName || currentDj.name}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                            {hasVideo ? (
                              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold">
                                <Check className="w-3 h-3 stroke-[3]" /> Video Attached
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold">
                                <AlertTriangle className="w-3 h-3" /> No Video
                              </span>
                            )}

                            {seasons[activeSeasonIdx].episodes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveEpisode(activeSeasonIdx, epIdx)}
                                className="p-1.5 text-gray-500 hover:text-rose-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setExpandedEpId(isExpanded ? null : ep.id)}
                              className="p-1 text-gray-400 hover:text-white"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Episode Body with Video Uploaders */}
                        {isExpanded && (
                          <div className="p-4 pt-0 border-t border-[#262932]/70 space-y-4 mt-1 animate-in fade-in duration-150">
                            {/* Title & Duration & DJ */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-gray-300">Episode Title *</label>
                                <input
                                  type="text"
                                  value={ep.title}
                                  onChange={e => {
                                    const updated = [...seasons];
                                    updated[activeSeasonIdx].episodes[epIdx].title = e.target.value;
                                    setSeasons(updated);
                                  }}
                                  placeholder="e.g. Episode 1: Pilot"
                                  className="w-full bg-[#181A21] border border-[#262932] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-gray-300">Duration (Minutes)</label>
                                <input
                                  type="number"
                                  value={ep.durationMinutes}
                                  onChange={e => {
                                    const updated = [...seasons];
                                    updated[activeSeasonIdx].episodes[epIdx].durationMinutes = Number(e.target.value);
                                    setSeasons(updated);
                                  }}
                                  min={1}
                                  className="w-full bg-[#181A21] border border-[#262932] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-gray-300">Translating DJ</label>
                                <select
                                  value={ep.djName || currentDj.name}
                                  onChange={e => {
                                    const updated = [...seasons];
                                    updated[activeSeasonIdx].episodes[epIdx].djName = e.target.value;
                                    setSeasons(updated);
                                  }}
                                  className="w-full bg-[#181A21] border border-[#262932] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                                >
                                  {mockAvailableDjs.map(d => (
                                    <option key={d.id} value={d.name}>
                                      {d.name} ({d.dialect.split(' ')[0]})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Episode Video Files Upload Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                              {/* Master Streaming Video File */}
                              <div className="p-3.5 rounded-xl bg-[#181A21] border border-[#262932] space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <FileVideo className="w-4 h-4 text-blue-400" />
                                    <span className="text-xs font-bold text-white">Master Episode Video (Streaming)</span>
                                  </div>
                                  <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                                    {ep.streamingStatus}
                                  </span>
                                </div>

                                <div className="border border-dashed border-[#262932] hover:border-blue-500/50 rounded-xl p-3.5 text-center bg-[#111318]/50 transition-colors">
                                  <UploadCloud className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                                  <p className="text-xs font-semibold text-white">
                                    {videoFileName || (ep.streamingStatus === 'ready' ? `${ep.title || 'episode'}_master.mp4` : 'Select episode MP4 video')}
                                  </p>
                                  <p className="text-[10px] text-[#70737C] mt-0.5">Direct device upload (MP4, MKV up to 8GB)</p>
                                  <input
                                    type="file"
                                    id={`stream-upload-edit-${ep.id}`}
                                    className="hidden"
                                    accept="video/*"
                                    onChange={e => {
                                      if (e.target.files?.[0]) {
                                        const fname = e.target.files[0].name;
                                        setUploadedVideoNames(prev => ({ ...prev, [ep.id]: fname }));
                                        const updated = [...seasons];
                                        updated[activeSeasonIdx].episodes[epIdx].streamingStatus = 'ready';
                                        setSeasons(updated);
                                        showToast(`Attached ${fname} to Episode ${ep.episodeNumber}`);
                                      }
                                    }}
                                  />
                                  <label
                                    htmlFor={`stream-upload-edit-${ep.id}`}
                                    className="mt-2 inline-block px-3 py-1 rounded-lg bg-[#262932] hover:bg-[#353945] text-white text-[11px] font-medium cursor-pointer transition-colors"
                                  >
                                    {videoFileName || ep.streamingStatus === 'ready' ? 'Replace Episode Video' : 'Choose Episode Video'}
                                  </label>
                                </div>
                              </div>

                              {/* Mobile Download Video File */}
                              <div className="p-3.5 rounded-xl bg-[#181A21] border border-[#262932] space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Download className="w-4 h-4 text-emerald-400" />
                                    <span className="text-xs font-bold text-white">Offline Download File (Optional)</span>
                                  </div>
                                  <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                                    {ep.downloadStatus}
                                  </span>
                                </div>

                                <div className="border border-dashed border-[#262932] hover:border-emerald-500/50 rounded-xl p-3.5 text-center bg-[#111318]/50 transition-colors">
                                  <Download className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                                  <p className="text-xs font-semibold text-white">
                                    {downloadFileName || (ep.downloadStatus === 'ready' ? `${ep.title || 'episode'}_mobile.mp4` : 'Select mobile package file')}
                                  </p>
                                  <p className="text-[10px] text-[#70737C] mt-0.5">Optimized MP4 (200MB - 800MB)</p>
                                  <input
                                    type="file"
                                    id={`download-upload-edit-${ep.id}`}
                                    className="hidden"
                                    accept="video/*"
                                    onChange={e => {
                                      if (e.target.files?.[0]) {
                                        const fname = e.target.files[0].name;
                                        setUploadedDownloadNames(prev => ({ ...prev, [ep.id]: fname }));
                                        const updated = [...seasons];
                                        updated[activeSeasonIdx].episodes[epIdx].downloadStatus = 'ready';
                                        setSeasons(updated);
                                        showToast(`Attached download package to Episode ${ep.episodeNumber}`);
                                      }
                                    }}
                                  />
                                  <label
                                    htmlFor={`download-upload-edit-${ep.id}`}
                                    className="mt-2 inline-block px-3 py-1 rounded-lg bg-[#262932] hover:bg-[#353945] text-white text-[11px] font-medium cursor-pointer transition-colors"
                                  >
                                    {downloadFileName || ep.downloadStatus === 'ready' ? 'Replace Mobile File' : 'Choose Mobile File'}
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 6: Review & Save */}
        {currentStep === 6 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-white">
                6. Content Readiness &amp; Publishing Review
              </h2>
              <p className="text-xs text-[#A6A8B0] mt-1">
                Verify all catalog requirements before saving changes or updating publication status.
              </p>
            </div>

            {/* Checklist Overview */}
            <div className="bg-[#181A21] border border-[#262932] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#A6A8B0] uppercase tracking-wider">
                  Readiness Checklist ({completenessPercent}% Complete)
                </span>
                <ContentCompletenessBadge percent={completenessPercent} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  {hasBasicInfo ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="text-gray-300">Title &amp; Metadata</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasPoster ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  )}
                  <span className="text-gray-300">Poster Artwork</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasBackdrop ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="text-gray-300">Backdrop (16:9)</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasCategories ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  )}
                  <span className="text-gray-300">Categories</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasDj ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  )}
                  <span className="text-gray-300">Translating DJ</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasEpisodes ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  )}
                  <span className="text-gray-300">Episodes ({totalEpisodes})</span>
                </div>
              </div>
            </div>

            {/* Summary card */}
            <div className="bg-[#181A21] border border-[#262932] rounded-xl p-5 space-y-2">
              <h3 className="text-sm font-bold text-white">Series Summary</h3>
              <p className="text-xs text-[#A6A8B0]">
                <strong>{title || 'Untitled Series'}</strong> ({releaseYear}) • {seasons.length} Seasons • {totalEpisodes} Total Episodes • Lead DJ: <strong className="text-[#D6A84F]">{currentDj.name}</strong>
              </p>
              <p className="text-xs text-[#70737C]">
                Categories: {selectedCategories.join(', ') || 'None selected'}
              </p>
              <p className="text-xs text-[#70737C]">
                Current Catalog Status: <span className="font-mono font-bold text-white uppercase">{status}</span>
              </p>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-[#262932]">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#181A21] hover:bg-[#262932] text-white text-xs font-semibold border border-[#262932] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous Step</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave('DRAFT')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#181A21] hover:bg-[#262932] text-gray-300 hover:text-white text-xs font-semibold border border-[#262932] transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save as Draft</span>
            </button>

            {currentStep < 6 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#B11226] hover:bg-[#8F0D1E] text-white text-xs font-bold transition-colors shadow-md shadow-[#B11226]/20 border border-[#B11226]/40"
              >
                <span>Continue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSave('READY_FOR_REVIEW')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-md"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Submit for Review</span>
                </button>
                {publishingRequiresApproval && role !== 'ADMIN' ? (
                  <div
                    title="Platform policy requires Admin review before catalog release. This can be configured in Admin Settings."
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#181A21] border border-[#262932] text-[#70737C] text-xs font-medium cursor-not-allowed select-none"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Publishing Locked (Admin Approval Required)</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSave('PUBLISHED')}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-md"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Publish Live</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
