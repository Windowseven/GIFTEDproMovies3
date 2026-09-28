'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export default function MediaTeamQCRedirect() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/media-team/review');
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="max-w-md mx-auto py-24 text-center space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400">
        <ShieldCheck className="w-6 h-6" />
      </div>
      <h1 className="text-xl font-bold text-white">Review & Readiness Queue</h1>
      <p className="text-xs text-[#A6A8B0]">
        Catalog completeness, visual quality, and readiness gates are now managed in the Review Queue. Redirecting...
      </p>
      <Link
        href="/media-team/review"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#181A21] hover:bg-[#262932] text-xs font-semibold text-white border border-[#262932] transition-colors"
      >
        <span>Continue to Review Queue</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
