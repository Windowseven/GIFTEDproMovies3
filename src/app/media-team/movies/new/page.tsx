'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Globe,
  Sparkles,
  FileVideo,
  Download,
  Image as ImageIcon,
  ShieldCheck,
  Lock,
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
  MovieVersionItem,
  MediaContentStatus,
  ContentReadinessChecklist,
} from '@/types/mediaTeam';
import { ContentCompletenessBadge } from '@/components/media-team/ContentCompletenessBadge';

const STEPS = [
  { step: 1, label: 'Title & Info' },
  { step: 2, label: 'Visual Artwork' },
  { step: 3, label: 'Taxonomies' },
  { step: 4, label: 'Translating DJ' },
  { step: 5, label: 'Media Files' },
  { step: 6, label: 'Review & Save' },
];

export default function MediaTeamCreateMoviePage() {
  const router = useRouter();
  const { role } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishingRequiresApproval, setPublishingRequiresApproval] = useState(true);

  useEffect(() => {
    adminRepository.isPublishingApprovalRequired().then(required => {
      setPublishingRequiresApproval(required);
    });
  }, []);

  // Step 1: Basic Information
  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [showOriginalTitle, setShowOriginalTitle] = useState(false);
  const [slug, setSlug] = useState('');
  const [releaseYear, setReleaseYear] = useState(new Date().getFullYear());
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [description, setDescription] = useState('');

  // Step 2: Visual Artwork
  const [posterUrl, setPosterUrl] = useState('');
  const [backdropUrl, setBackdropUrl] = useState('');
  const [trailerUrl, setTrailerUrl] = useState('');

  // Step 3: Taxonomies
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Action']);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['United States']);

  // Step 4: Translating DJ (Single DJ per movie release)
  const [selectedDjId, setSelectedDjId] = useState<string>('dj-afro');

  // Step 5: Media Files
  const [streamingStatus, setStreamingStatus] = useState<'ready' | 'processing' | 'not_available'>('ready');
  const [downloadStatus, setDownloadStatus] = useState<'ready' | 'processing' | 'not_available'>('ready');
  const [streamingFileName, setStreamingFileName] = useState('');
  const [downloadFileName, setDownloadFileName] = useState('');

  // Step 6: Status
  const [status, setStatus] = useState<MediaContentStatus>('DRAFT');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slug || slug === title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  // DJ Helper
  const currentDj = mockAvailableDjs.find(d => d.id === selectedDjId) || mockAvailableDjs[0];

  // Checklist & Completeness calculation
  const checklist: ContentReadinessChecklist = {
    basicInfo: Boolean(title.trim() && description.trim() && releaseYear && durationMinutes),
    poster: Boolean(posterUrl.trim()),
    backdrop: Boolean(backdropUrl.trim()),
    trailer: Boolean(trailerUrl.trim()),
    categories: selectedCategories.length > 0,
    countries: selectedCountries.length > 0,
    djAssigned: Boolean(selectedDjId),
    streamingMedia: streamingStatus === 'ready',
    downloadMedia: downloadStatus === 'ready',
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

    setIsSubmitting(true);
    try {
      const singleVersion: MovieVersionItem = {
        id: `ver-${selectedDjId}`,
        djId: currentDj.id,
        djName: currentDj.name,
        versionLabel: `${currentDj.name} Voiceover`,
        streamingFileName: streamingFileName.trim() || undefined,
        downloadFileName: downloadFileName.trim() || undefined,
        streamingStatus,
        downloadStatus,
        readinessStatus: 'ready',
      };

      await mediaTeamRepository.createMovie({
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
        versions: [singleVersion],
        streamingStatus,
        downloadStatus,
        completenessPercent,
        checklist,
        status: targetStatus,
      });

      showToast(`Movie "${title}" saved successfully with status ${targetStatus}!`);
      setTimeout(() => {
        router.push('/media-team/movies');
      }, 1000);
    } catch (err) {
      console.error(err);
      showToast('Error saving movie record.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
                New Title Intake
              </span>
              <span className="text-xs text-[#70737C] font-mono">
                Catalog Intake Wizard
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mt-1">
              Add New Movie
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
                3. Taxonomies & Classifications
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

        {/* STEP 4: Translating DJ (Embedded Audio Edition) */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-[#D6A84F]" />
                <h2 className="text-lg font-bold text-white">
                  4. Translating DJ (Initial Edition)
                </h2>
              </div>
              <p className="text-xs text-[#A6A8B0] mt-1">
                Select the DJ whose commentary is embedded into the initial video master. You can attach additional DJ editions after creation.
              </p>
            </div>

            {/* Embedded Audio Architecture Notice */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200/90 leading-relaxed">
                <span className="font-semibold text-amber-300">Embedded Video Architecture: </span>
                In Swahili cinema, DJ audio is permanently burned directly into the video audio stream. The video files you upload in Step 5 will be locked to this DJ&apos;s edition. If another DJ translated this movie, you will add their dedicated video file as another edition in the studio.
              </div>
            </div>

            {/* DJ Selector Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {mockAvailableDjs.map((dj) => {
                const isSelected = selectedDjId === dj.id;
                return (
                  <button
                    key={dj.id}
                    type="button"
                    onClick={() => setSelectedDjId(dj.id)}
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
                  <span className="text-[10px] font-mono uppercase text-[#70737C]">Selected Voice Artist</span>
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

        {/* STEP 5: Media Files */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-white">
                5. Media Assets &amp; Master Video Files ({currentDj.name} Edition)
              </h2>
              <p className="text-xs text-[#A6A8B0] mt-1">
                Attach the master translated video file and offline package for <strong className="text-[#D6A84F]">{currentDj.name}</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#181A21] border border-[#262932] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#D6A84F]" />
                <span className="text-xs text-[#A6A8B0]">Target Video Edition:</span>
                <span className="text-xs font-bold text-white">{currentDj.name} ({currentDj.dialect})</span>
              </div>
              <span className="text-[11px] font-mono text-[#A6A8B0] flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-400" /> Embedded Audio Track
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
                    {streamingStatus.toUpperCase()}
                  </span>
                </div>

                {/* Direct Dropzone */}
                <div className="border border-dashed border-[#262932] hover:border-blue-500/40 rounded-xl p-4 text-center bg-[#111318]/60 transition-colors">
                  <UploadCloud className="w-6 h-6 text-blue-400 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-white">
                    {streamingFileName ? streamingFileName : "Drop master video or click to select"}
                  </p>
                  <p className="text-[10px] text-[#70737C] mt-0.5">MP4, MKV up to 10 GB (1080p / 720p)</p>
                  <input
                    type="file"
                    id="streaming-file-input"
                    className="hidden"
                    accept="video/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setStreamingFileName(e.target.files[0].name);
                        setStreamingStatus('ready');
                      }
                    }}
                  />
                  <label
                    htmlFor="streaming-file-input"
                    className="mt-2.5 inline-block px-3 py-1.5 rounded-lg bg-[#262932] hover:bg-[#353945] text-white text-[11px] font-medium cursor-pointer transition-colors"
                  >
                    {streamingFileName ? "Replace File" : "Choose File"}
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-[#A6A8B0] font-mono">File Name / CDN Key</label>
                  <input
                    type="text"
                    value={streamingFileName}
                    onChange={e => setStreamingFileName(e.target.value)}
                    placeholder="e.g. the_beekeeper_swahili_master_1080p.mp4"
                    className="w-full bg-[#111318] border border-[#262932] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-blue-500/40 font-mono"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="text-xs text-[#A6A8B0]">Playback Status:</label>
                  <select
                    value={streamingStatus}
                    onChange={e =>
                      setStreamingStatus(e.target.value as 'ready' | 'processing' | 'not_available')
                    }
                    className="bg-[#111318] border border-[#262932] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                  >
                    <option value="ready">Ready for Streaming</option>
                    <option value="processing">Processing in Background</option>
                    <option value="not_available">Not Available</option>
                  </select>
                </div>
              </div>

              {/* Direct Offline Download Package */}
              <div className="bg-[#181A21] border border-[#262932] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">
                      Offline Download File (Mobile Package)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    {downloadStatus.toUpperCase()}
                  </span>
                </div>

                {/* Direct Dropzone */}
                <div className="border border-dashed border-[#262932] hover:border-emerald-500/40 rounded-xl p-4 text-center bg-[#111318]/60 transition-colors">
                  <Download className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-white">
                    {downloadFileName ? downloadFileName : "Drop offline download file or click to select"}
                  </p>
                  <p className="text-[10px] text-[#70737C] mt-0.5">Optimized MP4 (500MB – 1.8GB) for mobile storage</p>
                  <input
                    type="file"
                    id="download-file-input"
                    className="hidden"
                    accept="video/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setDownloadFileName(e.target.files[0].name);
                        setDownloadStatus('ready');
                      }
                    }}
                  />
                  <label
                    htmlFor="download-file-input"
                    className="mt-2.5 inline-block px-3 py-1.5 rounded-lg bg-[#262932] hover:bg-[#353945] text-white text-[11px] font-medium cursor-pointer transition-colors"
                  >
                    {downloadFileName ? "Replace File" : "Choose File"}
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-[#A6A8B0] font-mono">File Name / Storage Key</label>
                  <input
                    type="text"
                    value={downloadFileName}
                    onChange={e => setDownloadFileName(e.target.value)}
                    placeholder="e.g. the_beekeeper_offline_package.mp4"
                    className="w-full bg-[#111318] border border-[#262932] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-emerald-500/40 font-mono"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="text-xs text-[#A6A8B0]">Download Status:</label>
                  <select
                    value={downloadStatus}
                    onChange={e =>
                      setDownloadStatus(e.target.value as 'ready' | 'processing' | 'not_available')
                    }
                    className="bg-[#111318] border border-[#262932] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                  >
                    <option value="ready">Ready for Download</option>
                    <option value="processing">Processing in Background</option>
                    <option value="not_available">Not Available</option>
                  </select>
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
                6. Content Readiness & Publishing Review
              </h2>
              <p className="text-xs text-[#A6A8B0] mt-1">
                Verify all catalog requirements before saving to catalog or submitting for review.
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
                  <span className="text-gray-300">Title & Metadata</span>
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
                  <span className="text-gray-300">Translating DJ</span>
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
                  Initial DJ Video Edition:
                </span>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#111318] border border-[#262932] text-xs">
                  <span className="font-semibold text-white">{currentDj.name}</span>
                  <span className="text-[10px] text-[#A6A8B0] font-mono">({currentDj.dialect})</span>
                  <span className={`ml-auto text-[10px] font-mono ${streamingFileName ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {streamingFileName ? `✓ ${streamingFileName}` : '⚠ Video file pending'}
                  </span>
                </div>
                <p className="text-[11px] text-[#70737C] italic">
                  Note: Additional DJ editions (e.g. DJ Afro, DJ Murphy) can be added anytime in the Movie Studio once this record is created.
                </p>
              </div>

              <p className="text-xs text-[#70737C]">
                Categories: {selectedCategories.join(', ') || 'None selected'}
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
