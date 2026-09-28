'use client';

import React, { useState, useEffect } from "react";
import {
  LineChart,
  Film,
  Tv,
  Eye,
  Download,
  Crown,
  ChevronRight,
} from "lucide-react";
import { adminRepository } from "@/lib/repositories/adminRepository";
import { ContentPerformance, ContentAnalytics } from "@/types/admin";

export default function AdminContentPerformancePage() {
  const [performances, setPerformances] = useState<ContentPerformance[]>([]);
  const [analytics, setAnalytics] = useState<ContentAnalytics | null>(null);

  const loadData = async () => {
    const [p, a] = await Promise.all([
      adminRepository.getContentPerformances(),
      adminRepository.getContentAnalytics(),
    ]);
    setPerformances(p);
    setAnalytics(a);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#111318] via-[#181A21] to-[#111318] border border-[#262932] p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <LineChart className="w-4 h-4 text-[#B11226]" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Content Performance Leaderboard
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#181A21] text-[#A6A8B0] border border-[#262932]">
              Consumption Intelligence
            </span>
          </div>
          <p className="text-xs text-[#A6A8B0]">
            Review total view completions, download requests, and gross revenue generated per title.
          </p>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="p-5 rounded-2xl bg-[#111318] border border-[#262932] space-y-4">
        <h3 className="text-sm font-bold text-white">Top Grossing Catalog Titles</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#262932] text-[#70737C] font-mono text-[10px] uppercase">
                <th className="pb-3 font-semibold">Rank</th>
                <th className="pb-3 font-semibold">Title</th>
                <th className="pb-3 font-semibold">Lead Voice</th>
                <th className="pb-3 font-semibold">Streams</th>
                <th className="pb-3 font-semibold">Downloads</th>
                <th className="pb-3 font-semibold">Gross Revenue</th>
                <th className="pb-3 font-semibold text-right">Completion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262932]">
              {performances.map((item, idx) => (
                <tr key={item.id} className="hover:bg-[#181A21]/50 transition-colors">
                  <td className="py-3.5 font-mono font-black text-white">#{idx + 1}</td>
                  <td className="py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-12 rounded bg-[#181A21] overflow-hidden shrink-0 border border-[#262932]">
                        <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-bold text-white">{item.title}</p>
                        <span className="text-[10px] text-[#70737C] capitalize">{item.contentType}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 text-[#D6A84F] font-medium">{item.leadDj}</td>
                  <td className="py-3.5 font-mono text-white">{item.totalStreams.toLocaleString()}</td>
                  <td className="py-3.5 font-mono text-white">{item.totalDownloads.toLocaleString()}</td>
                  <td className="py-3.5 font-mono font-bold text-[#10B981]">
                    TZS {item.totalRevenueTsh.toLocaleString()}
                  </td>
                  <td className="py-3.5 text-right font-mono text-white">
                    {item.completionRatePercent}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DJ Listenership Share Breakdown */}
      {analytics && (
        <div className="p-5 rounded-2xl bg-[#111318] border border-[#262932] space-y-4">
          <h3 className="text-sm font-bold text-white">DJ & Voice Translator Stream Share</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {analytics.djListenershipShare.map((dj) => (
              <div key={dj.djId} className="p-4 rounded-xl bg-[#181A21] border border-[#262932] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">{dj.djName}</span>
                  <span className="text-xs font-mono font-bold text-[#D6A84F]">{dj.sharePercent}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#111318] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${dj.sharePercent}%`, backgroundColor: dj.colorHex }}
                  />
                </div>
                <span className="text-[10px] text-[#70737C] font-mono block">
                  {(dj.totalListens / 1000000).toFixed(1)}M Total Listens
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
