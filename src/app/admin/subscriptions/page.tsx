'use client';

import React, { useState, useEffect } from "react";
import {
  Crown,
  Edit2,
  CheckCircle2,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import { adminRepository } from "@/lib/repositories/adminRepository";
import { SubscriptionPlanConfig } from "@/types/admin";

export default function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState<SubscriptionPlanConfig[]>([]);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanConfig | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadPlans = async () => {
    const data = await adminRepository.getSubscriptionPlans();
    setPlans(data);
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    const newPrice = parseInt(priceInput, 10);
    if (isNaN(newPrice)) return;

    await adminRepository.updateSubscriptionPassPrice(editingPlan.id, newPrice);
    setToastMessage(`Updated ${editingPlan.name} price to TZS ${newPrice.toLocaleString()}.`);
    setTimeout(() => setToastMessage(null), 3000);
    setEditingPlan(null);
    loadPlans();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#181A21] border border-[#10B981]/40 text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2">
          <Check className="w-4 h-4 text-[#10B981]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#111318] via-[#181A21] to-[#111318] border border-[#262932] p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-[#D6A84F]" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Subscription Plans & Passes
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#181A21] text-[#A6A8B0] border border-[#262932]">
              VIP Access Tiers
            </span>
          </div>
          <p className="text-xs text-[#A6A8B0]">
            Manage all recurring and time-based subscription packages (Daily, Weekly, VIP Ultra Monthly).
          </p>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`p-6 rounded-2xl bg-[#111318] border ${
              plan.isBestValue ? "border-[#D6A84F]/50 shadow-lg shadow-[#D6A84F]/5" : "border-[#262932]"
            } flex flex-col justify-between space-y-6`}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{plan.name}</span>
                  </h3>
                  <span className="text-xs text-[#A6A8B0]">{plan.durationLabel}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {plan.badge && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#D6A84F]/15 text-[#D6A84F] border border-[#D6A84F]/30">
                      {plan.badge}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPlan(plan);
                      setPriceInput(plan.priceTsh.toString());
                    }}
                    className="p-1 rounded-lg bg-[#181A21] border border-[#262932] text-[#A6A8B0] hover:text-white"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#181A21] border border-[#262932] text-center">
                <span className="text-[10px] font-mono uppercase text-[#70737C]">Pricing</span>
                <div className="text-2xl font-black font-mono text-white mt-0.5">
                  TZS {plan.priceTsh.toLocaleString()}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#262932]">
                <span className="text-[10px] font-mono uppercase text-[#70737C]">Included Entitlements</span>
                <ul className="space-y-2 text-xs text-[#A6A8B0]">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingPlan(plan);
                setPriceInput(plan.priceTsh.toString());
              }}
              className="w-full py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs font-semibold text-white hover:border-[#D6A84F]/40 transition-colors"
            >
              Update Pricing & Settings
            </button>
          </div>
        ))}
      </div>

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setEditingPlan(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-[#181A21] border border-[#262932] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#262932]">
              <h3 className="text-sm font-bold text-white">Edit {editingPlan.name} Price</h3>
              <button type="button" onClick={() => setEditingPlan(null)} className="text-[#70737C] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePrice} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[#A6A8B0] font-medium">Price (TZS)</label>
                <input
                  type="number"
                  required
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none font-mono"
                />
              </div>

              <div className="pt-3 border-t border-[#262932] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 rounded-xl bg-[#111318] border border-[#262932] text-[#A6A8B0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#B11226] text-white font-semibold hover:bg-[#B11226]/90"
                >
                  Update Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
