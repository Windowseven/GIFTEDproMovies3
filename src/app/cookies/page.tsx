import React from 'react';
import Link from 'next/link';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { LegalDraftNotice } from '@/components/common/LegalDraftNotice';
import { Cookie, ShieldCheck, CheckCircle2, Lock } from 'lucide-react';

export default function CookieNoticePage() {
  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      <CustomerHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-8">
        <div className="space-y-2 border-b border-[#262932] pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181A21] border border-[#262932] text-xs font-mono text-[#D6A84F]">
            <Cookie className="w-3.5 h-3.5" />
            <span>Vidakuzi na Vipindi • Cookie &amp; Session Notice</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Cookie &amp; Session Notice
          </h1>
          <p className="text-xs font-mono text-gray-400">
            Zero Third-Party Advertising Trackers • Privacy by Design
          </p>
        </div>

        <LegalDraftNotice />

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-gray-300 leading-relaxed text-sm">
          {/* Section 1: No Ad Trackers */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white border-b border-[#262932] pb-2">
              1. Our Zero Ad-Tracker Commitment
            </h2>
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-300">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
              <div>
                <p className="font-bold text-white">We do not track you across the web.</p>
                <p className="text-xs text-gray-300 mt-1">
                  GIFTEDproMovies does not use third-party marketing, analytics, or behavioural advertising cookies. We do not load Google Analytics, Meta Pixel, or data broker scripts.
                </p>
              </div>
            </div>
            <p>
              Because we use only strictly necessary functional cookies required to deliver authentic cinema playback and account authentication, you are not bombarded with intrusive, blocking cookie consent banners.
            </p>
          </section>

          {/* Section 2: First-Party Cookies */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white border-b border-[#262932] pb-2">
              2. Strictly Necessary First-Party Cookies
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-[#262932] bg-[#111318]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181A21] text-gray-400 border-b border-[#262932]">
                  <tr>
                    <th className="p-3 font-mono">Cookie Name</th>
                    <th className="p-3 font-mono">Purpose</th>
                    <th className="p-3 font-mono">Duration</th>
                    <th className="p-3 font-mono">Security Attributes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262932] text-gray-300 font-mono">
                  <tr>
                    <td className="p-3 text-white font-bold">gifted_session</td>
                    <td className="p-3 font-sans">Maintains your authenticated customer session.</td>
                    <td className="p-3">14 days idle / 30 days max</td>
                    <td className="p-3 text-emerald-400">HttpOnly, Secure, SameSite=Lax</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-white font-bold">gp_oauth_state</td>
                    <td className="p-3 font-sans">Cryptographic CSRF token for Google OAuth handoff.</td>
                    <td className="p-3">10 minutes</td>
                    <td className="p-3 text-emerald-400">HttpOnly, Secure, SameSite=Lax</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3: Browser Storage */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white border-b border-[#262932] pb-2">
              3. Browser Local Storage Usage
            </h2>
            <p>
              Our web application may utilize browser <code className="bg-[#181A21] px-1.5 py-0.5 rounded text-white">localStorage</code> exclusively for non-sensitive client UI preferences, such as:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Video player volume preference;</li>
              <li>Temporary video playback scrubber position;</li>
              <li>Search modal recent search terms.</li>
            </ul>
            <p className="text-xs text-gray-400">
              We never store your passwords, authorization tokens, or payment details in local storage.
            </p>
          </section>
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
}
