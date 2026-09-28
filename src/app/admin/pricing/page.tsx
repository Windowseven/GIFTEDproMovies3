'use client';

import React, { useState, useEffect } from "react";
import {
  Coins,
  Edit2,
  Clock,
  Sparkles,
  CheckCircle2,
  X,
  Check,
  Film,
  Download,
  Tv,
  Flame,
  Layers,
  HelpCircle,
} from "lucide-react";
import { adminRepository } from "@/lib/repositories/adminRepository";
import { PPVRateTier } from "@/types/admin";

export default function AdminPricingPage() {
  const [rates, setRates] = useState<PPVRateTier[]>([]);
  const [editingRate, setEditingRate] = useState<PPVRateTier | null>(null);
  const [streamPriceInput, setStreamPriceInput] = useState("");
  const [downloadPriceInput, setDownloadPriceInput] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadRates = async () => {
    const data = await adminRepository.getPPVRates();
    setRates(data);
  };

  useEffect(() => {
    loadRates();
  }, []);

  const handleEditClick = (rate: PPVRateTier) => {
    setEditingRate(rate);
    setStreamPriceInput(rate.streamPriceTsh.toString());
    setDownloadPriceInput(rate.downloadPriceTsh.toString());
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRate) return;

    const sPrice = parseInt(streamPriceInput, 10);
    const dPrice = parseInt(downloadPriceInput, 10);
    if (isNaN(sPrice) || isNaN(dPrice)) return;

    await adminRepository.updatePPVRate(editingRate.id, sPrice, dPrice);
    setToastMessage(`Updated rates for ${editingRate.categoryName}.`);
    setTimeout(() => setToastMessage(null), 3000);
    setEditingRate(null);
    loadRates();
  };

  // Group rates by Movies vs Series
  const movieRates = rates.filter((r) => r.id.startsWith("ppv-movie"));
  const seriesRates = rates.filter((r) => r.id.startsWith("ppv-series"));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#181A21] border border-[#10B981]/40 text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-[#10B981]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#111318] via-[#181A21] to-[#111318] border border-[#262932] p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-[#B11226]" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Pay-Per-Title (Single Movie &amp; Episode Rates)
            </h1>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-[#181A21] text-[#D6A84F] border border-[#D6A84F]/30 font-bold">
              Default Platform Tiers
            </span>
          </div>
          <p className="text-xs text-[#A6A8B0]">
            Set default stream and download price points for movies, hot drops, series episodes, and full season passes.
          </p>
        </div>
      </div>

      {/* Quick Explainer Card (Zero Contradiction) */}
      <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#A6A8B0]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#181A21] border border-[#262932] flex items-center justify-center shrink-0">
            <HelpCircle className="w-4 h-4 text-[#D6A84F]" />
          </div>
          <div>
            <p className="text-white font-semibold">How Customer Pricing Works at Checkout</p>
            <p className="text-[11px] text-[#70737C] mt-0.5">
              Customers can choose <strong>Stream (Watch Online)</strong> for temporary 48-hour access, or pay more for <strong>Download (Watch Offline)</strong> to store the video on their phone for 30 days without internet.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: Single Movies Pricing */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Film className="w-4 h-4 text-[#B11226]" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Movies Pricing (Single Title Rates)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {movieRates.map((rate) => {
            const isHotDrop = rate.id.includes("hot-drop");
            return (
              <div
                key={rate.id}
                className={`p-5 rounded-2xl border transition-all space-y-4 ${
                  isHotDrop
                    ? "bg-gradient-to-br from-[#181A21] to-[#111318] border-[#D6A84F]/40 shadow-lg shadow-[#D6A84F]/5"
                    : "bg-[#111318] border-[#262932] hover:border-[#70737C]/40"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {isHotDrop && <Flame className="w-4 h-4 text-[#E50914] fill-current" />}
                      <h3 className="text-sm font-bold text-white">{rate.categoryName}</h3>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          isHotDrop
                            ? "bg-[#D6A84F]/15 text-[#D6A84F] border border-[#D6A84F]/30"
                            : "bg-[#181A21] text-[#A6A8B0] border border-[#262932]"
                        }`}
                      >
                        {rate.badge}
                      </span>
                    </div>
                    <p className="text-xs text-[#A6A8B0] max-w-sm">{rate.description}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEditClick(rate)}
                    className="p-1.5 rounded-lg bg-[#181A21] border border-[#262932] text-[#A6A8B0] hover:text-white hover:border-[#D6A84F]/40 transition-colors"
                    title="Edit prices"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Price Breakdown Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#262932]">
                  <div className="p-3 rounded-xl bg-[#181A21] border border-[#262932] space-y-1">
                    <span className="text-[10px] font-mono uppercase text-[#70737C] flex items-center gap-1">
                      <span>▶ Stream (Online)</span>
                    </span>
                    <div className="text-base font-bold font-mono text-white">
                      TZS {rate.streamPriceTsh.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-[#A6A8B0] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#70737C]" />
                      <span>48 hours access</span>
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#181A21] border border-[#262932] space-y-1">
                    <span className="text-[10px] font-mono uppercase text-[#70737C] flex items-center gap-1">
                      <Download className="w-3 h-3 text-[#D6A84F]" />
                      <span>Download (Offline)</span>
                    </span>
                    <div className="text-base font-bold font-mono text-[#D6A84F]">
                      TZS {rate.downloadPriceTsh.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-[#A6A8B0] flex items-center gap-1">
                      <span>30 days on device</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Series & Episodic Pricing */}
      <div className="space-y-3 pt-4 border-t border-[#262932]">
        <div className="flex items-center gap-2 px-1">
          <Tv className="w-4 h-4 text-[#3B82F6]" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Series &amp; Episodic Pricing
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {seriesRates.map((rate) => {
            const isSeasonPass = rate.id.includes("season");
            return (
              <div
                key={rate.id}
                className={`p-5 rounded-2xl border transition-all space-y-4 ${
                  isSeasonPass
                    ? "bg-gradient-to-br from-[#181A21] to-[#111318] border-blue-500/40 shadow-lg shadow-blue-500/5"
                    : "bg-[#111318] border-[#262932] hover:border-[#70737C]/40"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {isSeasonPass && <Layers className="w-4 h-4 text-blue-400" />}
                      <h3 className="text-sm font-bold text-white">{rate.categoryName}</h3>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          isSeasonPass
                            ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                            : "bg-[#181A21] text-[#A6A8B0] border border-[#262932]"
                        }`}
                      >
                        {rate.badge}
                      </span>
                    </div>
                    <p className="text-xs text-[#A6A8B0] max-w-sm">{rate.description}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEditClick(rate)}
                    className="p-1.5 rounded-lg bg-[#181A21] border border-[#262932] text-[#A6A8B0] hover:text-white hover:border-[#3B82F6]/40 transition-colors"
                    title="Edit prices"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Price Breakdown Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#262932]">
                  <div className="p-3 rounded-xl bg-[#181A21] border border-[#262932] space-y-1">
                    <span className="text-[10px] font-mono uppercase text-[#70737C] flex items-center gap-1">
                      <span>▶ Stream (Online)</span>
                    </span>
                    <div className="text-base font-bold font-mono text-white">
                      TZS {rate.streamPriceTsh.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-[#A6A8B0] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#70737C]" />
                      <span>{isSeasonPass ? "All episodes unlocked" : "48h episode access"}</span>
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#181A21] border border-[#262932] space-y-1">
                    <span className="text-[10px] font-mono uppercase text-[#70737C] flex items-center gap-1">
                      <Download className="w-3 h-3 text-[#10B981]" />
                      <span>Download (Offline)</span>
                    </span>
                    <div className="text-base font-bold font-mono text-[#10B981]">
                      TZS {rate.downloadPriceTsh.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-[#A6A8B0] flex items-center gap-1">
                      <span>{isSeasonPass ? "Download entire season" : "Save episode to device"}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Rate Modal */}
      {editingRate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setEditingRate(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-[#181A21] border border-[#262932] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#262932]">
              <div>
                <h3 className="text-sm font-bold text-white">Edit Default Rate Tier</h3>
                <p className="text-[11px] text-[#A6A8B0]">{editingRate.categoryName}</p>
              </div>
              <button type="button" onClick={() => setEditingRate(null)} className="text-[#70737C] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRate} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-white font-medium flex items-center justify-between">
                  <span>Stream (Watch Online) Price</span>
                  <span className="text-[10px] font-mono text-[#70737C]">48 hours playback</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#70737C]">TZS</span>
                  <input
                    type="number"
                    required
                    step="100"
                    value={streamPriceInput}
                    onChange={(e) => setStreamPriceInput(e.target.value)}
                    className="w-full pl-11 pr-3 py-2.5 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none focus:border-[#D6A84F] font-mono text-sm font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-white font-medium flex items-center justify-between">
                  <span>Download (Watch Offline) Price</span>
                  <span className="text-[10px] font-mono text-[#70737C]">Saved to device</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#70737C]">TZS</span>
                  <input
                    type="number"
                    required
                    step="100"
                    value={downloadPriceInput}
                    onChange={(e) => setDownloadPriceInput(e.target.value)}
                    className="w-full pl-11 pr-3 py-2.5 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none focus:border-[#D6A84F] font-mono text-sm font-bold text-[#D6A84F]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#262932] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRate(null)}
                  className="px-4 py-2 rounded-xl bg-[#111318] border border-[#262932] text-[#A6A8B0] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#B11226] hover:bg-[#8F0D1E] text-white font-semibold transition-all shadow-md shadow-[#B11226]/20"
                >
                  Update Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
