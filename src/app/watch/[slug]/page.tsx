'use client';

import React, { useState, useRef, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import { getMovieBySlug, customerMovies } from '@/data/mock/customerData';
import { useCustomer } from '@/context/CustomerContext';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  ArrowLeft,
  Settings,
  Mic,
  Film,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ChevronRight,
  Info,
} from 'lucide-react';
import { LipaModal } from '@/components/customer/LipaModal';
import { CustomerFooter } from '@/components/customer/CustomerFooter';

interface WatchPageProps {
  params: Promise<{ slug: string }>;
}

export default function WatchMoviePage({ params }: WatchPageProps) {
  const { slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const djQuery = searchParams.get('dj');

  const movie = getMovieBySlug(slug);
  const { entitlements, profile, openLipa } = useCustomer();

  if (!movie) {
    notFound();
  }

  // Determine active DJ version
  const matchingVersion =
    movie.versions?.find(
      (v) =>
        (djQuery && v.djName.toLowerCase() === djQuery.toLowerCase()) ||
        (djQuery && v.djId.toLowerCase() === djQuery.toLowerCase())
    ) ||
    movie.versions?.[0] || {
      id: 'v-default',
      djName: movie.availableDjs?.[0] || 'DJ Afro Amigo',
      streamingPriceTsh: movie.streamPriceTsh || 1500,
      downloadPriceTsh: movie.downloadPriceTsh || 2500,
      accessDurationHours: 48,
    };

  const [activeVersion, setActiveVersion] = useState(matchingVersion);

  // Check if customer is entitled to watch (stream pass, download license, or VIP)
  const isUnlocked =
    profile.isVip ||
    entitlements.some(
      (e) =>
        e.isActive &&
        (e.itemSlug === movie.slug ||
          e.itemTitle.toLowerCase() === movie.title.toLowerCase()) &&
        (e.accessType === 'stream' || e.accessType === 'vip_pass')
    );

  // Video player state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(145); // simulated starting progress
  const [duration, setDuration] = useState<number>(movie.durationMinutes * 60);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [selectedQuality, setSelectedQuality] = useState<'Auto (1080p)' | '1080p FHD' | '720p HD' | '480p SD'>('Auto (1080p)');
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Format time (seconds -> HH:MM:SS)
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Auto-hide controls when mouse stops moving
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSettingsMenu(false);
      }
    }, 3200);
  };

  // Play / Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Skip time (+/- seconds)
  const skipTime = (amount: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + amount));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Volume change
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
    }
    if (newVol === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
      if (volume === 0) setVolume(0.5);
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Scrubber click / drag
  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft' || e.key === 'j') {
        e.preventDefault();
        skipTime(-10);
      } else if (e.code === 'ArrowRight' || e.key === 'l') {
        e.preventDefault();
        skipTime(10);
      } else if (e.key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm') {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted, isFullscreen, duration]);

  // Video time update event
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const onLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Other DJ editions for switcher
  const otherVersions = movie.versions?.filter((v) => v.id !== activeVersion.id) || [];

  return (
    <div className="min-h-screen bg-[#060709] text-white flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      {/* Lipa Checkout Modal */}
      <LipaModal />

      {/* Main Cinema Player Container */}
      <div
        ref={playerContainerRef}
        onMouseMove={handleMouseMove}
        className="relative w-full aspect-video max-h-[85vh] bg-black overflow-hidden flex items-center justify-center select-none group"
      >
        {/* Real HTML5 Video element */}
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          autoPlay
          poster={movie.backdropUrl}
          src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
          onClick={togglePlay}
        />

        {/* Access Gate Overlay (If not entitled and preview expired) */}
        {!isUnlocked && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
            <div className="w-16 h-16 rounded-3xl bg-[#E50914]/20 border border-[#E50914]/50 flex items-center justify-center text-[#E50914] mb-4 shadow-xl">
              <Lock className="w-8 h-8" />
            </div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#D6A84F] font-bold">
              Pay-Per-View Cinema Pass Required
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 max-w-md">
              {movie.title}
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 mt-2 max-w-md leading-relaxed">
              Unlock instant high-speed streaming for the <strong className="text-[#D6A84F]">{activeVersion.djName} Edition</strong> with full Swahili translation commentary.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
              <button
                onClick={() =>
                  openLipa({
                    itemTitle: movie.title,
                    itemType: 'movie',
                    accessType: 'stream',
                    amountTsh: activeVersion.streamingPriceTsh || 1500,
                    djName: activeVersion.djName,
                    durationLabel: '48 Hours Access Pass',
                    itemSlug: movie.slug,
                  })
                }
                className="px-6 py-3.5 rounded-2xl bg-[#E50914] hover:bg-[#B11226] text-white font-bold text-sm flex items-center gap-2 shadow-2xl shadow-[#E50914]/30 hover:scale-105 transition-transform"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>LIPA Sasa • TSh {(activeVersion.streamingPriceTsh || 1500).toLocaleString()}</span>
              </button>
              <Link
                href={`/movies/${movie.slug}`}
                className="px-5 py-3.5 rounded-2xl bg-[#181A21] hover:bg-[#262932] text-gray-300 font-semibold text-xs border border-[#262932] transition-colors"
              >
                Back to Movie Info
              </Link>
            </div>
          </div>
        )}

        {/* TOP BAR OVERLAY */}
        <div
          className={`absolute top-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-b from-black/90 via-black/50 to-transparent z-30 transition-opacity duration-300 flex items-center justify-between ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href={`/movies/${movie.slug}`}
              className="p-2.5 rounded-full bg-black/60 hover:bg-[#E50914] text-white backdrop-blur-md border border-white/20 transition-all hover:scale-105"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-white tracking-wide">
                  {movie.title}
                </span>
                <span className="text-[10px] font-mono text-gray-400 hidden sm:inline">
                  ({movie.releaseYear})
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-2 py-0.5 rounded-md bg-[#D6A84F]/20 text-[#D6A84F] border border-[#D6A84F]/40 text-[10px] font-mono font-bold flex items-center gap-1">
                  <Mic className="w-3 h-3" />
                  <span>{activeVersion.djName} (Embedded Audio)</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 hidden md:inline">
                  • Crystal Clear HD Stereo
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="px-2 py-0.5 rounded bg-white/10 backdrop-blur-md text-[10px] font-mono text-gray-300 border border-white/20">
              {movie.ageRating || '18+'}
            </span>
          </div>
        </div>

        {/* BIG CENTER PLAY/PAUSE TRIGGER */}
        <button
          onClick={togglePlay}
          className={`absolute w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/60 hover:bg-[#E50914]/80 text-white backdrop-blur-md border-2 border-white/20 flex items-center justify-center z-20 transition-all duration-200 hover:scale-110 active:scale-95 ${
            showControls ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
          }`}
        >
          {isPlaying ? (
            <Pause className="w-8 h-8 fill-current" />
          ) : (
            <Play className="w-8 h-8 fill-current ml-1" />
          )}
        </button>

        {/* BOTTOM CONTROLS OVERLAY */}
        <div
          className={`absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent z-30 transition-opacity duration-300 space-y-3 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Interactive Scrubber Bar */}
          <div className="relative group/scrubber cursor-pointer">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleScrubberChange}
              className="w-full h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-[#E50914] group-hover/scrubber:h-2.5 transition-all"
            />
            {/* Visual Red Progress Track */}
            <div
              className="absolute top-0 left-0 h-1.5 group-hover/scrubber:h-2.5 bg-[#E50914] rounded-l-lg pointer-events-none transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Left Controls: Play, Skips, Volume, Time */}
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={togglePlay}
                className="p-2 rounded-xl text-white hover:text-[#E50914] transition-colors"
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current" />
                )}
              </button>

              <button
                onClick={() => skipTime(-10)}
                className="p-2 rounded-xl text-gray-300 hover:text-white transition-colors"
                title="Rewind 10s (Left Arrow)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => skipTime(10)}
                className="p-2 rounded-xl text-gray-300 hover:text-white transition-colors"
                title="Forward 10s (Right Arrow)"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Volume Slider */}
              <div className="flex items-center gap-1.5 group/volume">
                <button
                  onClick={toggleMute}
                  className="p-2 text-gray-300 hover:text-white transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-14 sm:w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>

              {/* Timestamp */}
              <div className="text-[11px] font-mono text-gray-300 hidden sm:inline-block">
                <span>{formatTime(currentTime)}</span>
                <span className="text-gray-500 mx-1">/</span>
                <span className="text-gray-400">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right Controls: Quality, Fullscreen */}
            <div className="flex items-center gap-2 sm:gap-3 relative">
              {/* Settings / Resolution Button */}
              <div className="relative">
                <button
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-mono flex items-center gap-1.5 transition-colors border border-white/10"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{selectedQuality}</span>
                </button>

                {/* Settings Popup Menu */}
                {showSettingsMenu && (
                  <div className="absolute bottom-10 right-0 w-44 bg-[#111318] border border-[#262932] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in space-y-1">
                    <p className="text-[10px] font-mono uppercase text-gray-400 px-2 py-1">
                      Stream Resolution
                    </p>
                    {(['Auto (1080p)', '1080p FHD', '720p HD', '480p SD'] as const).map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          setSelectedQuality(q);
                          setShowSettingsMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between transition-colors ${
                          selectedQuality === q
                            ? 'bg-[#E50914] text-white font-bold'
                            : 'text-gray-300 hover:bg-[#181A21]'
                        }`}
                      >
                        <span>{q}</span>
                        {selectedQuality === q && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                className="p-2 text-gray-300 hover:text-white transition-colors"
                title="Fullscreen (F)"
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4" />
                ) : (
                  <Maximize className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BELOW-PLAYER SECTION: Movie Details & DJ Edition Switcher */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-8 pb-8 border-b border-[#262932]">
          {/* Left: Movie Info */}
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Active 48h Streaming Pass</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-[#181A21] border border-[#262932] text-xs font-mono text-gray-400">
                {movie.durationMinutes} min
              </span>
              <span className="px-2 py-0.5 rounded bg-[#181A21] border border-[#262932] text-xs font-mono text-gray-400">
                {movie.genres.join(', ')}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white">
              {movie.title}
            </h1>

            <p className="text-sm text-gray-300 leading-relaxed">
              {movie.description}
            </p>

            <div className="pt-2 flex items-center gap-4 text-xs font-mono text-gray-400">
              <span>Origin: {movie.countries.join(', ')}</span>
              <span>•</span>
              <span>Year: {movie.releaseYear}</span>
              <span>•</span>
              <span className="text-[#D6A84F]">Translation: {activeVersion.djName}</span>
            </div>
          </div>

          {/* Right: Switch DJ Edition (If available) */}
          <div className="w-full lg:w-80 shrink-0 p-5 rounded-3xl bg-[#111318] border border-[#262932] space-y-4">
            <div>
              <span className="text-[10px] font-mono text-[#D6A84F] uppercase tracking-wider block font-bold">
                Embedded Audio Edition
              </span>
              <h3 className="text-sm font-bold text-white mt-0.5">
                Current: {activeVersion.djName}
              </h3>
              <p className="text-[11px] text-gray-400 mt-1">
                Swahili commentary is recorded directly into this video file.
              </p>
            </div>

            {otherVersions.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#262932]">
                <span className="text-[10px] font-mono text-gray-400 uppercase block">
                  Other Available DJ Editions:
                </span>
                <div className="space-y-1.5">
                  {otherVersions.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setActiveVersion(v);
                        router.push(`/watch/${movie.slug}?dj=${encodeURIComponent(v.djName)}`);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#181A21] hover:bg-[#262932] border border-[#262932] text-left text-xs flex items-center justify-between transition-colors"
                    >
                      <span className="font-semibold text-white">{v.djName} Edition</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-[#262932] flex items-center justify-between text-xs">
              <Link
                href={`/movies/${movie.slug}`}
                className="text-[#E50914] hover:underline font-semibold"
              >
                Movie Details &amp; Cast →
              </Link>
              <Link
                href="/library"
                className="text-gray-400 hover:text-white"
              >
                My Library
              </Link>
            </div>
          </div>
        </div>

        {/* More Like This Shelf */}
        <div className="space-y-4 pt-4">
          <h3 className="text-lg font-bold text-white">Recommended Movies with Swahili DJ</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {customerMovies
              .filter((m) => m.slug !== movie.slug)
              .slice(0, 6)
              .map((rec) => (
                <Link
                  key={rec.id}
                  href={`/movies/${rec.slug}`}
                  className="group rounded-2xl bg-[#111318] border border-[#262932] hover:border-[#E50914]/50 overflow-hidden shadow-lg transition-all"
                >
                  <div className="aspect-[2/3] relative overflow-hidden bg-neutral-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={rec.posterUrl}
                      alt={rec.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-2.5 space-y-1">
                    <p className="text-[10px] font-mono text-[#D6A84F] truncate">
                      {rec.availableDjs?.[0] || 'DJ Afro'}
                    </p>
                    <h4 className="text-xs font-bold text-white truncate">{rec.title}</h4>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </div>

      <CustomerFooter />
    </div>
  );
}
