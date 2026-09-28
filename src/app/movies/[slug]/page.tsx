'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { ContentRail } from '@/components/customer/ContentRail';
import { TrailerModal } from '@/components/customer/TrailerModal';
import { LipaModal } from '@/components/customer/LipaModal';
import { SearchDrawer } from '@/components/customer/SearchDrawer';
import { getMovieBySlug, customerMovies } from '@/data/mock/customerData';
import { useCustomer } from '@/context/CustomerContext';
import {
  Play,
  Download,
  Film,
  Star,
  Clock,
  Mic,
  ShieldCheck,
  CheckCircle2,
  Share2,
  Calendar,
  Globe,
  Sparkles,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface MovieDetailsPageProps {
  params: Promise<{ slug: string }>;
}

export default function MovieDetailsPage({ params }: MovieDetailsPageProps) {
  const { slug } = use(params);
  const movie = getMovieBySlug(slug);
  const { openLipa, openTrailer, entitlements, profile } = useCustomer();

  // If movie slug does not exist, return 404
  if (!movie) {
    notFound();
  }

  // Version selection state (default to first version or fallback)
  const defaultVersion = movie.versions && movie.versions.length > 0 ? movie.versions[0] : null;
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    defaultVersion ? defaultVersion.id : 'v-default'
  );

  const activeVersion =
    movie.versions?.find((v) => v.id === selectedVersionId) || {
      id: 'v-default',
      djName: movie.availableDjs?.[0] || 'Swahili DJ Dub',
      streamingPriceTsh: movie.streamPriceTsh || 1500,
      downloadPriceTsh: movie.downloadPriceTsh || 2500,
      accessDurationHours: 48,
    };

  const streamPrice = activeVersion.streamingPriceTsh || movie.streamPriceTsh || 1500;
  const downloadPrice = activeVersion.downloadPriceTsh || movie.downloadPriceTsh || 2500;
  const accessDuration = activeVersion.accessDurationHours || 48;

  // Access checks
  const isVip = profile.isVip;
  const hasStreamAccess =
    isVip ||
    entitlements.some(
      (e) =>
        e.isActive &&
        (e.itemSlug === movie.slug || e.itemTitle.toLowerCase() === movie.title.toLowerCase()) &&
        (e.accessType === 'stream' || e.accessType === 'vip_pass')
    );

  const hasDownloadAccess =
    isVip ||
    entitlements.some(
      (e) =>
        e.isActive &&
        (e.itemSlug === movie.slug || e.itemTitle.toLowerCase() === movie.title.toLowerCase()) &&
        e.accessType === 'download'
    );

  const handleTriggerDownload = () => {
    const filename = `${movie.slug}_${activeVersion.djName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_mobile.mp4`;
    const blob = new Blob([`GIFTEDproMovies Offline Package: ${movie.title} (${activeVersion.djName})`], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Related movies
  const relatedMovies = customerMovies.filter(
    (m) => m.id !== movie.id && m.genres.some((g) => movie.genres.includes(g))
  );

  // More from this DJ
  const djMovies = customerMovies.filter(
    (m) => m.id !== movie.id && m.availableDjs && m.availableDjs.includes(activeVersion.djName)
  );

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      <CustomerHeader />

      <main className="flex-1 pb-16 space-y-10">
        {/* 1. Cinematic Hero Section with Backdrop Image */}
        <div className="relative w-full min-h-[600px] lg:min-h-[680px] overflow-hidden bg-[#08090C] flex flex-col justify-end">
          {/* Backdrop Image with Slow Ken-Burns Scale */}
          <div
            className="absolute inset-0 bg-cover bg-center animate-kenburns"
            style={{ backgroundImage: `url(${movie.backdropUrl})` }}
          />

          {/* Scrim Overlays */}
          <div className="absolute inset-0 scrim-hero z-10 pointer-events-none" />
          <div className="absolute inset-0 scrim-bottom z-10 pointer-events-none" />

          {/* Hero Content Grid: Poster + Main Details */}
          <div className="relative z-20 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-32 pb-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-mono text-gray-400 mb-6">
              <Link href="/" className="hover:text-white">Home</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link href="/movies" className="hover:text-white">Movies</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-white font-bold truncate">{movie.title}</span>
            </div>

            <div className="flex flex-col md:flex-row items-start gap-8 lg:gap-12">
              {/* 2:3 Portrait Poster */}
              <div className="shrink-0 w-48 sm:w-60 md:w-64 aspect-[2/3] rounded-3xl overflow-hidden bg-[#111318] border-2 border-white/10 shadow-2xl shadow-black/80 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/20 text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current text-amber-400" />
                  <span>{movie.rating}</span>
                </div>
              </div>

              {/* Movie Info & Actions */}
              <div className="flex-1 space-y-4 max-w-3xl">
                {/* Tags */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-[#E50914] text-white text-[11px] font-mono font-black uppercase tracking-wider">
                    Swahili Commentary
                  </span>
                  <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono text-gray-300">
                    {movie.ageRating || '18+'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono text-gray-300">
                    4K UHD
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none">
                  {movie.title}
                </h1>
                {movie.originalTitle && movie.originalTitle !== movie.title && (
                  <p className="text-sm font-mono text-gray-400">
                    Original Title: <span className="text-white">{movie.originalTitle}</span>
                  </p>
                )}

                {/* Metadata Line */}
                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-mono text-gray-300">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>{movie.releaseYear}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>{movie.durationMinutes} minutes</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-gray-400" />
                    <span>{movie.countries.join(', ')}</span>
                  </span>
                </div>

                {/* Genres */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {movie.genres.map((genre) => (
                    <Link
                      key={genre}
                      href={`/categories/${genre.toLowerCase()}`}
                      className="px-3 py-1 rounded-xl bg-[#111318]/90 border border-[#262932] hover:border-[#E50914]/50 text-xs font-semibold text-gray-300 hover:text-white transition-colors"
                    >
                      {genre}
                    </Link>
                  ))}
                </div>

                {/* Description */}
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed pt-1">
                  {movie.description}
                </p>

                {/* Actions: Play if Unlocked / Watch Trailer */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  {hasStreamAccess && (
                    <Link
                      href={`/watch/${movie.slug}?dj=${encodeURIComponent(activeVersion.djName)}`}
                      className="px-6 py-2.5 rounded-full bg-[#E50914] hover:bg-[#B11226] text-white text-xs font-bold flex items-center gap-2 shadow-xl shadow-[#E50914]/30 transition-all hover:scale-105 active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Play Movie ({activeVersion.djName})</span>
                    </Link>
                  )}
                  <button
                    onClick={() => openTrailer(movie.title)}
                    className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 backdrop-blur-md border border-white/20 transition-all active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Watch Official Trailer</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. DJ / Translator Version Selection & Watch vs Download Area */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-[#111318] border border-[#262932] shadow-2xl space-y-6">
            {/* Version Header & Switcher */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-[#D6A84F] font-bold flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5" />
                    <span>Select DJ Video Edition</span>
                  </p>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    Available DJ Editions
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-xl">
                    Each DJ edition features full Swahili commentary recorded directly into the movie file. Choose your preferred DJ below.
                  </p>
                </div>
                <span className="text-xs font-mono text-gray-400 hidden sm:inline">
                  {movie.versions?.length || movie.availableDjs?.length || 1} Editions Available
                </span>
              </div>

              {/* DJ / Version Tabs */}
              <div className="flex flex-wrap gap-2.5 pt-2">
                {movie.versions && movie.versions.length > 0 ? (
                  movie.versions.map((ver) => {
                    const isSelected = selectedVersionId === ver.id;
                    return (
                      <button
                        key={ver.id}
                        type="button"
                        onClick={() => setSelectedVersionId(ver.id)}
                        className={`px-4 py-2.5 rounded-2xl border text-left transition-all duration-200 flex items-center gap-3 ${
                          isSelected
                            ? 'bg-[#181A21] border-[#E50914] text-white shadow-lg shadow-[#E50914]/15 scale-[1.02]'
                            : 'bg-[#0E1015] border-[#262932] text-gray-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full ${
                            isSelected ? 'bg-[#E50914] animate-pulse' : 'bg-gray-600'
                          }`}
                        />
                        <div>
                          <p className="text-xs font-bold">{ver.djName}</p>
                          <p className="text-[10px] font-mono text-gray-500">
                            TSh {ver.streamingPriceTsh.toLocaleString()} Stream • {ver.accessDurationHours}h Pass
                          </p>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  (movie.availableDjs || []).map((dj, idx) => (
                    <button
                      key={dj}
                      type="button"
                      onClick={() => setSelectedVersionId(`v-${idx}`)}
                      className="px-4 py-2.5 rounded-2xl bg-[#181A21] border border-[#E50914] text-white text-xs font-bold"
                    >
                      {dj}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Active Unlocked Pass Banner */}
            {hasStreamAccess && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Active Cinema Pass Unlocked</h4>
                    <p className="text-[11px] text-gray-300">
                      Your streaming pass is active. Watch {movie.title} with {activeVersion.djName} commentary on any device.
                    </p>
                  </div>
                </div>
                <Link
                  href={`/watch/${movie.slug}?dj=${encodeURIComponent(activeVersion.djName)}`}
                  className="shrink-0 px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#B11226] text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#E50914]/20 transition-all hover:scale-105"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume Streaming Now</span>
                </Link>
              </div>
            )}

            {/* Watch vs Download Purchase Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-4 border-t border-[#262932]">
              {/* Option 1: STREAM ONLINE */}
              <div className="p-6 rounded-2xl bg-[#0E1015] border border-[#262932] hover:border-white/20 transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase ${hasStreamAccess ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}`}>
                      {hasStreamAccess ? '✓ Pass Active' : 'Stream Online'}
                    </span>
                    <span className="text-xs font-mono text-gray-400">
                      Access: {accessDuration} Hours
                    </span>
                  </div>

                  <h4 className="text-lg font-bold text-white">
                    HD &amp; 4K Instant Streaming
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Watch instantly on any device (phone, tablet, TV, PC) with zero download delay. Includes full {activeVersion.djName} commentary edition.
                  </p>

                  <div className="pt-2">
                    <span className="text-[10px] font-mono text-gray-500 uppercase block">
                      {hasStreamAccess ? 'Access Status' : 'Rental Price'}
                    </span>
                    <p className="text-2xl font-black text-emerald-400 font-mono">
                      {hasStreamAccess ? 'UNLOCKED' : `TSh ${streamPrice.toLocaleString()}`}
                    </p>
                  </div>
                </div>

                {hasStreamAccess ? (
                  <Link
                    href={`/watch/${movie.slug}?dj=${encodeURIComponent(activeVersion.djName)}`}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#E50914] hover:bg-[#B11226] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-[#E50914]/25 transition-transform active:scale-98"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>PLAY MOVIE ({activeVersion.djName})</span>
                  </Link>
                ) : (
                  <button
                    onClick={() =>
                      openLipa({
                        itemTitle: movie.title,
                        itemType: 'movie',
                        accessType: 'stream',
                        amountTsh: streamPrice,
                        djName: activeVersion.djName,
                        durationLabel: `${accessDuration} Hours Access`,
                        itemSlug: movie.slug,
                      })
                    }
                    className="w-full py-3.5 px-4 rounded-xl bg-[#E50914] hover:bg-[#B11226] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-[#E50914]/25 transition-transform active:scale-98"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>WATCH / LIPA TSh {streamPrice.toLocaleString()}</span>
                  </button>
                )}
              </div>

              {/* Option 2: DOWNLOAD FOR OFFLINE */}
              <div className="p-6 rounded-2xl bg-[#0E1015] border border-[#262932] hover:border-white/20 transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase ${hasDownloadAccess ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'}`}>
                      {hasDownloadAccess ? '✓ License Active' : 'Offline Download'}
                    </span>
                    <span className="text-xs font-mono text-gray-400">
                      Access: 7 Days Offline
                    </span>
                  </div>

                  <h4 className="text-lg font-bold text-white">
                    Save to Device for Offline Play
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Download full high-speed MP4 file with embedded Swahili audio track for travel, commutes, and data-free playback anytime.
                  </p>

                  <div className="pt-2">
                    <span className="text-[10px] font-mono text-gray-500 uppercase block">
                      {hasDownloadAccess ? 'Download Status' : 'Download License'}
                    </span>
                    <p className="text-2xl font-black text-blue-400 font-mono">
                      {hasDownloadAccess ? 'READY TO SAVE' : `TSh ${downloadPrice.toLocaleString()}`}
                    </p>
                  </div>
                </div>

                {hasDownloadAccess ? (
                  <button
                    onClick={handleTriggerDownload}
                    className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-blue-600/25 transition-transform active:scale-98"
                  >
                    <Download className="w-4 h-4" />
                    <span>DOWNLOAD MOBILE MP4</span>
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      openLipa({
                        itemTitle: movie.title,
                        itemType: 'movie',
                        accessType: 'download',
                        amountTsh: downloadPrice,
                        djName: activeVersion.djName,
                        durationLabel: '7 Days Offline License',
                        itemSlug: movie.slug,
                      })
                    }
                    className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-[#08090C] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-transform active:scale-98 shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span>DOWNLOAD / LIPA TSh {downloadPrice.toLocaleString()}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Version Ownership Reminder Alert */}
            <div className="p-3.5 rounded-xl bg-[#181A21] border border-[#262932] flex items-center gap-3 text-xs text-gray-400">
              <CheckCircle2 className="w-4 h-4 text-[#D6A84F] shrink-0" />
              <span>
                You are purchasing the <strong className="text-white">{activeVersion.djName}</strong> edition. Each DJ commentary edition is an independent translation release.
              </span>
            </div>
          </div>
        </section>

        {/* 3. Playback & Quality Card */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 rounded-3xl bg-[#111318] border border-[#262932] space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Playback &amp; Quality
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-[#181A21] border border-[#262932] space-y-1">
                <span className="text-gray-500 text-[10px] block uppercase font-medium">Language &amp; DJ</span>
                <span className="text-white font-bold block truncate">{activeVersion.djName} (Swahili)</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#181A21] border border-[#262932] space-y-1">
                <span className="text-gray-500 text-[10px] block uppercase font-medium">Video Quality</span>
                <span className="text-white font-bold block">Full HD &amp; 4K Ultra HD</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#181A21] border border-[#262932] space-y-1">
                <span className="text-gray-500 text-[10px] block uppercase font-medium">Sound Quality</span>
                <span className="text-white font-bold block">Crystal Clear Voice (HD Stereo)</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#181A21] border border-[#262932] space-y-1">
                <span className="text-gray-500 text-[10px] block uppercase font-medium">Watch Options</span>
                <span className="text-emerald-400 font-bold block">Stream Online &amp; Download</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Related Content Rails */}
        {relatedMovies.length > 0 && (
          <ContentRail
            title="More Like This"
            subtitle={`Related ${movie.genres[0]} Titles`}
            movies={relatedMovies}
          />
        )}

        {djMovies.length > 0 && (
          <ContentRail
            title={`More by ${activeVersion.djName}`}
            subtitle="Commentator Collection"
            movies={djMovies}
          />
        )}
      </main>

      <TrailerModal />
      <LipaModal />
      <SearchDrawer />
      <CustomerFooter />
    </div>
  );
}
