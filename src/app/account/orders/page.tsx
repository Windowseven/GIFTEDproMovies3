'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { commercialApi } from '@/lib/api/commercialApi';
import { CustomerOrderSummary } from '@/lib/api/types';
import { useAuth } from '@/context/AuthContext';
import {
  Receipt,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  RefreshCw,
  Film,
  Calendar,
  CreditCard,
  ShieldCheck,
  ChevronRight,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

export default function CustomerOrdersPage() {
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await commercialApi.getCustomerOrders(undefined, 20);
      setOrders(res.items || []);
      setNextCursor(res.nextCursor || null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load order history';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await commercialApi.getCustomerOrders(nextCursor, 20);
      setOrders((prev) => [...prev, ...(res.items || [])]);
      setNextCursor(res.nextCursor || null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load additional orders';
      setError(msg);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    } else if (!isAuthLoading) {
      setIsLoading(false);
    }
  }, [isAuthenticated, isAuthLoading, fetchOrders]);

  const formatTzs = (amount: number) => {
    return new Intl.NumberFormat('sw-TZ', {
      style: 'currency',
      currency: 'TZS',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Paid &amp; Active</span>
          </span>
        );
      case 'PENDING_PAYMENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            <span>Awaiting Payment</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            <XCircle className="w-3.5 h-3.5" />
            <span>Payment Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-500/10 border border-gray-500/30 text-gray-400 text-xs font-semibold">
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col justify-between select-none">
      <CustomerHeader />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
          <Link href="/" className="hover:text-white transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          <Link href="/library" className="hover:text-white transition-colors">
            Account
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          <span className="text-white font-medium">Orders &amp; Receipts</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#262932]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#E50914]/10 border border-[#E50914]/30 flex items-center justify-center text-[#E50914]">
                <Receipt className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Orders &amp; Purchase Receipts
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-400">
              Verified record of your pass subscriptions, single-movie access orders, and Mobile Money payments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchOrders}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111318] hover:bg-[#181A21] border border-[#262932] text-xs text-gray-300 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link
              href="/account/security"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111318] hover:bg-[#181A21] border border-[#262932] text-xs text-gray-300 hover:text-white transition-all"
            >
              <span>Security</span>
            </Link>
          </div>
        </div>

        {/* Unauthenticated State */}
        {!isAuthenticated && !isAuthLoading && (
          <div className="mt-12 p-8 rounded-2xl bg-[#0E1015] border border-[#262932] text-center max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#E50914]/10 border border-[#E50914]/30 flex items-center justify-center text-[#E50914] mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Sign In Required</h3>
              <p className="text-xs text-gray-400">
                Please sign in to view your order history and download receipts.
              </p>
            </div>
            <Link
              href="/login?returnTo=/account/orders"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#B11226] text-white font-bold text-xs shadow-lg transition-all"
            >
              <span>Sign In to Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <div className="flex-1">{error}</div>
            <button
              onClick={fetchOrders}
              className="underline hover:text-white font-semibold shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Orders Listing */}
        {isAuthenticated && (
          <div className="mt-8 space-y-6">
            {isLoading && orders.length === 0 ? (
              // Loading Skeleton
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-5 rounded-2xl bg-[#0E1015] border border-[#262932] space-y-3 animate-pulse"
                  >
                    <div className="flex justify-between items-center">
                      <div className="w-40 h-4 bg-gray-800 rounded" />
                      <div className="w-24 h-6 bg-gray-800 rounded-full" />
                    </div>
                    <div className="w-56 h-5 bg-gray-700 rounded" />
                    <div className="flex gap-4 pt-2 border-t border-[#1C1E26]">
                      <div className="w-32 h-3 bg-gray-800 rounded" />
                      <div className="w-32 h-3 bg-gray-800 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : orders.length === 0 ? (
              // Empty State
              <div className="p-12 rounded-2xl bg-[#0E1015] border border-[#262932] text-center space-y-4 max-w-lg mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-[#111318] border border-[#262932] flex items-center justify-center text-gray-500 mx-auto">
                  <Receipt className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">No Orders Yet</h3>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                    You have not purchased any movies or VIP passes yet. Browse the catalog to find your favorite East African cinematic releases.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/movies"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#B11226] text-white font-bold text-xs shadow-lg transition-all"
                  >
                    <span>Browse Catalog</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              // Order Cards Grid
              <div className="space-y-4">
                {orders.map((order) => {
                  const createdDate = new Date(order.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={order.id}
                      className="p-5 sm:p-6 rounded-2xl bg-[#0E1015] border border-[#262932] hover:border-gray-700 transition-all space-y-4 shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1C1E26]">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-gray-400">
                            Order ID: <span className="text-white font-semibold">{order.id.slice(0, 8)}...{order.id.slice(-4)}</span>
                          </span>
                          <span className="text-[11px] text-gray-500">•</span>
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Calendar className="w-3.5 h-3.5" />
                            {createdDate}
                          </span>
                        </div>
                        <div>{getStatusBadge(order.status)}</div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-white">
                              {order.planName || (order.targetKind === 'CATALOG' ? 'VIP All-Access Pass' : 'Single Title Movie Pass')}
                            </span>
                            {order.durationValue > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-[#D6A84F]/10 border border-[#D6A84F]/30 text-[10px] font-mono font-bold text-[#D6A84F]">
                                {order.durationValue} {order.durationUnit.toLowerCase()}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">
                            One-time commercial digital content delivery • No recurring subscription
                          </p>
                        </div>

                        <div className="text-right sm:text-right">
                          <div className="text-lg font-black text-white font-mono">
                            {formatTzs(order.amountTzs)}
                          </div>
                          <span className="text-[10px] font-mono text-gray-500 uppercase">
                            Gross Price • All-Inclusive
                          </span>
                        </div>
                      </div>

                      {/* Payment & Fulfillment Details */}
                      {(order.paymentAttempt || order.fulfillment) && (
                        <div className="pt-3 border-t border-[#1C1E26] flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400">
                          <div className="flex items-center gap-4">
                            {order.paymentAttempt && (
                              <span className="flex items-center gap-1.5 text-[11px]">
                                <CreditCard className="w-3.5 h-3.5 text-gray-500" />
                                <span>Channel: <strong className="text-gray-300 capitalize">{order.paymentAttempt.providerName}</strong></span>
                              </span>
                            )}
                            {order.fulfillment?.completedAt && (
                              <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Entitlement Provisioned</span>
                              </span>
                            )}
                          </div>

                          {order.status === 'PAID' && (
                            <Link
                              href="/library"
                              className="inline-flex items-center gap-1 text-xs text-[#D6A84F] hover:text-[#F59E0B] font-semibold transition-colors"
                            >
                              <span>View in Library</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Keyset Pagination Load More */}
                {nextCursor && (
                  <div className="pt-4 text-center">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="px-6 py-2.5 rounded-xl bg-[#111318] hover:bg-[#181A21] border border-[#262932] hover:border-gray-600 text-xs text-white font-semibold transition-all disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {isLoadingMore ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Loading earlier orders...</span>
                        </>
                      ) : (
                        <span>Load Earlier Orders</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <CustomerFooter />
    </div>
  );
}
