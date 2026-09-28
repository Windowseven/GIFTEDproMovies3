'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import {
  Bell,
  Menu,
  X,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  ChevronDown,
  ExternalLink,
  LogOut,
  Info,
} from 'lucide-react';

interface MediaTeamHeaderProps {
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const MediaTeamHeader: React.FC<MediaTeamHeaderProps> = ({
  onToggleMobileMenu,
  isMobileMenuOpen,
}) => {
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notifications = [
    {
      id: 'notif-1',
      title: 'Missing Streaming Media',
      desc: 'The Beekeeper: Master video file has not been uploaded.',
      time: '15 minutes ago',
      unread: true,
      type: 'warning',
    },
    {
      id: 'notif-2',
      title: 'Streaming Media Ready',
      desc: 'Extraction 2: Dar Hunt is processed and ready for catalog.',
      time: '1 hour ago',
      unread: true,
      type: 'success',
    },
    {
      id: 'notif-3',
      title: 'Missing Artwork',
      desc: 'Godzilla x Kong: 16:9 backdrop banner image missing.',
      time: '3 hours ago',
      unread: false,
      type: 'info',
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#08090C]/90 backdrop-blur-xl border-b border-[#262932] h-[57px] flex items-center justify-between px-4 lg:px-6">
      {/* Left: Mobile hamburger + Brand with STUDIO OPS */}
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}

        <Link href="/media-team" className="flex items-center gap-2.5 sm:gap-3 group select-none">
          <div className="relative shrink-0 flex items-center justify-center">
            <Image
              src="/brand/logo.png"
              alt="GIFTEDproMovies Studio"
              width={34}
              height={34}
              className="w-8 h-8 sm:w-8.5 sm:h-8.5 object-contain drop-shadow-[0_0_10px_rgba(229,9,20,0.35)] transition-transform duration-300 group-hover:scale-105"
              priority
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-heading text-xl lg:text-2xl text-white tracking-wide leading-none">
              GIFTED<span className="text-[#B11226] font-semibold">pro</span>Movies
            </span>
            <span className="bg-[#181A21] text-[#A6A8B0] border border-[#262932] font-mono text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase">
              STUDIO
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono pl-2 border-l border-white/10">
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-400 uppercase text-[10px]">Content Operations</span>
          </div>
        </Link>
      </div>

      {/* Center: Clean Workspace Status Badge */}
      <div className="hidden md:flex items-center gap-2 bg-[#111318] border border-[#262932] px-3 py-1 rounded-full text-xs font-mono">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="text-gray-300 text-[11px]">STUDIO WORKSPACE</span>
        <span className="w-1 h-1 rounded-full bg-gray-600" />
        <span className="text-gray-400 text-[10px]">Media Operations</span>
      </div>

      {/* Right: Notifications & Studio Profile */}
      <div className="flex items-center gap-2">
        {/* Notifications Drawer */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#111318] text-gray-400 hover:text-white border border-[#262932] transition-colors relative"
            aria-label="Studio Alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#08090C]" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-[#111318] border border-[#262932] rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Content Alerts (3)
                </span>
                <span className="text-[10px] font-mono text-[#A6A8B0] cursor-pointer hover:text-white hover:underline">
                  Mark all as read
                </span>
              </div>

              <div className="divide-y divide-white/5 mt-2 space-y-1 max-h-72 overflow-y-auto">
                {notifications.map(n => (
                  <div key={n.id} className="py-2.5 first:pt-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        {n.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />}
                        {n.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />}
                        {n.type === 'info' && <Info className="w-3.5 h-3.5 text-blue-400" />}
                        {n.title}
                      </span>
                      {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                    </div>
                    <p className="text-gray-400 text-[11px] mt-0.5">{n.desc}</p>
                    <span className="text-[10px] font-mono text-gray-500 mt-1 block">{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Studio Operator Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1 pl-2 rounded-xl bg-[#111318] border border-[#262932] hover:border-white/20 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-[#181A21] text-white flex items-center justify-center text-xs font-mono font-bold border border-[#262932]">
              SO
            </div>
            <div className="hidden sm:block text-left text-xs font-mono pr-1">
              <span className="text-white font-semibold block leading-tight">Studio Operator</span>
              <span className="text-[10px] text-gray-400 block">Content Operations</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-[#111318] border border-[#262932] rounded-2xl shadow-2xl p-2 z-50 text-xs font-mono animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-3 border-b border-white/5">
                <p className="text-white font-bold">{user?.displayName || 'Studio Operator'}</p>
                <p className="text-[11px] text-gray-400">{user?.email || 'media@gmail.com'}</p>
                <span className="mt-1.5 inline-block px-2 py-0.5 rounded text-[9px] bg-[#181A21] text-[#A6A8B0] border border-[#262932] font-bold">
                  MEDIA_TEAM ROLE
                </span>
              </div>

              <div className="py-1">
                <Link
                  href="/media-team/movies/new"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-gray-400" />
                  Ingest New Movie
                </Link>
                <Link
                  href="/admin"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#D6A84F]" />
                  Switch to Admin Ops
                </Link>
                <Link
                  href="/"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Return to Home
                </Link>

                <div className="border-t border-[#262932] my-1" />

                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 text-left transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

