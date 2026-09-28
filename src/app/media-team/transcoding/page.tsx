'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FolderKanban, ArrowRight } from 'lucide-react';

export default function MediaTeamTranscodingRedirect() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/media-team/assets');
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="max-w-md mx-auto py-24 text-center space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400">
        <FolderKanban className="w-6 h-6" />
      </div>
      <h1 className="text-xl font-bold text-white">Media Asset Management</h1>
      <p className="text-xs text-[#A6A8B0]">
        Streaming and downloadable media assets are now centralized in the Media Asset Library. Redirecting...
      </p>
      <Link
        href="/media-team/assets"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#181A21] hover:bg-[#262932] text-xs font-semibold text-white border border-[#262932] transition-colors"
      >
        <span>Continue to Media Library</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
