import React from 'react';
import Link from 'next/link';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { LegalDraftNotice } from '@/components/common/LegalDraftNotice';
import { RefreshCw, Mail, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

export default function RefundsPolicyPage() {
  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      <CustomerHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-8">
        <div className="space-y-2 border-b border-[#262932] pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181A21] border border-[#262932] text-xs font-mono text-[#D6A84F]">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sera ya Marejesho • Refund &amp; Cancellation Information</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Refund &amp; Cancellation Information
          </h1>
          <p className="text-xs font-mono text-gray-400">
            Commercial Operational Model (ADR-026 Manual Reconciliation)
          </p>
        </div>

        <LegalDraftNotice />

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-gray-300 leading-relaxed text-sm">
          {/* Section 1: Immediate Digital Delivery */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white border-b border-[#262932] pb-2">
              1. Digital Content Immediate Delivery Exemption
            </h2>
            <p>
              In accordance with international standards for digital media and Tanzanian consumer protection principles, digital goods (such as video streaming tokens and offline download authorization URLs) are delivered immediately upon payment settlement.
            </p>
            <p>
              By purchasing an access pass or offline download, you expressly consent to immediate digital fulfillment and acknowledge that <strong>passes are non-refundable once content streaming or file downloading has commenced</strong>.
            </p>
          </section>

          {/* Section 2: Technical Failure & Manual Disputes */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white border-b border-[#262932] pb-2">
              2. Technical Delivery Failure &amp; Billing Error Inquiries
            </h2>
            <p>
              Under project decision ADR-026, automated in-app chargebacks are deferred from V1. All payment dispute inquiries and exceptional refund claims are reviewed individually via manual support reconciliation.
            </p>
            <p>You may file an inquiry in the following cases:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Billing Errors:</strong> You were duplicate-charged by your mobile money operator for a single order reference.</li>
              <li><strong>Verified Server Delivery Failure:</strong> Your payment was successfully settled (`PAID`), but our media infrastructure permanently failed to generate or deliver your access pass or signed download link.</li>
            </ul>
          </section>

          {/* Section 3: Technical Download Retries vs. Refunds */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white border-b border-[#262932] pb-2">
              3. Download Interruptions (24-Hour Retry Grace)
            </h2>
            <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-white text-xs">
                  Interrupted download transfers do not require a refund claim.
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  If your mobile device disconnects or your download fails during transfer, reporting the failed status grants an automatic <strong>24-hour technical retry grace window</strong>. You can re-download the same title on your registered device within 24 hours without consuming an additional quota slot.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: How to Submit a Dispute */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white border-b border-[#262932] pb-2">
              4. How to Submit a Support Dispute
            </h2>
            <p>
              To report an unresolved billing discrepancy or technical defect, email our customer support team:
            </p>
            <div className="p-4 rounded-xl bg-[#111318] border border-[#262932] space-y-2">
              <div className="flex items-center gap-2 text-white font-mono font-bold text-sm">
                <Mail className="w-4 h-4 text-[#D6A84F]" />
                <a href="mailto:support@giftedpromovies.com" className="hover:underline">
                  support@giftedpromovies.com
                </a>
              </div>
              <p className="text-xs text-gray-400">
                Please include: (1) Your registered account email, (2) Order Reference (e.g. <code>ORD-...</code>), (3) Mobile Money Transaction Reference (M-Pesa/Tigo Pesa/Airtel Money), and (4) Description of the technical failure.
              </p>
            </div>
          </section>
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
}
