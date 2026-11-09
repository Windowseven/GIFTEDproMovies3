'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Film,
  PlusCircle,
  Video,
  CheckSquare,
  X,
  LucideIcon,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { catalogApi } from '@/lib/api/catalogApi';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

interface MediaTeamSidebarProps {
  onCloseMobileMenu?: () => void;
  onOpenUploadModal?: () => void;
}

export const MediaTeamSidebar: React.FC<MediaTeamSidebarProps> = ({
  onCloseMobileMenu,
  onOpenUploadModal,
}) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [movieCount, setMovieCount] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    let isMounted = true;
    catalogApi.listTitles({ limit: 100 }).then((res) => {
      if (isMounted && res?.items) {
        setMovieCount(res.items.length);
      }
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const navGroups: NavGroup[] = [
    {
      group: 'Operations',
      items: [
        {
          label: 'Overview Dashboard',
          href: '/media-team',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      group: 'Media Library',
      items: [
        {
          label: 'Movie Library',
          href: '/media-team/movies',
          icon: Film,
          badge: movieCount !== null ? String(movieCount) : undefined,
          badgeColor: 'bg-[#181A21] text-[#A6A8B0] border-[#262932]',
        },
        {
          label: 'Series & TV Shows',
          href: '/media-team/series',
          icon: Video,
        },
      ],
    },
    {
      group: 'Publishing & Quality',
      items: [
        {
          label: 'Review Queue',
          href: '/media-team/review',
          icon: CheckSquare,
        },
      ],
    },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-[#262932] bg-[#08090C] flex flex-col justify-between h-[calc(100vh-57px)] sticky top-[57px] overflow-y-auto">
      <div className="p-4 space-y-5">
        {/* Mobile Drawer Header with Close Button */}
        <div className="flex lg:hidden items-center justify-between pb-3 border-b border-[#262932]">
          <div className="flex items-center gap-2">
            <Image
              src="/brand/logo.png"
              alt="GIFTEDproMovies"
              width={26}
              height={26}
              className="w-6 h-6 object-contain drop-shadow-[0_0_8px_rgba(229,9,20,0.35)]"
            />
            <span className="font-heading text-lg text-white tracking-wide">
              GIFTED<span className="text-[#B11226] font-semibold">pro</span>Movies
            </span>
            <span className="bg-[#181A21] text-[#A6A8B0] border border-[#262932] font-mono text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">
              STUDIO
            </span>
          </div>
          {onCloseMobileMenu && (
            <button
              onClick={onCloseMobileMenu}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Quick Direct In-Flow Ingest Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/media-team/movies/new"
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#B11226] hover:bg-[#8F0D1E] text-white font-semibold text-xs tracking-wide transition-all shadow-md shadow-[#B11226]/20 border border-[#B11226]/40"
          >
            <PlusCircle className="w-3.5 h-3.5 text-white" />
            <span>New Movie</span>
          </Link>
          <Link
            href="/media-team/series/new"
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#181A21] hover:bg-[#262932] text-white font-semibold text-xs tracking-wide transition-all border border-[#262932]"
          >
            <PlusCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>New Series</span>
          </Link>
        </div>

        {/* Navigation list */}
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <h5 className="px-3 text-[10px] font-mono uppercase tracking-wider text-[#70737C] font-semibold">
              {group.group}
            </h5>

            <div className="space-y-0.5">
              {group.items.map((item, itemIdx) => {
                const Icon = item.icon;
                const isActive = mounted && (
                  item.href === '/media-team'
                    ? pathname === '/media-team'
                    : pathname.startsWith(item.href)
                );

                return (
                  <Link
                    key={itemIdx}
                    href={item.href}
                    onClick={onCloseMobileMenu}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-[#181A21] text-white border border-[#262932] font-semibold shadow-sm'
                        : 'text-[#A6A8B0] hover:bg-[#111318] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-white' : 'text-[#70737C] group-hover:text-white'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                          isActive
                            ? 'bg-[#181A21] text-white border-white/20'
                            : item.badgeColor
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Media Team Staff Account Card */}
      <div className="p-3 border-t border-[#262932] bg-[#0B0C10]">
        <div className="p-2.5 rounded-xl bg-[#111318] border border-[#262932] flex items-center justify-between gap-2.5 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#B11226]/40 via-[#181A21] to-[#111318] border border-[#B11226]/50 text-white flex items-center justify-center text-xs font-mono font-bold shadow-inner">
                {user?.displayName
                  ? user.displayName
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'MT'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#111318]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate block">
                  {user?.displayName || 'Media Team Staff'}
                </span>
              </div>
              <span className="text-[10px] text-[#A6A8B0] font-mono truncate block">
                {user?.email || 'media@giftedpromovies.com'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            title="Sign out of Media Studio"
            aria-label="Sign out of Media Studio"
            className="p-1.5 rounded-lg text-[#70737C] hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

