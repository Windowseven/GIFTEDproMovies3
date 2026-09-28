'use client';

import React, { useState } from 'react';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { TrailerModal } from '@/components/customer/TrailerModal';
import { LipaModal } from '@/components/customer/LipaModal';
import { SearchDrawer } from '@/components/customer/SearchDrawer';
import { customerPlans } from '@/data/mock/customerData';
import { useCustomer } from '@/context/CustomerContext';
import { Crown, CheckCircle2, Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function SubscriptionsPage() {
  const { openLipa } = useCustomer();
  const [billingCycle, setBillingCycle] = useState<'standard' | 'ultra'>('standard');

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      <CustomerHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-12">
        {/* Banner */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#D6A84F]/15 border border-[#D6A84F]/30 text-[#D6A84F] text-xs font-mono font-bold uppercase">
            <Crown className="w-4 h-4" />
            <span>VIP Cinema All-Access Passes</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight">
            Watch Without Limits. All DJs. Zero Ads.
          </h1>

          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Choose a VIP Cinema Pass that fits your entertainment lifestyle. Pay securely via M-Pesa, Tigo Pesa, Airtel Money, or Halopesa with instant activation.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {customerPlans.map((plan) => {
            const isPopular = plan.isPopular;
            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-6 flex flex-col justify-between space-y-6 transition-all duration-300 transform hover:scale-[1.02] shadow-2xl ${
                  isPopular
                    ? 'bg-gradient-to-b from-[#1E190E] via-[#111318] to-[#111318] border-2 border-[#D6A84F] shadow-[#D6A84F]/10'
                    : 'bg-[#111318] border border-[#262932] hover:border-white/20'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#D6A84F] text-black font-mono font-black text-[10px] uppercase tracking-wider shadow-md">
                    Most Popular Pass
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block">
                      {plan.durationDays} Days Pass
                    </span>
                    <h3 className="text-xl font-bold text-white mt-1">{plan.name}</h3>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                        TSh {plan.priceTsh.toLocaleString()}
                      </span>
                      <span className="text-xs font-mono text-gray-500">
                        / {plan.durationDays} days
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                      {plan.specs || `${plan.durationLabel} full access with all DJ dubbing editions.`}
                    </p>
                  </div>

                  {/* Feature Checklist */}
                  <div className="pt-4 border-t border-[#262932] space-y-2.5 text-xs">
                    <div className="flex items-center gap-2 text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Unlimited Movie &amp; Series Streams</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>All DJ Commentary Editions Unlocked</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Full HD &amp; 4K Ultra-Crisp Video</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Offline High-Speed Downloads</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Zero Ad Interruptions</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() =>
                    openLipa({
                      itemTitle: plan.name,
                      itemType: 'subscription',
                      accessType: 'vip_pass',
                      amountTsh: plan.priceTsh,
                      durationLabel: `${plan.durationDays} Days VIP Pass`,
                      itemSlug: plan.id,
                    })
                  }
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 ${
                    isPopular
                      ? 'bg-gradient-to-r from-[#D6A84F] to-[#F59E0B] text-black shadow-lg shadow-[#D6A84F]/20'
                      : 'bg-[#E50914] hover:bg-[#B11226] text-white shadow-md shadow-[#E50914]/20'
                  }`}
                >
                  <Crown className="w-4 h-4" />
                  <span>SUBSCRIBE VIA LIPA</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Telco Guarantee Bar */}
        <div className="p-6 rounded-3xl bg-[#111318] border border-[#262932] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-gray-400">
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span>Instant push notification to your phone. No recurring automatic debits.</span>
          </div>
          <div className="flex items-center gap-3 text-gray-500">
            <span>Vodacom M-Pesa</span>
            <span>•</span>
            <span>Tigo Pesa</span>
            <span>•</span>
            <span>Airtel Money</span>
            <span>•</span>
            <span>Halopesa</span>
          </div>
        </div>
      </main>

      <TrailerModal />
      <LipaModal />
      <SearchDrawer />
      <CustomerFooter />
    </div>
  );
}
