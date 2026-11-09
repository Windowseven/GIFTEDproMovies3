'use client';

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X, LogOut, ChevronDown } from "lucide-react";
import { AdminBrandLogo } from "./AdminBrandLogo";
import { useAuth } from "@/context/AuthContext";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface AdminHeaderProps {
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onToggleMobileMenu,
  isMobileMenuOpen = false,
}) => {
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#262932] bg-[#08090C]/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Brand & Mobile Trigger */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl bg-[#111318] border border-[#262932] text-[#A6A8B0] hover:text-white transition-colors"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/admin" className="transition-opacity hover:opacity-90 flex items-center gap-2.5">
            <AdminBrandLogo />
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-[#111318] text-[#D6A84F] border border-[#D6A84F]/30">
              Workspace
            </span>
          </Link>
        </div>

        {/* Center: Live Platform Operational Status (Calm & Clean) */}
        <div className="hidden md:flex items-center gap-3 bg-[#111318] border border-[#262932] rounded-full px-4 py-1.5 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
          </span>
          <span className="text-xs font-semibold text-[#F5F5F5] tracking-wide">
            Platform Services Active
          </span>
          <span className="text-[11px] text-[#70737C] font-mono">
            • Streaming & Commerce Operational
          </span>
        </div>

        {/* Right: Quick Notifications & Admin Profile */}
        <div className="flex items-center gap-3">
          {/* Real-time Notification Bell */}
          <NotificationBell />

          {/* Admin Profile */}
          <div className="relative pl-3 border-l border-[#262932]">
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-white/5 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#181A21] to-[#262932] border border-[#262932] flex items-center justify-center font-bold text-xs text-[#D6A84F] shadow-sm">
                {(user?.displayName || 'AD').slice(0, 2).toUpperCase()}
              </div>

              <div className="hidden sm:flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate max-w-[120px]">
                    {user?.displayName || 'Administrator'}
                  </span>
                  <span className="bg-[#D6A84F]/15 text-[#D6A84F] border border-[#D6A84F]/30 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded">
                    Admin
                  </span>
                </div>
                <span className="text-[10px] text-[#A6A8B0]">Platform Manager</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:inline" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-[#111318] border border-[#262932] rounded-2xl shadow-2xl p-2 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-2.5 border-b border-white/5">
                  <p className="text-white font-bold truncate">{user?.displayName || 'System Administrator'}</p>
                  <p className="text-[11px] text-gray-400 truncate">{user?.email || 'admin@gmail.com'}</p>
                </div>
                <div className="py-1">
                  <Link
                    href="/"
                    onClick={() => setShowProfileMenu(false)}
                    className="block px-3 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    View Public Platform
                  </Link>
                  <Link
                    href="/media-team"
                    onClick={() => setShowProfileMenu(false)}
                    className="block px-3 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    Media Team Studio
                  </Link>
                  <div className="border-t border-[#262932] my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 text-left transition-colors font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
