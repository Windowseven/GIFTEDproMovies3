'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ReceiptText,
  Users,
  Film,
  Crown,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  Eye,
  Download,
  Tv,
  Smartphone,
  ChevronRight,
  ArrowUpRight,
  Filter,
  Search,
} from "lucide-react";
import { adminRepository } from "@/lib/repositories/adminRepository";
import {
  AdminKPIs,
  RevenueMixItem,
  AdminOrder,
  AttentionItem,
  ContentPerformance,
  AudienceAnalytics,
} from "@/types/admin";
import { OrderDetailDrawer } from "@/components/admin/OrderDetailDrawer";

export default function AdminDashboardPage() {
  const [kpis, setKpis] = useState<AdminKPIs | null>(null);
  const [revenueMix, setRevenueMix] = useState<RevenueMixItem[]>([]);
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<AdminOrder[]>([]);
  const [contentLeaderboard, setContentLeaderboard] = useState<ContentPerformance[]>([]);
  const [audience, setAudience] = useState<AudienceAnalytics | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<"today" | "7d" | "30d" | "12m">("30d");

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [k, r, att, ord, cp, aud] = await Promise.all([
        adminRepository.getKPIs(),
        adminRepository.getRevenueMix(),
        adminRepository.getAttentionItems(),
        adminRepository.getOrders(),
        adminRepository.getContentPerformances(),
        adminRepository.getAudienceAnalytics(),
      ]);
      setKpis(k);
      setRevenueMix(r);
      setAttentionItems(att);
      setRecentOrders(ord.slice(0, 6));
      setContentLeaderboard(cp);
      setAudience(aud);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const handleOpenOrder = (order: AdminOrder) => {
    setSelectedOrder(order);
    setIsOrderDrawerOpen(true);
  };

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-12">
      {/* Top Banner: Executive Context & Quick Controls */}
      <div className="rounded-2xl bg-gradient-to-r from-[#111318] via-[#181A21] to-[#111318] border border-[#262932] p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span className="text-[11px] font-mono tracking-wider uppercase text-[#10B981] font-bold">
                Platform Operations Overview
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Executive Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-[#A6A8B0]">
              Real-time intelligence across platform revenue, content consumption, customer acquisition, and priority workflows.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Time range selector */}
            <div className="flex items-center bg-[#08090C] border border-[#262932] rounded-xl p-1 text-xs">
              {(["today", "7d", "30d", "12m"] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    timeRange === range
                      ? "bg-[#181A21] text-white shadow-sm font-semibold border border-[#262932]"
                      : "text-[#70737C] hover:text-[#A6A8B0]"
                  }`}
                >
                  {range === "today" ? "Today" : range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : "12 Months"}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-[#111318] border border-[#262932] text-[#A6A8B0] hover:text-white transition-colors flex items-center gap-1.5 text-xs"
              title="Refresh platform telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#D6A84F]" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 1. HOW IS THE PLATFORM PERFORMING? (Core Metrics Strip) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-[#70737C] font-semibold">
            1. Platform Performance
          </h2>
          <span className="text-[11px] text-[#A6A8B0] font-mono">Currency: TZS (Tanzanian Shilling)</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Gross Revenue */}
          <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] hover:border-[#262932]/80 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#70737C]">Gross Revenue (Month)</span>
              <span className="p-1.5 rounded-lg bg-[#D6A84F]/10 text-[#D6A84F]">
                <Crown className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-lg sm:text-xl font-black font-mono text-white">
              TZS {kpis ? (kpis.revenueThisMonth / 1000000).toFixed(1) + "M" : "84.2M"}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#10B981] font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+{kpis?.revenueTodayGrowthPercent || 18.4}% vs last period</span>
            </div>
          </div>

          {/* Total Orders */}
          <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] hover:border-[#262932]/80 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#70737C]">Total Orders</span>
              <span className="p-1.5 rounded-lg bg-[#3B82F6]/10 text-[#3B82F6]">
                <ReceiptText className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-lg sm:text-xl font-black font-mono text-white">
              {kpis?.totalOrders.toLocaleString() || "3,412"}
            </div>
            <div className="text-[11px] text-[#10B981] font-medium">
              {kpis?.orderSuccessRatePercent || 99.1}% success rate
            </div>
          </div>

          {/* Active Customers */}
          <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] hover:border-[#262932]/80 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#70737C]">Customers</span>
              <span className="p-1.5 rounded-lg bg-[#10B981]/10 text-[#10B981]">
                <Users className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-lg sm:text-xl font-black font-mono text-white">
              {kpis?.totalCustomers.toLocaleString() || "24,500"}
            </div>
            <div className="text-[11px] text-[#A6A8B0]">
              +142 registered today
            </div>
          </div>

          {/* Active VIP Subscriptions */}
          <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] hover:border-[#262932]/80 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#70737C]">Active Passes</span>
              <span className="p-1.5 rounded-lg bg-[#D6A84F]/10 text-[#D6A84F]">
                <Crown className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-lg sm:text-xl font-black font-mono text-[#D6A84F]">
              {kpis?.activeSubscriptions.toLocaleString() || "8,920"}
            </div>
            <div className="text-[11px] text-[#A6A8B0]">
              64% VIP Ultra Plan
            </div>
          </div>

          {/* Total Catalog */}
          <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] hover:border-[#262932]/80 transition-all space-y-2 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#70737C]">Catalog Size</span>
              <span className="p-1.5 rounded-lg bg-[#B11226]/10 text-[#B11226]">
                <Film className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-lg sm:text-xl font-black font-mono text-white">
              {kpis?.totalMovies || 1420} Movies
            </div>
            <div className="text-[11px] text-[#A6A8B0]">
              {kpis?.totalSeries || 380} Series • 8 DJs
            </div>
          </div>
        </div>
      </div>

      {/* 2 & 3. COMMERCIAL MIX & ATTENTION REQUIRED */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Sales Revenue Composition */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#111318] border border-[#262932] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Sales & Revenue Composition</h3>
              <p className="text-xs text-[#A6A8B0] mt-0.5">
                Breakdown of commercial earnings across Subscriptions, PPV Streams, and Offline Downloads.
              </p>
            </div>
            <Link
              href="/admin/sales"
              className="text-xs font-semibold text-[#D6A84F] hover:underline flex items-center gap-1"
            >
              <span>Detailed Sales</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Revenue Stack Bar */}
          <div className="space-y-2 pt-2">
            <div className="h-3 w-full rounded-full bg-[#181A21] flex overflow-hidden">
              {revenueMix.map((item, idx) => (
                <div
                  key={idx}
                  style={{ width: `${item.percent}%`, backgroundColor: item.colorHex }}
                  className="h-full transition-all duration-500"
                  title={`${item.label}: ${item.percent}%`}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {revenueMix.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#181A21] border border-[#262932] space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.colorHex }} />
                    <span className="text-xs font-medium text-[#A6A8B0] truncate">{item.label}</span>
                  </div>
                  <div className="text-sm font-bold font-mono text-white">
                    TZS {(item.amountTsh / 1000000).toFixed(2)}M
                  </div>
                  <span className="text-[10px] text-[#70737C] font-mono">{item.percent}% of total sales</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right (1 col): 3. ATTENTION REQUIRED */}
        <div className="p-5 rounded-2xl bg-[#111318] border border-[#262932] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Attention Required</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#D6A84F]/15 text-[#D6A84F] font-bold">
                {attentionItems.length} Tasks
              </span>
            </h3>
          </div>

          <div className="space-y-3">
            {attentionItems.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-[#181A21] border border-[#262932] hover:border-[#70737C]/40 transition-colors space-y-2"
              >
                <div className="flex items-start gap-2.5">
                  {item.type === "action" ? (
                    <AlertTriangle className="w-4 h-4 text-[#D6A84F] shrink-0 mt-0.5" />
                  ) : item.type === "warning" ? (
                    <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-4 h-4 text-[#3B82F6] shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white leading-snug">{item.title}</p>
                    <p className="text-[11px] text-[#A6A8B0] mt-1 leading-relaxed">{item.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#262932]/70 text-[11px]">
                  <span className="text-[#70737C] font-mono">{item.timestamp}</span>
                  <Link
                    href={item.actionHref}
                    className="font-semibold text-[#D6A84F] hover:underline flex items-center gap-1"
                  >
                    <span>{item.actionLabel}</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2 & 4. CONTENT PERFORMANCE & CUSTOMER AUDIENCE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Top Performing Content Leaderboard */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#111318] border border-[#262932] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">2. Content Performance Leaderboard</h3>
              <p className="text-xs text-[#A6A8B0] mt-0.5">Top-earning and most-consumed titles across the platform.</p>
            </div>
            <Link
              href="/admin/content-performance"
              className="text-xs font-semibold text-[#D6A84F] hover:underline flex items-center gap-1"
            >
              <span>View Leaderboard</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-[#262932] border-t border-[#262932]">
            {contentLeaderboard.map((item, idx) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs text-[#70737C] font-bold w-4">#{idx + 1}</span>
                  <div className="w-10 h-14 rounded-lg bg-[#181A21] overflow-hidden shrink-0 border border-[#262932]">
                    <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{item.title}</p>
                    <p className="text-[11px] text-[#A6A8B0] mt-0.5 flex items-center gap-1.5">
                      <span>{item.leadDj}</span>
                      <span>•</span>
                      <span className="capitalize">{item.contentType}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right shrink-0">
                  <div>
                    <span className="text-xs font-bold font-mono text-white">
                      TZS {(item.totalRevenueTsh / 1000000).toFixed(1)}M
                    </span>
                    <span className="text-[10px] text-[#70737C] block font-mono">
                      {item.totalStreams.toLocaleString()} streams
                    </span>
                  </div>
                  <span className="px-2 py-1 rounded bg-[#181A21] border border-[#262932] text-[10px] font-mono text-[#10B981] font-semibold hidden sm:inline-block">
                    {item.completionRatePercent}% comp.
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right (1 col): 4. CUSTOMER AUDIENCE SNAPSHOT */}
        <div className="p-5 rounded-2xl bg-[#111318] border border-[#262932] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">4. Customer Activity</h3>
            <Link
              href="/admin/users"
              className="text-xs font-semibold text-[#D6A84F] hover:underline flex items-center gap-1"
            >
              <span>Directory</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="p-3.5 rounded-xl bg-[#181A21] border border-[#262932] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#A6A8B0]">Avg Revenue Per User (ARPU):</span>
                <span className="font-mono font-bold text-white">
                  TZS {audience?.averageRevenuePerUserTsh.toLocaleString() || "9,450"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#A6A8B0]">Customer Retention Rate:</span>
                <span className="font-mono font-bold text-[#10B981]">
                  {audience?.retentionRatePercent || 84.2}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#A6A8B0]">Monthly Churn Rate:</span>
                <span className="font-mono font-bold text-[#F59E0B]">
                  {audience?.churnRatePercent || 3.4}%
                </span>
              </div>
            </div>

            {/* Device Breakdown */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#70737C]">Device Distribution</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-[#181A21] border border-[#262932] flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#3B82F6]" />
                  <div>
                    <span className="text-[10px] text-[#A6A8B0] block">Mobile</span>
                    <span className="font-bold text-white font-mono">{audience?.deviceBreakdown.mobilePercent || 72}%</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#181A21] border border-[#262932] flex items-center gap-2">
                  <Tv className="w-4 h-4 text-[#D6A84F]" />
                  <div>
                    <span className="text-[10px] text-[#A6A8B0] block">Smart TV</span>
                    <span className="font-bold text-white font-mono">{audience?.deviceBreakdown.tvPercent || 14}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. WHAT COMMERCIAL ACTIVITY IS HAPPENING? (Recent Orders Feed) */}
      <div className="p-5 rounded-2xl bg-[#111318] border border-[#262932] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">5. Recent Orders Feed</h3>
            <p className="text-xs text-[#A6A8B0] mt-0.5">Live stream of customer transactions and pass purchases.</p>
          </div>
          <Link
            href="/admin/orders"
            className="px-3.5 py-1.5 rounded-xl bg-[#181A21] border border-[#262932] text-xs font-semibold text-white hover:bg-[#262932] transition-colors self-start sm:self-auto flex items-center gap-1.5"
          >
            <span>View All Orders</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#262932] text-[#70737C] font-mono text-[10px] uppercase">
                <th className="pb-3 font-semibold">Order ID</th>
                <th className="pb-3 font-semibold">Customer</th>
                <th className="pb-3 font-semibold">Content / Pass</th>
                <th className="pb-3 font-semibold">Type</th>
                <th className="pb-3 font-semibold">Method</th>
                <th className="pb-3 font-semibold">Amount</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262932]">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-[#181A21]/50 transition-colors">
                  <td className="py-3 font-mono font-bold text-white">{order.orderNumber}</td>
                  <td className="py-3">
                    <div className="font-semibold text-white">{order.customerName}</div>
                    <div className="text-[10px] text-[#70737C] font-mono">{order.customerPhoneMasked}</div>
                  </td>
                  <td className="py-3 font-medium text-white max-w-[180px] truncate">{order.itemTitle}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#181A21] text-[#A6A8B0] border border-[#262932]">
                      {order.purchaseTypeLabel}
                    </span>
                  </td>
                  <td className="py-3 text-[#A6A8B0] font-mono text-[11px]">{order.paymentMethodLabel}</td>
                  <td className="py-3 font-mono font-bold text-white">
                    TZS {order.amountTsh.toLocaleString()}
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        order.status === "completed"
                          ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
                          : order.status === "processing"
                          ? "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30"
                          : "bg-[#DC2626]/15 text-[#DC2626] border border-[#DC2626]/30"
                      }`}
                    >
                      {order.statusLabel}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenOrder(order)}
                      className="px-2.5 py-1 rounded bg-[#181A21] border border-[#262932] text-white hover:border-[#D6A84F]/50 text-[11px] font-semibold transition-colors"
                    >
                      View Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Drawer */}
      <OrderDetailDrawer
        order={selectedOrder}
        isOpen={isOrderDrawerOpen}
        onClose={() => {
          setIsOrderDrawerOpen(false);
          setSelectedOrder(null);
        }}
      />
    </div>
  );
}
