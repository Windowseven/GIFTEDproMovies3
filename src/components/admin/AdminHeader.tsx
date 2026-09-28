'use client';

import React, { useState } from "react";
import Link from "next/link";
import { Bell, Search, CheckCircle2, AlertTriangle, Info, Menu, X, LogOut, ChevronDown } from "lucide-react";
import { AdminBrandLogo } from "./AdminBrandLogo";
import { useAuth } from "@/context/AuthContext";

interface AdminHeaderProps {
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onToggleMobileMenu,
  isMobileMenuOpen = false,
}) => {
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
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
          {/* Notification Button & Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 rounded-xl bg-[#111318] border border-[#262932] text-[#A6A8B0] hover:text-white hover:border-[#70737C]/40 transition-all"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#B11226] text-[9px] font-bold text-white shadow-sm">
                3
              </span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-84 sm:w-96 rounded-2xl bg-[#181A21] border border-[#262932] shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-[#262932]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]">
                      Platform Notifications
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#B11226]/20 text-[#B11226] font-bold">
                      3 New
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="text-[11px] text-[#A6A8B0] hover:text-white transition-colors"
                  >
                    Dismiss
                  </button>
                </div>

                <div className="mt-3 space-y-2.5">
                  <Link
                    href="/admin/movies"
                    onClick={() => setShowNotifications(false)}
                    className="block p-3 rounded-xl bg-[#111318] border border-[#262932] hover:border-[#D6A84F]/40 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-[#D6A84F] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-white">4 Movies Awaiting Publishing Review</p>
                        <p className="text-[11px] text-[#A6A8B0] mt-0.5">
                          Media processing finished by Media Team. Awaiting final commercial approval.
                        </p>
                        <span className="text-[10px] text-[#70737C] font-mono mt-1 block">15 mins ago</span>
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/admin/users"
                    onClick={() => setShowNotifications(false)}
                    className="block p-3 rounded-xl bg-[#111318] border border-[#262932] hover:border-[#3B82F6]/40 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-[#3B82F6] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-white">18 Customer Passes Expiring</p>
                        <p className="text-[11px] text-[#A6A8B0] mt-0.5">
                          VIP customer passes reaching 24-hour expiration threshold. Renewal dispatched.
                        </p>
                        <span className="text-[10px] text-[#70737C] font-mono mt-1 block">3 hours ago</span>
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/admin/orders"
                    onClick={() => setShowNotifications(false)}
                    className="block p-3 rounded-xl bg-[#111318] border border-[#262932] hover:border-[#10B981]/40 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-white">Daily Sales Target Achieved (84.2%)</p>
                        <p className="text-[11px] text-[#A6A8B0] mt-0.5">
                          Commercial sales reached TZS 4,850,000 for today with 99.1% payment success rate.
                        </p>
                        <span className="text-[10px] text-[#70737C] font-mono mt-1 block">5 hours ago</span>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            )}
          </div>

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
