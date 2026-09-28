'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layers, ArrowRight } from 'lucide-react';

export default function MediaTeamMetadataRedirect() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/media-team/categories');
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="max-w-md mx-auto py-24 text-center space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400">
        <Layers className="w-6 h-6" />
      </div>
      <h1 className="text-xl font-bold text-white">Metadata & Taxonomies</h1>
      <p className="text-xs text-[#A6A8B0]">
        Taxonomies have been organized into dedicated Category and Country management tools. Redirecting...
      </p>
      <Link
        href="/media-team/categories"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#181A21] hover:bg-[#262932] text-xs font-semibold text-white border border-[#262932] transition-colors"
      >
        <span>Continue to Categories</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
