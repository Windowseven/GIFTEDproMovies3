'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { catalogApi } from '@/lib/api/catalogApi';
import { downloadApi } from '@/lib/api/downloadApi';
import { useAuth } from '@/context/AuthContext';
import { MovieItem } from '@/types/customer';
import {
  Download,
  ArrowLeft,
  Mic,
  Film,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Radio,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { CustomerHeader } from '@/components/customer/CustomerHeader';

interface WatchPageProps {
  params: Promise<{ slug: string }>;
}

export default function WatchMoviePage({ params }: WatchPageProps) {
  const { slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const djQuery = searchParams.get('dj');
  const { isAuthenticated } = useAuth();

  const [movie, setMovie] = useState<MovieItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notFoundState, setNotFoundState] = useState<boolean>(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('v-default');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<{ message: string; isError: boolean } | null>(null);

  useEffect(() => {
    let isCancelled = false;
    async function loadMovie() {
      setIsLoading(true);
      setNotFoundState(false);
      try {
        const detail = await catalogApi.getTitleBySlug(slug).catch(() => null);
        if (!detail) {
          if (!isCancelled) setNotFoundState(true);
          return;
        }

        const versionsList =
          detail.editions && detail.editions.length > 0
            ? detail.editions.map((ed) => ({
                id: ed.id,
                djId: ed.dj.id,
                djName: ed.dj.stageName || 'Swahili DJ Dub',
                streamingPriceTsh: 1500,
                downloadPriceTsh: 2500,
                accessDurationHours: 48,
                streamingStatus: 'streaming_ready' as const,
                downloadStatus: 'download_ready' as const,
                isDefault: ed.isDefault,
              }))
            : [
                {
                  id: 'v-default',
                  djId: 'dj-murphy',
                  djName: 'DJ Murphy',
                  streamingPriceTsh: 1500,
                  downloadPriceTsh: 2500,
                  accessDurationHours: 48,
                  streamingStatus: 'streaming_ready' as const,
                  downloadStatus: 'download_ready' as const,
                  isDefault: true,
                },
              ];

        const mapped: MovieItem = {
          id: detail.id,
          title: detail.title,
          originalTitle: detail.originalTitle || detail.title,
          slug: detail.slug,
          releaseYear: detail.releaseYear || 2024,
          durationMinutes: detail.durationMinutes || 120,
          posterUrl: detail.posterUrl || '/images/placeholders/movie_card_empty.svg',
          backdropUrl: detail.backdropUrl || '/images/placeholders/movie_card_empty.svg',
          trailerUrl: detail.trailerUrl || undefined,
          description: detail.description || 'African cinematic translation release.',
          genres: (detail.categories || []).map((c) => c.name),
          countries: (detail.countries || []).map((c) => c.name),
          ageRating: '16+',
          rating: 8.5,
          streamingStatus: 'streaming_ready',
          downloadStatus: 'download_ready',
          status: 'published',
          isFeatured: false,
          isTrending: false,
          viewsCount: 0,
          purchasesCount: 0,
          downloadsCount: 0,
          publishedAt: detail.publishedAt || new Date().toISOString(),
          versions: versionsList,
        };

        if (!isCancelled) {
          setMovie(mapped);
          if (djQuery) {
            const matched = versionsList.find(
              (v) =>
                v.djName.toLowerCase() === djQuery.toLowerCase() ||
                v.djId.toLowerCase() === djQuery.toLowerCase()
            );
            if (matched) {
              setSelectedVersionId(matched.id);
            } else if (versionsList.length > 0) {
              setSelectedVersionId(versionsList[0].id);
            }
          } else if (versionsList.length > 0) {
            setSelectedVersionId(versionsList[0].id);
          }
        }
      } catch {
        if (!isCancelled) setNotFoundState(true);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadMovie();
    return () => {
      isCancelled = true;
    };
  }, [slug, djQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col font-sans">
        <CustomerHeader />
        <main className="flex-1 flex flex-col items-center justify-center py-32 space-y-4">
          <RefreshCw className="w-8 h-8 text-[#E50914] animate-spin" />
          <p className="text-xs font-mono text-gray-400">Loading cinema stream authorization...</p>
        </main>
        <CustomerFooter />
      </div>
    );
  }

  if (notFoundState || !movie) {
    return (
      <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col font-sans">
        <CustomerHeader />
        <main className="flex-1 flex flex-col items-center justify-center py-32 space-y-4 px-4 text-center">
          <Film className="w-12 h-12 text-gray-600" />
          <h1 className="text-xl font-bold text-white">Movie Not Found</h1>
          <p className="text-xs text-gray-400 max-w-sm">
            The requested title is not currently available for viewing.
          </p>
          <Link
            href="/movies"
            className="px-5 py-2.5 rounded-full bg-[#E50914] text-white text-xs font-bold shadow-lg shadow-[#E50914]/20 hover:scale-105 transition-transform"
          >
            Return to Movies
          </Link>
        </main>
        <CustomerFooter />
      </div>
    );
  }

  const activeVersion =
    movie.versions.find((v) => v.id === selectedVersionId) ||
    movie.versions[0] || {
      id: 'v-default',
      djId: 'dj-murphy',
      djName: 'Swahili DJ Dub',
      streamingPriceTsh: 1500,
      downloadPriceTsh: 2500,
      accessDurationHours: 48,
      streamingStatus: 'streaming_ready' as const,
      downloadStatus: 'download_ready' as const,
      isDefault: true,
    };

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadNotice(null);
    let attemptId: string | undefined;

    try {
      const editionId = activeVersion.id && !activeVersion.id.startsWith('v-') ? activeVersion.id : undefined;
      const res = await downloadApi.authorizeDownload({
        contentId: movie.id,
        editionId,
      });

      attemptId = res.attemptId;
      if (!res.authorized || !res.downloadUrl) {
        throw new Error('Download authorization was not granted. Please check active passes.');
      }

      const link = document.createElement('a');
      link.href = res.downloadUrl;
      link.download = res.fileName || (movie.slug + '_mobile.mp4');
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      await downloadApi.reportDelivery(res.attemptId, 'COMPLETED');
      setDownloadNotice({
        message: 'Offline download started for "' + movie.title + '". Valid for 900s.',
        isError: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Download authorization failed. Active pass or entitlement required.';
      setDownloadNotice({ message: msg, isError: true });
      if (attemptId) {
        try {
          await downloadApi.reportDelivery(attemptId, 'FAILED', msg);
        } catch {
          // ignore
        }
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      <CustomerHeader />

      {/* PLAYER BANNER AREA */}
      <div className="relative w-full aspect-video max-h-[70vh] bg-black overflow-hidden flex items-center justify-center">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 blur-sm scale-105"
          style={{ backgroundImage: 'url(' + movie.backdropUrl + ')' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060709] via-black/80 to-black/90 z-10" />

        {/* Phase 8 Streaming Lockout Notice Card */}
        <div className="relative z-20 max-w-xl mx-auto px-6 py-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-[#E50914]/20 border border-[#E50914]/50 flex items-center justify-center text-[#E50914] mx-auto shadow-2xl">
            <Radio className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono font-bold uppercase text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phase 8 Feature • Coming Soon</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Online Cinema Streaming (HTTP 503)
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-md mx-auto">
              Live online browser streaming is currently undergoing Phase 8 infrastructure certification.
              Full offline mobile downloads are <strong className="text-emerald-400">100% active</strong> and available now directly from our Cloudflare R2 storage network.
            </p>
          </div>

          {downloadNotice && (
            <div
              className={'p-3.5 rounded-xl text-xs flex items-center justify-center gap-2 ' + (
                downloadNotice.isError
                  ? 'bg-red-950/40 border border-red-500/40 text-red-300'
                  : 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
              )}
            >
              {downloadNotice.isError ? (
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              )}
              <span>{downloadNotice.message}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#E50914] hover:bg-[#b80710] disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xl shadow-[#E50914]/30 transition-transform active:scale-95 font-mono"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloading ? 'Authorizing R2 Download...' : 'Download Mobile MP4 (' + activeVersion.djName + ')'}</span>
            </button>
            <Link
              href="/library"
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-[#181A21] hover:bg-[#262932] text-gray-300 font-semibold text-xs border border-[#262932] transition-colors inline-flex items-center justify-center gap-1.5 font-mono"
            >
              <span>View in Library</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="pt-2 text-[11px] font-mono text-gray-500 flex items-center justify-center gap-3">
            <span>Code: STREAMING_COMING_SOON</span>
            <span>•</span>
            <span>R2 Presigned Delivery: 900s</span>
          </div>
        </div>

        {/* Top Bar Navigation */}
        <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 z-30 flex items-center justify-between">
          <Link
            href={'/movies/' + movie.slug}
            className="p-2.5 rounded-full bg-black/60 hover:bg-[#E50914] text-white backdrop-blur-md border border-white/20 transition-all hover:scale-105 inline-flex items-center gap-2 text-xs font-mono"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Movie</span>
          </Link>
          <span className="px-2.5 py-1 rounded bg-white/10 backdrop-blur-md text-[10px] font-mono text-gray-300 border border-white/20">
            {movie.ageRating || '18+'}
          </span>
        </div>
      </div>

      {/* Movie Details & DJ Edition Switcher */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-8 pb-8 border-b border-[#262932]">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-mono font-bold uppercase flex items-center gap-1">
                <Download className="w-3 h-3" />
                <span>Offline Download Available</span>
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
              <span className="text-[#D6A84F]">Selected Audio: {activeVersion.djName}</span>
            </div>
          </div>

          <div className="w-full lg:w-80 shrink-0 p-5 rounded-3xl bg-[#111318] border border-[#262932] space-y-4">
            <div>
              <span className="text-[10px] font-mono text-[#D6A84F] uppercase tracking-wider block font-bold">
                Audio Commentary
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">Switch DJ Track</h3>
              <p className="text-xs text-gray-400 mt-1">
                Select your preferred Swahili commentary artist for this title.
              </p>
            </div>

            <div className="space-y-2">
              {movie.versions.map((ver) => {
                const isSelected = ver.id === selectedVersionId;
                return (
                  <button
                    key={ver.id}
                    onClick={() => {
                      setSelectedVersionId(ver.id);
                      router.replace('/watch/' + movie.slug + '?dj=' + encodeURIComponent(ver.djName));
                    }}
                    className={'w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between ' + (
                      isSelected
                        ? 'bg-[#181A21] border-[#E50914] text-white shadow-md'
                        : 'bg-[#0E1015] border-[#262932] text-gray-400 hover:text-white hover:border-white/20'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={'w-2.5 h-2.5 rounded-full ' + (
                          isSelected ? 'bg-[#E50914]' : 'bg-gray-600'
                        )}
                      />
                      <span className="text-xs font-bold">{ver.djName}</span>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        ACTIVE
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <CustomerFooter />
    </div>
  );
}
