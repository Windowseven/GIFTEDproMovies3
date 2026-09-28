'use client';

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Crown,
  ArrowUpRight,
  Film,
  Tv,
  Coins,
  Calendar,
  ChevronDown,
  Layers,
} from "lucide-react";
import { adminRepository } from "@/lib/repositories/adminRepository";
import { MonthSalesData } from "@/types/admin";

export default function AdminSalesPage() {
  const [months, setMonths] = useState<MonthSalesData[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState<string>("2026-09");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const mList = await adminRepository.getMonthlySales();
      setMonths(mList);
      if (mList.length > 0) {
        setSelectedMonthId(mList[0].monthId);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const activeMonth = months.find((m) => m.monthId === selectedMonthId) || months[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header Banner with Month Selector */}
      <div className="rounded-2xl bg-gradient-to-r from-[#111318] via-[#181A21] to-[#111318] border border-[#262932] p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#B11226]" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Sales &amp; Income Trends
            </h1>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-[#181A21] text-[#D6A84F] border border-[#D6A84F]/30 font-bold">
              {activeMonth?.isCurrent ? "Current Month" : "Archived Month"}
            </span>
          </div>
          <p className="text-xs text-[#A6A8B0]">
            Track platform income across VIP passes, single movies, and series episodes.
          </p>
        </div>

        {/* Month Picker Controls */}
        <div className="flex items-center gap-2 bg-[#0D0E12] border border-[#262932] p-1.5 rounded-xl self-start md:self-auto">
          <Calendar className="w-4 h-4 text-[#A6A8B0] ml-2" />
          <span className="text-xs text-[#70737C] font-mono uppercase hidden sm:inline">Month:</span>
          <div className="relative">
            <select
              value={selectedMonthId}
              onChange={(e) => setSelectedMonthId(e.target.value)}
              className="appearance-none bg-[#181A21] text-white text-xs font-bold font-mono px-3 py-1.5 pr-8 rounded-lg border border-[#262932] focus:outline-none focus:border-[#B11226] cursor-pointer"
            >
              {months.map((m) => (
                <option key={m.monthId} value={m.monthId}>
                  {m.monthLabel} {m.isCurrent ? "(Current)" : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#A6A8B0] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Month Pill Quick-Bar (for fast 1-click switching) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <span className="text-[11px] font-mono text-[#70737C] uppercase flex items-center gap-1.5 whitespace-nowrap pl-1 pr-2">
          <Layers className="w-3.5 h-3.5 text-[#A6A8B0]" /> Quick Select:
        </span>
        {months.map((m) => {
          const isSelected = m.monthId === selectedMonthId;
          return (
            <button
              key={m.monthId}
              onClick={() => setSelectedMonthId(m.monthId)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all whitespace-nowrap flex items-center gap-2 border ${
                isSelected
                  ? "bg-[#B11226]/15 border-[#B11226] text-white shadow-sm"
                  : "bg-[#111318] border-[#262932] text-[#A6A8B0] hover:text-white hover:border-[#353945]"
              }`}
            >
              <span>{m.monthLabel}</span>
              {m.isCurrent && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* 4 Financial Income Cards (Updates dynamically per selected month) */}
      {activeMonth && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Monthly Income */}
          <div className="p-5 rounded-2xl bg-[#111318] border border-[#262932] space-y-2">
            <div className="flex items-center justify-between text-[#70737C]">
              <span className="text-[10px] font-mono uppercase tracking-wider">
                Monthly Income
              </span>
              <Coins className="w-4 h-4 text-white" />
            </div>
            <div className="text-2xl font-black font-mono text-white">
              TZS {(activeMonth.totalIncomeTsh / 1000000).toFixed(1)}M
            </div>
            <p className="text-[11px] text-[#10B981] flex items-center gap-1 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+{activeMonth.growthPercentVsLastMonth || 0}% vs last month</span>
            </p>
          </div>

          {/* Card 2: VIP Passes */}
          <div className="p-5 rounded-2xl bg-[#111318] border border-[#262932] space-y-2">
            <div className="flex items-center justify-between text-[#70737C]">
              <span className="text-[10px] font-mono uppercase tracking-wider">VIP Passes</span>
              <Crown className="w-4 h-4 text-[#D6A84F]" />
            </div>
            <div className="text-2xl font-black font-mono text-[#D6A84F]">
              TZS {(activeMonth.vipPassesIncomeTsh / 1000000).toFixed(1)}M
            </div>
            <p className="text-[11px] text-[#A6A8B0]">
              {activeMonth.vipPassesPercent}% of total income (Daily, Weekly &amp; Monthly)
            </p>
          </div>

          {/* Card 3: Single Movies */}
          <div className="p-5 rounded-2xl bg-[#111318] border border-[#262932] space-y-2">
            <div className="flex items-center justify-between text-[#70737C]">
              <span className="text-[10px] font-mono uppercase tracking-wider">Single Movies</span>
              <Film className="w-4 h-4 text-[#E50914]" />
            </div>
            <div className="text-2xl font-black font-mono text-[#E50914]">
              TZS {(activeMonth.moviesIncomeTsh / 1000000).toFixed(1)}M
            </div>
            <p className="text-[11px] text-[#A6A8B0]">
              {activeMonth.moviesPercent}% of total income (Standard &amp; Hot Drops)
            </p>
          </div>

          {/* Card 4: Series & Episodes */}
          <div className="p-5 rounded-2xl bg-[#111318] border border-[#262932] space-y-2">
            <div className="flex items-center justify-between text-[#70737C]">
              <span className="text-[10px] font-mono uppercase tracking-wider">Series &amp; Episodes</span>
              <Tv className="w-4 h-4 text-[#3B82F6]" />
            </div>
            <div className="text-2xl font-black font-mono text-[#3B82F6]">
              TZS {(activeMonth.seriesIncomeTsh / 1000000).toFixed(1)}M
            </div>
            <p className="text-[11px] text-[#A6A8B0]">
              {activeMonth.seriesPercent}% of total income (Episodes &amp; Season Passes)
            </p>
          </div>
        </div>
      )}

      {/* Weekly Income Table for the Selected Month */}
      {activeMonth && (
        <div className="p-5 rounded-2xl bg-[#111318] border border-[#262932] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Weekly Income Breakdown</span>
                <span className="text-[#D6A84F] font-mono text-xs">({activeMonth.monthLabel})</span>
              </h3>
              <p className="text-[11px] text-[#70737C]">
                Total Orders: {activeMonth.totalOrders.toLocaleString()} • All figures in TZS
              </p>
            </div>
            <span className="text-[11px] text-[#70737C] font-mono">
              {activeMonth.isCurrent ? "Live weekly tracking" : "Archived monthly record"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#262932] text-[#70737C] font-mono text-[10px] uppercase">
                  <th className="pb-3 font-semibold">Period</th>
                  <th className="pb-3 font-semibold">Weekly Income</th>
                  <th className="pb-3 font-semibold">Orders Count</th>
                  <th className="pb-3 font-semibold">VIP Passes</th>
                  <th className="pb-3 font-semibold">Single Movies</th>
                  <th className="pb-3 font-semibold text-right">Series &amp; Episodes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262932]">
                {activeMonth.weeks.map((t, idx) => (
                  <tr key={idx} className="hover:bg-[#181A21]/50 transition-colors">
                    <td className="py-3.5 font-bold text-white font-mono">{t.period}</td>
                    <td className="py-3.5 font-mono font-bold text-white">
                      TZS {t.revenueTsh.toLocaleString()}
                    </td>
                    <td className="py-3.5 font-mono text-[#A6A8B0]">{t.ordersCount} orders</td>
                    <td className="py-3.5 font-mono text-[#D6A84F]">
                      TZS {t.subscriptionRevenueTsh.toLocaleString()}
                    </td>
                    <td className="py-3.5 font-mono text-[#E50914]">
                      TZS {(t.moviesRevenueTsh || Math.round(t.ppvRevenueTsh * 0.6)).toLocaleString()}
                    </td>
                    <td className="py-3.5 font-mono text-[#3B82F6] text-right">
                      TZS {(t.seriesRevenueTsh || Math.round(t.ppvRevenueTsh * 0.4)).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
