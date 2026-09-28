'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Film,
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
  MediaContentItem,
  MovieVersionItem,
  MediaContentStatus,
  ContentReadinessChecklist,
} from '@/types/mediaTeam';
import { ContentCompletenessBadge } from '@/components/media-team/ContentCompletenessBadge';

const STEPS = [
  { step: 1, label: 'Title & Info' },
  { step: 2, label: 'Visual Artwork' },
  { step: 3, label: 'Taxonomies' },
  { step: 4, label: 'DJ Editions' },
  { step: 5, label: 'Media Files' },
  { step: 6, label: 'Review & Save' },
];

export default function MediaTeamEditMoviePage() {
  const router = useRouter();
  const params = useParams();
  const movieId = params?.id as string;

  const [movie, setMovie] = useState<MediaContentItem | null>(null);
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
  const [slug, setSlug] = useState('');
  const [releaseYear, setReleaseYear] = useState(2024);
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [description, setDescription] = useState('');

  // Step 2: Visual Artwork
  const [posterUrl, setPosterUrl] = useState('');
  const [backdropUrl, setBackdropUrl] = useState('');
  const [trailerUrl, setTrailerUrl] = useState('');

  // Step 3: Taxonomies
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Action']);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['United States']);

  // Step 4 & 5: DJ Video Editions & Media Files
  const [versions, setVersions] = useState<MovieVersionItem[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [isAddingVersion, setIsAddingVersion] = useState(false);
  const [newVersionDjId, setNewVersionDjId] = useState<string>('dj-murphy');
  const [newVersionStreamFile, setNewVersionStreamFile] = useState<string>('');
  const [newVersionDownloadFile, setNewVersionDownloadFile] = useState<string>('');

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

    const fetchMovie = async () => {
      try {
        const data = await mediaTeamRepository.getMovieById(movieId);
        if (data) {
          setMovie(data);
          setTitle(data.title);
          setOriginalTitle(data.originalTitle || '');
          if (data.originalTitle && data.originalTitle !== data.title) {
            setShowOriginalTitle(true);
          }
          setSlug(data.slug);
          setReleaseYear(data.releaseYear);
          setDurationMinutes(data.durationMinutes);
          setDescription(data.description);
          setPosterUrl(data.posterUrl);
          setBackdropUrl(data.backdropUrl || '');
          setTrailerUrl(data.trailerUrl || '');
          setSelectedCategories(data.categoryNames);
          setSelectedCountries(data.countryNames);
          if (data.versions && data.versions.length > 0) {
            setVersions(data.versions);
            setSelectedVersionId(data.versions[0].id);
          } else {
            const defaultVer: MovieVersionItem = {
              id: `ver-${data.id || '01'}`,
              djId: 'dj-afro',
              djName: 'DJ Afro Amigo',
              versionLabel: 'DJ Afro Cut',
              streamingFileName: data.slug ? `${data.slug}_dj_afro_1080p.mp4` : 'master_video.mp4',
              streamingStatus: data.streamingStatus || 'ready',
              downloadFileName: data.slug ? `${data.slug}_dj_afro_mobile.mp4` : 'mobile_download.mp4',
              downloadStatus: data.downloadStatus || 'ready',
              readinessStatus: 'ready',
            };
            setVersions([defaultVer]);
            setSelectedVersionId(defaultVer.id);
          }
          setStatus(data.status);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (movieId) {
      fetchMovie();
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
          media: 5,
          checklist: 6,
        };
        if (tabMap[tabParam]) setCurrentStep(tabMap[tabParam]);
      }
    }
  }, [movieId]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slug || slug === title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  // Active DJ Version currently selected for viewing/editing files in Step 5
  const activeVersion: MovieVersionItem | undefined =
    versions.find(v => v.id === selectedVersionId) || versions[0];

  const handleUpdateActiveVersionFile = (field: 'streamingFileName' | 'downloadFileName', fileName: string) => {
    if (!activeVersion) return;
    setVersions(prev => prev.map(v => {
      if (v.id === activeVersion.id) {
        return {
          ...v,
          [field]: fileName,
          [field === 'streamingFileName' ? 'streamingStatus' : 'downloadStatus']: 'ready',
        };
      }
      return v;
    }));
    showToast(`Updated ${field === 'streamingFileName' ? 'streaming video' : 'download package'} for ${activeVersion.djName}.`);
  };

  const handleAddVersion = () => {
    if (!newVersionDjId) {
      showToast('Please select a DJ for the new edition.');
      return;
    }
    const dj = mockAvailableDjs.find(d => d.id === newVersionDjId);
    if (!dj) return;
    if (versions.some(v => v.djId === dj.id)) {
      showToast(`This movie already has an edition translated by ${dj.name}.`);
      return;
    }
    const generatedStreamName = newVersionStreamFile || `${slug || 'movie'}_${dj.id}_1080p.mp4`;
    const generatedDownloadName = newVersionDownloadFile || `${slug || 'movie'}_${dj.id}_mobile.mp4`;
    const newVer: MovieVersionItem = {
      id: `ver-${Date.now()}`,
      djId: dj.id,
      djName: dj.name,
      versionLabel: `${dj.name} Cut`,
      streamingFileName: generatedStreamName,
      streamingStatus: 'ready',
      downloadFileName: generatedDownloadName,
      downloadStatus: 'ready',
      readinessStatus: 'ready',
    };
    setVersions(prev => [...prev, newVer]);
    setSelectedVersionId(newVer.id);
    setIsAddingVersion(false);
    setNewVersionDjId('');
    setNewVersionStreamFile('');
    setNewVersionDownloadFile('');
    showToast(`Added ${dj.name} edition with video file.`);
  };

  const handleRemoveVersion = (versionId: string) => {
    if (versions.length <= 1) {
      showToast('A movie must have at least one DJ video edition.');
      return;
    }
    const target = versions.find(v => v.id === versionId);
    if (confirm(`Remove the ${target?.djName || 'DJ'} edition and its video files from this movie?`)) {
      setVersions(prev => {
        const next = prev.filter(v => v.id !== versionId);
        if (selectedVersionId === versionId && next.length > 0) {
          setSelectedVersionId(next[0].id);
        }
        return next;
      });
      showToast(`Removed ${target?.djName || 'DJ'} edition.`);
    }
  };

  // Checklist & Completeness calculation
  const checklist: ContentReadinessChecklist = {
    basicInfo: Boolean(title.trim() && description.trim() && releaseYear && durationMinutes),
    poster: Boolean(posterUrl.trim()),
    backdrop: Boolean(backdropUrl.trim()),
    trailer: Boolean(trailerUrl.trim()),
    categories: selectedCategories.length > 0,
    countries: selectedCountries.length > 0,
    djAssigned: versions.length > 0,
    streamingMedia: versions.some(v => v.streamingStatus === 'ready'),
    downloadMedia: versions.some(v => v.downloadStatus === 'ready'),
  };

  const calculateCompleteness = () => {
    const items = Object.values(checklist);
    const completed = items.filter(Boolean).length;
    return Math.round((completed / items.length) * 100);
  };

  const completenessPercent = calculateCompleteness();

  const handleSave = async (targetStatus: MediaContentStatus) => {
    if (!title.trim()) {
      showToast('Movie title is required.');
      setCurrentStep(1);
      return;
    }

    if (versions.length === 0) {
      showToast('At least one DJ Video Edition is required.');
      setCurrentStep(4);
      return;
    }

    setIsSubmitting(true);
    try {
      const overallStreaming = versions.some(v => v.streamingStatus === 'ready') ? 'ready' : 'processing';
      const overallDownload = versions.some(v => v.downloadStatus === 'ready') ? 'ready' : 'processing';

      await mediaTeamRepository.updateMovie(movieId, {
        title: title.trim(),
        originalTitle: originalTitle.trim() || title.trim(),
        slug: slug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        releaseYear,
        durationMinutes,
        description: description.trim(),
        posterUrl: posterUrl || '/posters/placeholder.jpg',
        backdropUrl: backdropUrl || undefined,
        trailerUrl: trailerUrl || undefined,
        categoryNames: selectedCategories,
        countryNames: selectedCountries,
        versions,
        streamingStatus: overallStreaming,
        downloadStatus: overallDownload,
        completenessPercent,
        checklist,
        status: targetStatus,
      });

      setStatus(targetStatus);
      showToast(`Movie "${title}" saved successfully with ${versions.length} DJ edition(s)!`);
      setTimeout(() => {
        router.push('/media-team/movies');
      }, 1000);
    } catch (err) {
      console.error(err);
      showToast('Error updating movie record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center font-mono text-xs text-[#70737C]">
        Loading movie details...
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="py-24 text-center font-mono text-xs text-[#70737C]">
        Movie record not found.{' '}
        <Link href="/media-team/movies" className="text-white underline">
          Return to Movie Library
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
            href="/media-team/movies"
            className="p-2 rounded-xl bg-[#111318] hover:bg-[#181A21] text-gray-400 hover:text-white border border-[#262932] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold bg-[#181A21] text-[#A6A8B0] border border-[#262932] px-2 py-0.5 rounded uppercase">
                {movie.codeId}
              </span>
              <span className="text-xs text-[#70737C] font-mono">
                Fix &amp; Edit Catalog Movie
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mt-1 truncate max-w-lg">
              {title || movie.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ContentCompletenessBadge
            percent={completenessPercent}
            checklist={checklist}
          />
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
                1. Basic Movie Information
              </h2>
              <p className="text-xs text-[#A6A8B0] mt-1">
                Enter primary title, Hollywood/original title, duration, and catalog overview description.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-300">
                    Movie Title *
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
                  onChange={e => handleTitleChange(e.target.value)}
                  placeholder="e.g. Godzilla x Kong: The New Empire"
                  className="w-full bg-[#181A21] border border-[#262932] rounded-xl px-4 py-3 text-sm text-white placeholder-[#70737C] focus:outline-none focus:border-white/30"
                />
              </div>

              {showOriginalTitle && (
                <div className="space-y-2 md:col-span-2 p-3.5 rounded-xl bg-[#181A21]/50 border border-[#262932] animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#A6A8B0]">
                      Original / Hollywood Title (Optional)
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
                    placeholder="e.g. Godzilla x Kong: The New Empire"
                    className="w-full bg-[#111318] border border-[#262932] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-white/30"
                  />
                  <p className="text-[10px] text-[#70737C]">
                    Useful if the DJ translated title is different from the original Hollywood release name.
                  </p>
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

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(Number(e.target.value))}
                  min={1}
                  className="w-full bg-[#181A21] border border-[#262932] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300">
                About the Movie
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Briefly describe what this movie is about in Swahili or English..."
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
                Upload the movie poster cover, wide banner background, and optional video teaser.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Vertical Movie Poster */}
              <div className="bg-[#181A21] border border-[#262932] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#D6A84F]" />
                    <h3 className="text-sm font-bold text-white">
                      Movie Poster (Vertical) *
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-[#70737C]">2:3 Ratio</span>
                </div>

                {/* Direct Dropzone / Image Picker */}
                <div className="border border-dashed border-[#262932] hover:border-[#D6A84F]/40 rounded-xl p-4 text-center bg-[#111318]/60 transition-colors">
                  <ImageIcon className="w-6 h-6 text-[#D6A84F] mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-white">
                    {posterUrl ? "Poster selected" : "Click to select movie poster"}
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
                      placeholder="https://... or /posters/movie.jpg"
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

                {/* Direct Dropzone / Image Picker */}
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
                placeholder="e.g. https://www.youtube.com/watch?v=... or /trailers/movie_teaser.mp4"
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
                Pick from official categories created by Admin and assign production origin countries.
              </p>
            </div>

            {/* Categories */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-300 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-white/80" />
                  <span>Pick Categories (Admin Defined)</span>
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

        {/* STEP 4: DJ Video Editions */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Mic className="w-5 h-5 text-[#D6A84F]" />
                  <h2 className="text-lg font-bold text-white">
                    4. Translating DJ Video Editions
                  </h2>
                </div>
                <p className="text-xs text-[#A6A8B0] mt-1 max-w-2xl">
                  DJ commentary is permanently burned into the movie video file. You cannot switch a DJ on an existing video file. To offer another DJ&apos;s translation, upload that DJ&apos;s full video file as another edition below.
                </p>
              </div>

              {!isAddingVersion && (
                <button
                  type="button"
                  onClick={() => setIsAddingVersion(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D6A84F] hover:bg-[#C49740] text-black font-bold text-xs shadow-md transition-all self-start sm:self-center shrink-0 active:scale-98"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Another DJ Edition</span>
                </button>
              )}
            </div>

            {/* Critical Architecture Notice */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-white block">Embedded Audio Binding Policy</span>
                <span className="text-[#A6A8B0] text-[11px] block mt-0.5">
                  Each edition below is physically bound to that specific DJ&apos;s recorded voiceover file. The same movie title can have multiple editions (e.g. DJ Afro Edition, DJ Murphy Edition), allowing viewers to choose their preferred voice artist.
                </span>
              </div>
            </div>

            {/* List of Active DJ Editions */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#70737C]">
                Active DJ Video Editions ({versions.length})
              </h3>

              <div className="grid grid-cols-1 gap-3">
                {versions.map((ver, idx) => {
                  const djInfo = mockAvailableDjs.find(d => d.id === ver.djId);
                  const isSelected = (activeVersion?.id || versions[0]?.id) === ver.id;

                  return (
                    <div
                      key={ver.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-[#181A21] border-[#D6A84F] shadow-lg shadow-[#D6A84F]/5 ring-1 ring-[#D6A84F]/30'
                          : 'bg-[#111318] border-[#262932] hover:border-gray-600'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-xl bg-[#181A21] border border-[#262932] flex items-center justify-center text-sm font-black text-white shrink-0">
                            {ver.djName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-white">
                                {ver.djName}
                              </h4>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 font-semibold">
                                <Lock className="w-3 h-3" />
                                Embedded Audio
                              </span>
                              {idx === 0 && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold">
                                  Primary Release
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#A6A8B0] mt-0.5">
                              {djInfo?.dialect || 'Swahili'} • {ver.versionLabel || `${ver.djName} Cut`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVersionId(ver.id);
                              setCurrentStep(5);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#262932] hover:bg-[#353945] text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                          >
                            <FileVideo className="w-3.5 h-3.5 text-blue-400" />
                            <span>Manage Video Files</span>
                          </button>

                          {versions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveVersion(ver.id)}
                              title="Remove DJ edition"
                              className="p-2 rounded-lg text-[#70737C] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Video File Status Pill Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#262932]/60 text-xs font-mono">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-[#0E1015] border border-[#262932]">
                          <span className="text-gray-400 flex items-center gap-1.5 truncate">
                            <FileVideo className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span className="truncate">{ver.streamingFileName || 'No streaming file'}</span>
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold shrink-0 ml-2">
                            {ver.streamingStatus.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-[#0E1015] border border-[#262932]">
                          <span className="text-gray-400 flex items-center gap-1.5 truncate">
                            <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">{ver.downloadFileName || 'No download file'}</span>
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold shrink-0 ml-2">
                            {ver.downloadStatus.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add Another DJ Edition Form */}
            {isAddingVersion && (
              <div className="p-5 rounded-2xl bg-[#181A21] border border-[#D6A84F]/50 shadow-xl space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-[#262932]">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-[#D6A84F]" />
                    <h4 className="text-sm font-bold text-white">
                      Add Another DJ Video Edition for {title || 'this movie'}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddingVersion(false)}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-300 block">
                    1. Select Translating DJ from Approved Roster:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {mockAvailableDjs
                      .filter(dj => !versions.some(v => v.djId === dj.id))
                      .map(dj => {
                        const isSelected = newVersionDjId === dj.id;
                        return (
                          <button
                            key={dj.id}
                            type="button"
                            onClick={() => setNewVersionDjId(dj.id)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'bg-[#111318] border-[#D6A84F] text-white ring-1 ring-[#D6A84F]'
                                : 'bg-[#111318] border-[#262932] text-gray-400 hover:text-white hover:border-gray-500'
                            }`}
                          >
                            <p className="text-xs font-bold text-white">{dj.name}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">{dj.dialect}</p>
                          </button>
                        );
                      })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300 block">
                      2. Online Streaming Master Video File:
                    </label>
                    <input
                      type="text"
                      value={newVersionStreamFile}
                      onChange={e => setNewVersionStreamFile(e.target.value)}
                      placeholder={`e.g. ${slug || 'movie'}_${newVersionDjId || 'dj'}_master.mp4`}
                      className="w-full bg-[#111318] border border-[#262932] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-[#D6A84F] font-mono"
                    />
                    <p className="text-[10px] text-gray-500">MP4/MKV with this DJ&apos;s audio burned in.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-300 block">
                      3. Offline Mobile Download File (Optional):
                    </label>
                    <input
                      type="text"
                      value={newVersionDownloadFile}
                      onChange={e => setNewVersionDownloadFile(e.target.value)}
                      placeholder={`e.g. ${slug || 'movie'}_${newVersionDjId || 'dj'}_mobile.mp4`}
                      className="w-full bg-[#111318] border border-[#262932] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-[#D6A84F] font-mono"
                    />
                    <p className="text-[10px] text-gray-500">Compressed mobile package for offline viewing.</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingVersion(false)}
                    className="px-4 py-2 rounded-xl bg-[#262932] hover:bg-[#353945] text-white text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddVersion}
                    className="px-5 py-2 rounded-xl bg-[#D6A84F] hover:bg-[#C49740] text-black text-xs font-bold transition-all shadow-md"
                  >
                    Save DJ Edition
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Media Files */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-white">
                5. Media Assets &amp; Master Video Files
              </h2>
              <p className="text-xs text-[#A6A8B0] mt-1">
                Audio is permanently burned into the movie file. Review and update the video files attached to each DJ edition below.
              </p>
            </div>

            {/* Edition Selector Tabs */}
            {versions.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs text-gray-400 font-mono shrink-0 mr-1">Select Edition:</span>
                {versions.map(ver => {
                  const isSelected = (activeVersion?.id || versions[0]?.id) === ver.id;
                  return (
                    <button
                      key={ver.id}
                      type="button"
                      onClick={() => setSelectedVersionId(ver.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 shrink-0 ${
                        isSelected
                          ? 'bg-[#D6A84F]/20 text-[#D6A84F] border-[#D6A84F] shadow-sm'
                          : 'bg-[#181A21] text-gray-400 border-[#262932] hover:text-white hover:border-gray-500'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>{ver.djName} Edition</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Active Edition Notice */}
            <div className="p-4 rounded-xl bg-[#181A21] border border-[#262932] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#D6A84F]/15 border border-[#D6A84F]/30 flex items-center justify-center text-[#D6A84F] font-bold">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#70737C]">Managing Video Files For</span>
                  <p className="text-xs font-bold text-white">
                    {activeVersion?.djName} <span className="text-amber-400 font-normal">(Audio permanently burned into file)</span>
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-semibold">
                Edition {versions.findIndex(v => v.id === activeVersion?.id) + 1} of {versions.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Streaming Video Master */}
              <div className="bg-[#181A21] border border-[#262932] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileVideo className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-bold text-white">
                      Online Streaming Master (MP4/HLS)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    {(activeVersion?.streamingStatus || 'ready').toUpperCase()}
                  </span>
                </div>

                {/* Direct Dropzone */}
                <div className="border border-dashed border-[#262932] hover:border-blue-500/40 rounded-xl p-4 text-center bg-[#111318]/60 transition-colors">
                  <UploadCloud className="w-6 h-6 text-blue-400 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-white">
                    {activeVersion?.streamingFileName || "Drop master video or click to select"}
                  </p>
                  <p className="text-[10px] text-[#70737C] mt-0.5">MP4, MKV with {activeVersion?.djName} voiceover</p>
                  <input
                    type="file"
                    id="streaming-file-input"
                    className="hidden"
                    accept="video/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleUpdateActiveVersionFile('streamingFileName', e.target.files[0].name);
                      }
                    }}
                  />
                  <label
                    htmlFor="streaming-file-input"
                    className="mt-2.5 inline-block px-3 py-1.5 rounded-lg bg-[#262932] hover:bg-[#353945] text-white text-[11px] font-medium cursor-pointer transition-colors"
                  >
                    {activeVersion?.streamingFileName ? "Replace File" : "Choose File"}
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-[#A6A8B0] font-mono">File Name / Storage Key</label>
                  <input
                    type="text"
                    value={activeVersion?.streamingFileName || ''}
                    onChange={e => handleUpdateActiveVersionFile('streamingFileName', e.target.value)}
                    placeholder="e.g. movie_dj_master.mp4"
                    className="w-full bg-[#111318] border border-[#262932] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-blue-500/40 font-mono"
                  />
                </div>
              </div>

              {/* Offline Download Package */}
              <div className="bg-[#181A21] border border-[#262932] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">
                      Offline Mobile Download File (Optional)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    {(activeVersion?.downloadStatus || 'ready').toUpperCase()}
                  </span>
                </div>

                <div className="border border-dashed border-[#262932] hover:border-emerald-500/40 rounded-xl p-4 text-center bg-[#111318]/60 transition-colors">
                  <Download className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-white">
                    {activeVersion?.downloadFileName || "Drop compressed mobile MP4"}
                  </p>
                  <p className="text-[10px] text-[#70737C] mt-0.5">Optimized for fast mobile phone download</p>
                  <input
                    type="file"
                    id="download-file-input"
                    className="hidden"
                    accept="video/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleUpdateActiveVersionFile('downloadFileName', e.target.files[0].name);
                      }
                    }}
                  />
                  <label
                    htmlFor="download-file-input"
                    className="mt-2.5 inline-block px-3 py-1.5 rounded-lg bg-[#262932] hover:bg-[#353945] text-white text-[11px] font-medium cursor-pointer transition-colors"
                  >
                    {activeVersion?.downloadFileName ? "Replace File" : "Choose File"}
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-[#A6A8B0] font-mono">File Name / Storage Key</label>
                  <input
                    type="text"
                    value={activeVersion?.downloadFileName || ''}
                    onChange={e => handleUpdateActiveVersionFile('downloadFileName', e.target.value)}
                    placeholder="e.g. movie_dj_mobile.mp4"
                    className="w-full bg-[#111318] border border-[#262932] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-emerald-500/40 font-mono"
                  />
                </div>
              </div>
            </div>
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
                <ContentCompletenessBadge
                  percent={completenessPercent}
                  checklist={checklist}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  {checklist.basicInfo ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="text-gray-300">Title &amp; Metadata</span>
                </div>
                <div className="flex items-center gap-2">
                  {checklist.poster ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  )}
                  <span className="text-gray-300">Poster Artwork</span>
                </div>
                <div className="flex items-center gap-2">
                  {checklist.backdrop ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="text-gray-300">Backdrop (16:9)</span>
                </div>
                <div className="flex items-center gap-2">
                  {checklist.categories ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  )}
                  <span className="text-gray-300">Categories</span>
                </div>
                <div className="flex items-center gap-2">
                  {checklist.djAssigned ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  )}
                  <span className="text-gray-300">DJ Editions ({versions.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  {checklist.streamingMedia ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="text-gray-300">Streaming Video</span>
                </div>
              </div>
            </div>

            {/* Summary card */}
            <div className="bg-[#181A21] border border-[#262932] rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">Summary</h3>
              <p className="text-xs text-[#A6A8B0]">
                <strong>{title || 'Untitled Movie'}</strong> ({releaseYear}) • {durationMinutes} min
              </p>
              
              <div className="space-y-1.5 pt-2 border-t border-[#262932]">
                <span className="text-[11px] font-mono text-[#A6A8B0] uppercase tracking-wider block">
                  Configured DJ Video Editions ({versions.length}):
                </span>
                <div className="flex flex-wrap gap-2">
                  {versions.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111318] border border-[#262932] text-xs"
                    >
                      <span className="font-semibold text-white">{v.djName}</span>
                      <span className={`text-[10px] font-mono ${v.streamingFileName ? 'text-emerald-400' : 'text-amber-400'}`}>
                        ({v.streamingFileName ? '✓ Video Attached' : '⚠ No Video'})
                      </span>
                    </div>
                  ))}
                  {versions.length === 0 && (
                    <span className="text-xs text-rose-400">No DJ editions configured</span>
                  )}
                </div>
              </div>

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
