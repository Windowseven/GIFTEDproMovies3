'use client';

import React from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { ContentReadinessChecklist } from '@/types/mediaTeam';

interface ContentCompletenessBadgeProps {
  percent: number;
  showDetails?: boolean;
  checklist?: Partial<ContentReadinessChecklist>;
}

export const ContentCompletenessBadge: React.FC<ContentCompletenessBadgeProps> = ({
  percent,
  showDetails = false,
  checklist,
}) => {
  const getColor = (pct: number) => {
    if (pct >= 100) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
    if (pct >= 75) return 'text-amber-400 bg-amber-500/10 border-amber-500/25';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  const getBarColor = (pct: number) => {
    if (pct >= 100) return 'bg-emerald-500';
    if (pct >= 75) return 'bg-amber-500';
    return 'bg-rose-500/60';
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${getColor(
            percent
          )}`}
        >
          {percent}% {percent === 100 ? 'READY' : 'INCOMPLETE'}
        </span>
      </div>

      <div className="w-full h-1 bg-[#161922] rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 rounded-full ${getBarColor(percent)}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {showDetails && checklist && (
        <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-gray-400 pt-1">
          <div className="flex items-center gap-1">
            {checklist.poster ? (
              <Check className="w-3 h-3 text-[#10B981]" />
            ) : (
              <AlertCircle className="w-3 h-3 text-rose-400" />
            )}
            <span>Poster (2:3)</span>
          </div>
          <div className="flex items-center gap-1">
            {checklist.backdrop ? (
              <Check className="w-3 h-3 text-[#10B981]" />
            ) : (
              <AlertCircle className="w-3 h-3 text-yellow-500" />
            )}
            <span>Backdrop (16:9)</span>
          </div>
          <div className="flex items-center gap-1">
            {checklist.djAssigned ? (
              <Check className="w-3 h-3 text-[#10B981]" />
            ) : (
              <AlertCircle className="w-3 h-3 text-rose-400" />
            )}
            <span>DJ Assigned</span>
          </div>
          <div className="flex items-center gap-1">
            {checklist.streamingMedia ? (
              <Check className="w-3 h-3 text-[#10B981]" />
            ) : (
              <AlertCircle className="w-3 h-3 text-rose-400" />
            )}
            <span>Streaming Video</span>
          </div>
        </div>
      )}
    </div>
  );
};

