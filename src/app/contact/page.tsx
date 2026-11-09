import React from 'react';
import Link from 'next/link';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { LegalDraftNotice } from '@/components/common/LegalDraftNotice';
import { Mail, MessageSquare, ShieldCheck, HelpCircle } from 'lucide-react';

export default function ContactSupportPage() {
  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      <CustomerHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-8">
        <div className="space-y-2 border-b border-[#262932] pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181A21] border border-[#262932] text-xs font-mono text-[#D6A84F]">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Mawasiliano na Msaada • Contact &amp; Support</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Contact &amp; Customer Support
          </h1>
          <p className="text-xs font-mono text-gray-400">
            We are here to help with your cinema passes, downloads, and account security.
          </p>
        </div>

        <LegalDraftNotice />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Customer Support */}
          <div className="p-6 rounded-3xl bg-[#111318] border border-[#262932] space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E50914]/15 border border-[#E50914]/30 flex items-center justify-center text-[#E50914]">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">General Customer Support</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Assistance with movie playback, offline download retries, and mobile money payment status.
            </p>
            <div className="pt-2">
              <a
                href="mailto:support@giftedpromovies.com"
                className="inline-flex items-center gap-2 text-xs font-mono font-bold text-white bg-[#181A21] px-3.5 py-2 rounded-xl border border-[#262932] hover:border-[#E50914] transition-colors"
              >
                <Mail className="w-4 h-4 text-[#E50914]" />
                <span>support@giftedpromovies.com</span>
              </a>
            </div>
          </div>

          {/* Card 2: Privacy & Data Protection */}
          <div className="p-6 rounded-3xl bg-[#111318] border border-[#262932] space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Privacy &amp; Data Rights</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Inquiries regarding personal data handling, account deletion under PDPA 2022, or DPO requests.
            </p>
            <div className="pt-2">
              <a
                href="mailto:privacy@giftedpromovies.com"
                className="inline-flex items-center gap-2 text-xs font-mono font-bold text-white bg-[#181A21] px-3.5 py-2 rounded-xl border border-[#262932] hover:border-emerald-500 transition-colors"
              >
                <Mail className="w-4 h-4 text-emerald-400" />
                <span>privacy@giftedpromovies.com</span>
              </a>
            </div>
          </div>
        </div>

        {/* Notice on Operating Identity */}
        <div className="p-5 rounded-2xl bg-[#111318] border border-[#262932] text-xs text-gray-400 space-y-2">
          <p className="font-bold text-white">Operational &amp; Corporate Identity</p>
          <p className="leading-relaxed">
            GIFTEDproMovies is operated in Dar es Salaam, United Republic of Tanzania. Corporate registration credentials and physical address details will be formally published upon regulatory conclusion of the pre-release review phase.
          </p>
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
}
