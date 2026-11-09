import React from 'react';
import Link from 'next/link';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { LegalDraftNotice } from '@/components/common/LegalDraftNotice';
import { ShieldCheck, Lock, Mail, FileText } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      <CustomerHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-8">
        <div className="space-y-2 border-b border-[#262932] pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181A21] border border-[#262932] text-xs font-mono text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sera ya Faragha • Privacy Policy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs font-mono text-gray-400">
            Compliance Framework: Tanzania Personal Data Protection Act, 2022 (Act No. 11 of 2022)
          </p>
        </div>

        <LegalDraftNotice />

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-gray-300 leading-relaxed text-sm">
          {/* Section 1: Overview */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white border-b border-[#262932] pb-2">
              1. Commitment to Personal Data Protection
            </h2>
            <p>
              GIFTEDproMovies is committed to upholding the privacy, confidentiality, and data sovereignty of all customers in accordance with the <strong>Personal Data Protection Act, 2022 (PDPA 2022)</strong> of Tanzania.
            </p>
            <p>
              We operate under strict data minimization principles: we collect only data that is strictly necessary to authenticate your account, secure your sessions, and fulfill media access.
            </p>
          </section>

          {/* Section 2: Data We Collect */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white border-b border-[#262932] pb-2">
              2. Data We Collect
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Account Credentials:</strong> Email address and password (securely hashed via Argon2id). We never store plaintext passwords.</li>
              <li><strong>Billing &amp; Payment Data:</strong> Transaction amount, order reference, and payment phone number used for mobile money USSD initiation. We <strong>never request, see, or store your mobile money PIN or card numbers</strong>.</li>
              <li><strong>Device &amp; Session Identifiers:</strong> Device name, browser user agent, and IP address for rate limiting, device capacity enforcement (POD-07), and fraud prevention.</li>
            </ul>
          </section>

          {/* Section 3: Legal Bases */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white border-b border-[#262932] pb-2">
              3. Lawful Bases for Processing
            </h2>
            <p>We process your personal data under the following legal bases:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Contractual Performance:</strong> To deliver purchased movies, manage your library, and provide customer support.</li>
              <li><strong>Legal &amp; Tax Obligations:</strong> To preserve accounting records and transaction amounts for 7 years under the Tanzania Tax Administration Act, 2015 §35(3).</li>
              <li><strong>Legitimate Interests:</strong> To protect platform infrastructure against brute-force attacks, unauthorized credential stuffing, and copyright piracy.</li>
            </ul>
          </section>

          {/* Section 4: Data Subject Rights */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white border-b border-[#262932] pb-2">
              4. Your Rights Under Tanzania PDPA 2022
            </h2>
            <p>As a data subject, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Access:</strong> Inquire about personal data processed by the platform.</li>
              <li><strong>Correction:</strong> Request rectification of inaccurate or outdated information.</li>
              <li><strong>Erasure / Deletion:</strong> Request the deletion of your account and pseudonymization of your profile in accordance with our <Link href="/account-deletion" className="text-[#D6A84F] underline">Account Deletion Policy</Link>.</li>
              <li><strong>Object to Processing:</strong> Object to processing carried out on legitimate interest grounds.</li>
            </ul>
          </section>

          {/* Section 5: Data Protection Contact */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white border-b border-[#262932] pb-2">
              5. Contacting the Data Protection Team
            </h2>
            <p>
              For privacy-related inquiries, data subject access requests, or to contact our data protection team, email us at:
            </p>
            <div className="p-4 rounded-xl bg-[#111318] border border-[#262932] flex items-center gap-3">
              <Mail className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs font-mono text-gray-400">Data Protection Inquiries:</p>
                <a href="mailto:privacy@giftedpromovies.com" className="text-white font-mono font-bold hover:underline">
                  privacy@giftedpromovies.com
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
}
