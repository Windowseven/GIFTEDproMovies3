import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function LegalDraftNotice() {
  return (
    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-3 my-6 animate-fadeIn">
      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="font-bold tracking-wide uppercase text-[11px] text-amber-400">
          Pre-Release Draft Document
        </p>
        <p className="text-amber-200/90 leading-relaxed">
          NOTICE: This document is a pre-release draft for review purposes and does not yet constitute a binding commercial agreement. Commercial operation remains subject to final business owner adoption and Tanzanian legal counsel clearance.
        </p>
      </div>
    </div>
  );
}
