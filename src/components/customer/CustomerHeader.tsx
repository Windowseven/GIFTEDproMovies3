'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  Menu,
  X,
  Crown,
  Film,
  Tv,
  Mic,
  Grid,
  Shield,
  Layers,
  Sparkles,
  User,
  ArrowRight,
  LogOut,
  ChevronDown,
  Receipt,
  Smartphone,
  KeyRound,
} from 'lucide-react';
import { CustomerBrandLogo } from './CustomerBrandLogo';
import { useCustomer } from '@/context/CustomerContext';
import { useAuth } from '@/context/AuthContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export function CustomerHeader() {
  const pathname = usePathname();
  const { isAuthenticated, profile, openSearch } = useCustomer();
  const { user, role, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/movies', label: 'Movies' },
    { href: '/series', label: 'Series' },
    { href: '/categories', label: 'Categories' },
    { href: '/djs', label: 'DJs & Translators' },
    { href: '/subscriptions', label: 'VIP Passes', highlight: true },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#08090C]/90 backdrop-blur-xl border-b border-[#262932]/70 shadow-2xl py-3'
            : 'bg-gradient-to-b from-[#08090C]/90 via-[#08090C]/40 to-transparent py-4 sm:py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Left: Brand Logo & Desktop Nav */}
          <div className="flex items-center gap-8 lg:gap-10">
            <CustomerBrandLogo showSubtitle={false} />

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative py-1 transition-colors duration-200 ${
                      isActive
                        ? 'text-white font-semibold'
                        : 'text-[#A6A8B0] hover:text-white'
                    } ${link.highlight ? 'text-[#D6A84F] hover:text-[#F59E0B]' : ''}`}
                  >
                    {link.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#E50914] rounded-full" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Search, Library, Auth & Mobile Menu Button */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Search Trigger (⌘K) */}
            <button
              onClick={openSearch}
              className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-full bg-[#111318]/80 hover:bg-[#181A21] border border-[#262932] text-[#A6A8B0] hover:text-white transition-all text-xs active:scale-95"
              aria-label="Search movies, series, DJs"
            >
              <Search className="w-4 h-4 text-gray-400" />
              <span className="hidden sm:inline font-sans text-xs">Search titles, DJs...</span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#181A21] border border-[#262932] text-[10px] font-mono text-gray-400">
                ⌘K
              </kbd>
            </button>

            {/* My Library Button (Visible on tablet & desktop) */}
            <Link
              href="/library"
              className={`hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all ${
                pathname === '/library'
                  ? 'bg-white text-[#08090C] border-white'
                  : 'bg-[#111318] text-white border-[#262932] hover:border-white/30'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Library</span>
            </Link>

            {/* Notification Bell (for authenticated customers) */}
            {isAuthenticated && <NotificationBell />}

            {/* Guest vs Authenticated Mode Dropdown / Button */}
            <div className="relative">
              {isAuthenticated ? (
                <button
                  onClick={() => setShowProfileMenu((prev) => !prev)}
                  className="flex items-center gap-2 p-1 pl-2 sm:pr-3 rounded-full bg-[#181A21] border border-[#262932] hover:border-[#D6A84F]/50 transition-all text-xs"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#E50914] to-[#D6A84F] flex items-center justify-center font-bold text-white text-[11px] shadow-sm">
                    {profile.fullName.charAt(0)}
                  </div>
                  <span className="hidden md:inline font-medium text-white text-xs max-w-[100px] truncate">
                    {profile.fullName.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:inline" />
                </button>
              ) : (
                <Link
                  href={pathname === '/' ? '/login' : `/login?returnTo=${encodeURIComponent(pathname)}`}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#E50914] hover:bg-[#B11226] text-white text-xs font-bold transition-all shadow-md shadow-[#E50914]/20 active:scale-95"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
              )}

              {/* Profile Menu Popup */}
              {showProfileMenu && isAuthenticated && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#111318] border border-[#262932] p-2 shadow-2xl z-50 animate-modal-enter"
                  onMouseLeave={() => setShowProfileMenu(false)}
                >
                  <div className="p-2 border-b border-[#262932] mb-1">
                    <p className="text-xs font-bold text-white truncate">{user?.displayName || profile.fullName}</p>
                    <p className="text-[11px] text-gray-400 truncate">{user?.email || profile.email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D6A84F]/15 border border-[#D6A84F]/30 text-[10px] font-mono text-[#D6A84F] font-bold">
                        <Crown className="w-3 h-3" />
                        <span>{user?.vipTier || profile.vipTierName}</span>
                      </span>
                      {role !== 'CUSTOMER' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#E50914]/20 border border-[#E50914]/30 text-[#E50914]">
                          {role}
                        </span>
                      )}
                    </div>
                  </div>

                  <Link
                    href="/library"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-[#181A21] rounded-xl transition-colors"
                  >
                    <Film className="w-4 h-4 text-gray-400" />
                    <span>My Library &amp; Passes</span>
                  </Link>

                  <Link
                    href="/account/orders"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-[#181A21] rounded-xl transition-colors"
                  >
                    <Receipt className="w-4 h-4 text-gray-400" />
                    <span>Orders &amp; Receipts</span>
                  </Link>

                  <Link
                    href="/subscriptions"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#D6A84F] hover:bg-[#181A21] rounded-xl transition-colors"
                  >
                    <Crown className="w-4 h-4" />
                    <span>VIP Passes &amp; Perks</span>
                  </Link>

                  <Link
                    href="/account/devices"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-[#181A21] rounded-xl transition-colors"
                  >
                    <Smartphone className="w-4 h-4 text-gray-400" />
                    <span>Registered Devices</span>
                  </Link>

                  <Link
                    href="/account/security"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-[#181A21] rounded-xl transition-colors"
                  >
                    <KeyRound className="w-4 h-4 text-gray-400" />
                    <span>Security &amp; Password</span>
                  </Link>

                  {(role === 'ADMIN' || role === 'MEDIA_TEAM') && (
                    <>
                      <div className="border-t border-[#262932] my-1" />
                      <div className="px-3 py-1 text-[10px] font-mono text-gray-500 uppercase">
                        Staff Workspace
                      </div>
                      {role === 'ADMIN' && (
                        <Link
                          href="/admin"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-[#181A21] rounded-xl transition-colors"
                        >
                          <Shield className="w-3.5 h-3.5 text-[#E50914]" />
                          <span>Admin Control</span>
                        </Link>
                      )}
                      <Link
                        href="/media-team"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-[#181A21] rounded-xl transition-colors"
                      >
                        <Layers className="w-3.5 h-3.5 text-blue-400" />
                        <span>Media Team Studio</span>
                      </Link>
                    </>
                  )}

                  <div className="border-t border-[#262932] my-1" />

                  <button
                    onClick={() => {
                      logout();
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl bg-[#111318] border border-[#262932] text-gray-300 hover:text-white"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-billboard-fade">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute top-0 right-0 bottom-0 w-4/5 max-w-sm bg-[#0E1015] border-l border-[#262932] p-6 flex flex-col justify-between overflow-y-auto animate-sheet-up">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#262932]">
                <CustomerBrandLogo />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg bg-[#181A21] border border-[#262932] text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Guest / User Status in Drawer */}
              <div className="p-3.5 rounded-2xl bg-[#111318] border border-[#262932]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#E50914] to-[#D6A84F] flex items-center justify-center font-bold text-white text-xs">
                      {isAuthenticated ? (user?.displayName || profile.fullName).charAt(0) : 'G'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">
                        {isAuthenticated ? (user?.displayName || profile.fullName) : 'Guest Explorer'}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {isAuthenticated ? (user?.vipTier || profile.vipTierName) : 'Preview Access'}
                      </p>
                    </div>
                  </div>
                  {isAuthenticated ? (
                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="text-[11px] font-bold text-rose-400 hover:underline"
                    >
                      Sign Out
                    </button>
                  ) : (
                    <Link
                      href={pathname === '/' ? '/login' : `/login?returnTo=${encodeURIComponent(pathname)}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-[11px] font-bold text-[#E50914] hover:underline"
                    >
                      Sign In
                    </Link>
                  )}
                </div>
              </div>

              {/* Mobile Navigation Links */}
              <div className="space-y-1">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[#E50914] text-white font-bold'
                          : 'text-gray-300 hover:bg-[#181A21] hover:text-white'
                      }`}
                    >
                      <span>{link.label}</span>
                      <ArrowRight className="w-4 h-4 opacity-50" />
                    </Link>
                  );
                })}
                <Link
                  href="/library"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:bg-[#181A21] hover:text-white"
                >
                  <span>My Library</span>
                  <Film className="w-4 h-4 opacity-50" />
                </Link>
                {isAuthenticated && (
                  <>
                    <Link
                      href="/account/orders"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:bg-[#181A21] hover:text-white"
                    >
                      <span>Orders &amp; Receipts</span>
                      <Receipt className="w-4 h-4 opacity-50" />
                    </Link>
                    <Link
                      href="/account/devices"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:bg-[#181A21] hover:text-white"
                    >
                      <span>Registered Devices</span>
                      <Smartphone className="w-4 h-4 opacity-50" />
                    </Link>
                    <Link
                      href="/account/security"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:bg-[#181A21] hover:text-white"
                    >
                      <span>Account Security</span>
                      <KeyRound className="w-4 h-4 opacity-50" />
                    </Link>
                  </>
                )}
              </div>

              {/* Staff Switcher inside mobile drawer */}
              <div className="pt-4 border-t border-[#262932] space-y-2">
                <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                  Internal Staff Portals
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 rounded-xl bg-[#111318] border border-[#262932] text-xs text-gray-300 hover:text-white flex items-center justify-center gap-1.5"
                  >
                    <Shield className="w-3.5 h-3.5 text-[#E50914]" />
                    <span>Admin</span>
                  </Link>
                  <Link
                    href="/media-team"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 rounded-xl bg-[#111318] border border-[#262932] text-xs text-gray-300 hover:text-white flex items-center justify-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    <span>Media Studio</span>
                  </Link>
                </div>
              </div>
            </div>

            <div className="pt-6 text-center text-xs text-gray-500">
              <p>GIFTEDproMovies © 2026</p>
              <p className="text-[10px] pt-1">Swahili Dubbing &amp; Global Cinema</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
