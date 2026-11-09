import React from 'react';
import Link from 'next/link';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { LegalDraftNotice } from '@/components/common/LegalDraftNotice';
import { Shield, BookOpen, Clock, AlertCircle } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      <CustomerHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-8">
        <div className="space-y-2 border-b border-[#262932] pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181A21] border border-[#262932] text-xs font-mono text-[#D6A84F]">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Masharti ya Huduma • Terms of Service</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs font-mono text-gray-400">
            Last Updated: October 2026 • Governing Law: United Republic of Tanzania
          </p>
        </div>

        <LegalDraftNotice />

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-gray-300 leading-relaxed text-sm">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white border-b border-[#262932] pb-2">
              1. Acceptance of Terms
            </h2>
            <p>
              By creating an account, browsing content, streaming video, or downloading digital packages on GIFTEDproMovies, you enter into a binding agreement governed by the laws of the United Republic of Tanzania. If you do not accept these terms, you must discontinue platform use immediately.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white border-b border-[#262932] pb-2">
              2. Account Eligibility &amp; Strict 18+ Requirement
            </h2>
            <p>
              In accordance with our approved V1 operational policy, accounts on GIFTEDproMovies are restricted to individuals aged <strong>18 years or older</strong>. By completing registration, you declare under penalty of civil liability and account forfeiture that you are at least 18 years of age.
            </p>
            <p>
              Account credentials are for your personal entertainment use only. You are strictly responsible for maintaining password confidentiality and all activity conducted through your account sessions.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white border-b border-[#262932] pb-2">
              3. Entertainment License &amp; Non-Commercial Use
            </h2>
            <p>
              All movies, series, episodes, and Swahili commentary editions delivered by GIFTEDproMovies are licensed for personal, non-commercial entertainment only. You are granted a revocable, non-exclusive, non-transferable license to view or download content on your registered devices.
            </p>
            <p className="font-semibold text-rose-300">
              Commercial public exhibition, broadcasting, screening in public passenger vehicles (buses/daladalas), video halls, hotels, bars, or redistribution of downloaded media files is strictly prohibited under the Copyright and Neighbouring Rights Act, 1999 (COSOTA).
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white border-b border-[#262932] pb-2">
              4. Pass Pricing, One-Time Purchases &amp; No Auto-Renewal
            </h2>
            <p>
              All commercial prices are denominated in Tanzanian Shillings (TZS). All passes, whether movie rental access or VIP subscriptions, are <strong>one-time, non-recurring purchases</strong>.
            </p>
            <p>
              GIFTEDproMovies <strong>never bills recurring or automated subscription charges</strong>. Once a pass duration expires, your access terminates unless you manually purchase a renewal pass.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white border-b border-[#262932] pb-2">
              5. Offline Downloads &amp; Device Limits
            </h2>
            <p>
              Offline download features deliver high-quality media packages authorized via secure, short-lived signed URLs (Cloudflare R2). Each download attempt consumes atomic title quotas in accordance with your plan limits.
            </p>
            <p>
              Device capacity is resolved dynamically based on active subscriptions (POD-07: maximum 2 default devices unless extended by an active VIP plan).
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white border-b border-[#262932] pb-2">
              6. Cancellation &amp; Refund Policy (ADR-026)
            </h2>
            <p>
              Due to the immediate digital delivery of streaming tokens and download URLs, statutory withdrawal rights are waived upon access or download initiation.
            </p>
            <p>
              In the event of a verified technical platform failure that permanently prevents content access, you may file a manual dispute through customer support (<a href="mailto:support@giftedpromovies.com" className="text-[#D6A84F] underline">support@giftedpromovies.com</a>) within the applicable support review window with your payment reference.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white border-b border-[#262932] pb-2">
              7. Dispute Resolution &amp; Jurisdiction
            </h2>
            <p>
              These Terms of Service are governed by and construed in accordance with the substantive laws of the United Republic of Tanzania. Any dispute, controversy, or claim arising under these terms shall be settled through amicable negotiation, failing which courts of competent jurisdiction in Dar es Salaam, Tanzania shall have exclusive jurisdiction.
            </p>
          </section>
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
}
