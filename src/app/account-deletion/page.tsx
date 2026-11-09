import React from 'react';
import Link from 'next/link';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { LegalDraftNotice } from '@/components/common/LegalDraftNotice';
import { Trash2, AlertTriangle, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';

export default function AccountDeletionPolicyPage() {
  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      <CustomerHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-8">
        <div className="space-y-2 border-b border-[#262932] pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181A21] border border-[#262932] text-xs font-mono text-rose-400">
            <Trash2 className="w-3.5 h-3.5" />
            <span>Kufuta Akaunti • Account &amp; Data Deletion Policy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Account &amp; Data Deletion Policy
          </h1>
          <p className="text-xs font-mono text-gray-400">
            Governed by Tanzania PDPA 2022 §34 (Right to Erasure) &amp; TRA Tax Administration Act 2015
          </p>
        </div>

        <LegalDraftNotice />

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-gray-300 leading-relaxed text-sm">
          {/* Section 1: Right to Erasure */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white border-b border-[#262932] pb-2">
              1. Your Right to Erasure
            </h2>
            <p>
              In accordance with Section 34 of the Tanzania Personal Data Protection Act, 2022, every registered customer has the right to request the deletion of their account and the erasure of their personal identity.
            </p>
            <p>
              You can initiate account deletion at any time directly through your account settings or by contacting our data protection team.
            </p>
          </section>

          {/* Section 2: Personal Data Erased vs Retained */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white border-b border-[#262932] pb-2">
              2. What Gets Erased vs. What Must Be Retained
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box 1: Erased */}
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider font-mono">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Permanently Erased / Anonymized</span>
                </div>
                <ul className="text-xs space-y-1.5 text-rose-200/90 list-disc pl-4">
                  <li>Your email address is permanently replaced with an irreversible anonymous hash.</li>
                  <li>Your password hash is permanently wiped.</li>
                  <li>Your display name, username, and profile data are scrubbed.</li>
                  <li>All active device registrations are revoked.</li>
                  <li>All active sessions are instantly terminated.</li>
                  <li>Unused active passes or downloads are immediately forfeited.</li>
                </ul>
              </div>

              {/* Box 2: Statutory Retention */}
              <div className="p-4 rounded-2xl bg-[#181A21] border border-[#262932] space-y-2">
                <div className="flex items-center gap-2 text-[#D6A84F] font-bold text-xs uppercase tracking-wider font-mono">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Statutory Tax Records (7 Years)</span>
                </div>
                <ul className="text-xs space-y-1.5 text-gray-400 list-disc pl-4">
                  <li>Section 35(3) of the Tanzania Tax Administration Act, 2015 requires retention of books of account and digital financial ledgers for 7 years.</li>
                  <li>Past transaction amounts, timestamps, and order references are preserved in pseudonymized form.</li>
                  <li>Financial records cannot be linked back to your personal identity once pseudonymized.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3: How to Execute Deletion */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white border-b border-[#262932] pb-2">
              3. How to Request Deletion
            </h2>
            <p>
              To delete your account immediately from within the application:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>Sign in to your account.</li>
              <li>Navigate to <Link href="/account/security" className="text-[#D6A84F] underline">Account Security</Link>.</li>
              <li>Scroll to the <strong>Danger Zone</strong>.</li>
              <li>Re-enter your password and confirm deletion.</li>
            </ol>
            <p>
              Alternatively, submit a formal erasure request to <a href="mailto:privacy@giftedpromovies.com" className="text-[#D6A84F] underline">privacy@giftedpromovies.com</a> from your registered email address.
            </p>
          </section>
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
}
