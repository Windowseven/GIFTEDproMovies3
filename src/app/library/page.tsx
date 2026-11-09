'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { TrailerModal } from '@/components/customer/TrailerModal';
import { LipaModal } from '@/components/customer/LipaModal';
import { SearchDrawer } from '@/components/customer/SearchDrawer';
import { useAuth } from '@/context/AuthContext';
import { commercialApi } from '@/lib/api/commercialApi';
import { downloadApi } from '@/lib/api/downloadApi';
import {
  CustomerLibraryResponse,
  DownloadLicenseItem,
  DownloadLicensesResponse,
  CustomerCatalogGrantItem,
  CustomerLibraryItem,
} from '@/lib/api/types';
import {
  Film,
  Play,
  Download,
  Clock,
  Crown,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Lock,
  Smartphone,
  Info,
} from 'lucide-react';

export default function CustomerLibraryPage() {
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'passes' | 'downloads'>('passes');

  const [libraryData, setLibraryData] = useState<CustomerLibraryResponse | null>(null);
  const [licenses, setLicenses] = useState<DownloadLicenseItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Download trigger state
  const [downloadingContentId, setDownloadingContentId] = useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<{ message: string; isError: boolean } | null>(null);

  const fetchLibraryData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [libRes, licensesRes] = await Promise.all([
        commercialApi.getMyLibrary().catch(() => ({ customerId: '', exactEntitlements: [], catalogGrants: [], hasActiveCatalogAccess: false })),
        downloadApi.getLicenses().catch(() => ({ licenses: [] })),
      ]);
      setLibraryData(libRes);
      setLicenses(licensesRes.licenses || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load your access passes and downloads';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLibraryData();
    } else if (!isAuthLoading) {
      setIsLoading(false);
    }
  }, [isAuthenticated, isAuthLoading, fetchLibraryData]);

  const handleAuthorizeAndDownload = async (license: DownloadLicenseItem) => {
    setDownloadingContentId(license.contentId);
    setDownloadNotice(null);

    try {
      // 1. Request signed R2 authorization URL (900s TTL)
      const res = await downloadApi.authorizeDownload({
        contentId: license.contentId,
      });

      if (!res.authorized || !res.downloadUrl) {
        throw new Error('Download authorization was not granted.');
      }

      // 2. Trigger browser download directly from signed R2 URL
      const link = document.createElement('a');
      link.href = res.downloadUrl;
      link.download = res.fileName || `${license.slug || 'giftedpro_movie'}_mobile.mp4`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 3. Report delivery status to backend
      try {
        await downloadApi.reportDelivery(res.attemptId, 'COMPLETED');
      } catch {
        // Telemetry failure is non-blocking to customer download
      }

      setDownloadNotice({
        message: `Download started for "${license.title}". Valid for 900s. Check your browser downloads.`,
        isError: false,
      });

      // Refresh licenses state
      fetchLibraryData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Download failed. Please try again.';
      setDownloadNotice({
        message: msg,
        isError: true,
      });
    } finally {
      setDownloadingContentId(null);
    }
  };

  const totalPasses = (libraryData?.catalogGrants?.length || 0) + (libraryData?.exactEntitlements?.length || 0);

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      <CustomerHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-8">
        {/* User Account Bar */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#111318] border border-[#262932] shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#E50914] to-[#D6A84F] flex items-center justify-center font-black text-2xl text-white shadow-xl">
              {isAuthenticated ? (user?.displayName ? user.displayName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U') : 'G'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  {isAuthenticated ? (user?.displayName || user?.email?.split('@')[0]) : 'Guest Explorer'}
                </h1>
                {libraryData?.hasActiveCatalogAccess && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#D6A84F]/20 text-[#D6A84F] border border-[#D6A84F]/40 text-[10px] font-mono font-bold uppercase flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    <span>Active VIP Catalog Pass</span>
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-gray-400 mt-0.5">
                {isAuthenticated
                  ? `${user?.email} • Verified Account`
                  : 'Browsing in Guest Mode (Sign in to access your purchased passes)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/account/devices"
              className="px-4 py-2 rounded-xl bg-[#181A21] hover:bg-[#262932] text-xs font-mono text-gray-300 border border-[#262932] inline-flex items-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Devices</span>
            </Link>
            <Link
              href="/subscriptions"
              className="px-4 py-2 rounded-xl bg-[#E50914] hover:bg-[#B11226] text-white text-xs font-bold shadow-md shadow-[#E50914]/20"
            >
              Get VIP Pass
            </Link>
          </div>
        </div>

        {/* Non-Commercial Personal Viewing License Notice */}
        <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] flex items-start gap-3 text-xs text-gray-400">
          <Info className="w-4 h-4 text-[#D6A84F] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-white">Personal Non-Commercial License Notice</p>
            <p className="text-[11px] leading-relaxed">
              All digital access passes and downloaded files are licensed strictly for personal, private, non-commercial viewing under the Copyright and Neighbouring Rights Act.
              Public performance, commercial screening, broadcast, resale, or file redistribution is strictly prohibited. Passes are one-time payments and do not auto-renew.
            </p>
          </div>
        </div>

        {downloadNotice && (
          <div
            className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
              downloadNotice.isError
                ? 'bg-red-950/40 border border-red-500/40 text-red-300'
                : 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
            }`}
          >
            {downloadNotice.isError ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            )}
            <span>{downloadNotice.message}</span>
          </div>
        )}

        {/* Unauthenticated Banner */}
        {!isAuthenticated && !isAuthLoading && (
          <div className="p-12 text-center space-y-4 rounded-3xl bg-[#111318] border border-[#262932]">
            <Lock className="w-12 h-12 text-[#E50914] mx-auto" />
            <h3 className="text-lg font-bold text-white">Sign In to View Your Passes &amp; Downloads</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Your purchased passes, movie access grants, and offline download licenses are securely linked to your registered account.
            </p>
            <div className="pt-2">
              <Link
                href="/login?returnTo=/library"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white font-mono font-bold text-xs transition-colors"
              >
                <span>Sign In to Access Library</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Authenticated Library Content */}
        {isAuthenticated && (
          <div className="space-y-6">
            {/* Library Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-[#262932] pb-3 text-xs font-mono">
              <button
                onClick={() => setActiveTab('passes')}
                className={`px-4 py-2 rounded-xl transition-all ${
                  activeTab === 'passes'
                    ? 'bg-white text-black font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Active Passes &amp; Access Grants ({totalPasses})
              </button>
              <button
                onClick={() => setActiveTab('downloads')}
                className={`px-4 py-2 rounded-xl transition-all ${
                  activeTab === 'downloads'
                    ? 'bg-white text-black font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Offline Downloads ({licenses.length})
              </button>
            </div>

            {isLoading && (
              <div className="p-12 text-center text-gray-400 font-mono text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#E50914]" />
                <span>Loading your access grants and licenses...</span>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
                {error}
              </div>
            )}

            {!isLoading && activeTab === 'passes' && (
              <div className="space-y-4">
                {totalPasses === 0 ? (
                  <div className="p-12 text-center space-y-4 rounded-3xl bg-[#111318] border border-[#262932]">
                    <Film className="w-10 h-10 text-gray-600 mx-auto" />
                    <h3 className="text-base font-bold text-white">No Active Passes Found</h3>
                    <p className="text-xs text-gray-400 max-w-md mx-auto">
                      You currently have no active cinema passes or individual title entitlements.
                      Choose a one-time VIP pass or movie package with instant Mobile Money checkout.
                    </p>
                    <Link
                      href="/subscriptions"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white font-mono font-bold text-xs"
                    >
                      Browse Available Passes
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Catalog Grants (VIP passes) */}
                    {libraryData?.catalogGrants?.map((grant) => (
                      <div
                        key={grant.id}
                        className="p-5 rounded-2xl bg-[#111318] border border-[#262932] space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#D6A84F]/20 text-[#D6A84F] border border-[#D6A84F]/40 text-[10px] font-mono font-bold uppercase flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            <span>Catalog Pass</span>
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {grant.status}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-white">All-Access Cinema Pass</h4>
                          <p className="text-xs text-gray-400 font-mono">
                            Valid until: {new Date(grant.validUntil).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-[#262932] flex items-center justify-between text-xs text-gray-500 font-mono">
                          <span>One-time purchase • No auto-renewal</span>
                          <Link href="/movies" className="text-[#E50914] hover:underline font-bold">
                            Explore Catalog →
                          </Link>
                        </div>
                      </div>
                    ))}

                    {/* Exact Entitlements */}
                    {libraryData?.exactEntitlements?.map((ent) => (
                      <div
                        key={ent.id}
                        className="p-5 rounded-2xl bg-[#111318] border border-[#262932] space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px] font-mono font-bold uppercase">
                            {ent.targetKind} Access
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {ent.status}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-white">
                            {ent.targetKind === 'MOVIE' ? 'Single Movie Access' : 'Series Access'}
                          </h4>
                          <p className="text-xs text-gray-400 font-mono">
                            Expires on: {new Date(ent.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-[#262932] flex items-center justify-between text-xs text-gray-500 font-mono">
                          <span>Personal Viewing License</span>
                          <Link href="/movies" className="text-[#E50914] hover:underline font-bold">
                            Watch Title →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!isLoading && activeTab === 'downloads' && (
              <div className="space-y-4">
                {licenses.length === 0 ? (
                  <div className="p-12 text-center space-y-4 rounded-3xl bg-[#111318] border border-[#262932]">
                    <Download className="w-10 h-10 text-gray-600 mx-auto" />
                    <h3 className="text-base font-bold text-white">No Offline Download Licenses</h3>
                    <p className="text-xs text-gray-400 max-w-md mx-auto">
                      Offline downloads allow you to save encrypted, high-fidelity MP4 files to any device for viewing without an internet connection.
                    </p>
                    <Link
                      href="/subscriptions"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white font-mono font-bold text-xs"
                    >
                      Get Download-Enabled Pass
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {licenses.map((lic) => (
                      <div
                        key={lic.entitlementId}
                        className="p-5 sm:p-6 rounded-2xl bg-[#111318] border border-[#262932] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase">
                              Offline License Active
                            </span>
                            {lic.downloadLimitType && (
                              <span className="text-[10px] font-mono text-gray-400">
                                Policy: {lic.downloadLimitType}
                              </span>
                            )}
                          </div>
                          <h4 className="text-base font-bold text-white">{lic.title}</h4>
                          <p className="text-xs font-mono text-gray-400">
                            License expires: {new Date(lic.expiresAt).toLocaleDateString()}
                            {lic.quotaRemaining !== null && ` • Remaining quota: ${lic.quotaRemaining}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleAuthorizeAndDownload(lic)}
                            disabled={downloadingContentId === lic.contentId}
                            className="px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold text-xs font-mono transition-colors flex items-center gap-2 shadow-md"
                          >
                            <Download className="w-4 h-4" />
                            {downloadingContentId === lic.contentId ? 'Authorizing R2...' : 'Download File'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <TrailerModal />
      <LipaModal />
      <SearchDrawer />
      <CustomerFooter />
    </div>
  );
}
