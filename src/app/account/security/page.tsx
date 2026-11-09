'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { authApi } from '@/lib/api/authApi';
import { useAuth } from '@/context/AuthContext';
import {
  Shield,
  KeyRound,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  UserX,
  ArrowLeft,
  Smartphone,
} from 'lucide-react';

export default function AccountSecurityPage() {
  const { isAuthenticated, user, isLoading: isAuthLoading, logout } = useAuth();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Logout all state
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
  const [logoutAllSuccess, setLogoutAllSuccess] = useState<string | null>(null);
  const [logoutAllError, setLogoutAllError] = useState<string | null>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordError('New password must contain at least one uppercase letter, one lowercase letter, and one number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await authApi.changePassword(currentPassword, newPassword);
      setPasswordSuccess(res.message || 'Password updated successfully. Other active sessions were invalidated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password. Please verify current password.';
      setPasswordError(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!confirm('Are you sure you want to sign out from all registered devices? This will invalidate all active sessions.')) {
      return;
    }

    setIsLoggingOutAll(true);
    setLogoutAllError(null);
    try {
      await authApi.logoutAll();
      setLogoutAllSuccess('All other sessions signed out. Redirecting...');
      setTimeout(() => {
        logout();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to terminate all sessions.';
      setLogoutAllError(msg);
      setIsLoggingOutAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      <CustomerHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#262932] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link
                href="/account/devices"
                className="text-gray-400 hover:text-white transition-colors text-xs font-mono inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Registered Devices
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Shield className="w-7 h-7 text-[#E50914]" />
              Account Security &amp; Access
            </h1>
            <p className="text-xs font-mono text-gray-400">
              Manage credential security, active session validity, and data protection settings.
            </p>
          </div>

          <Link
            href="/account/devices"
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#181A21] hover:bg-[#262932] border border-[#262932] text-xs font-mono text-gray-300 transition-colors inline-flex items-center gap-1.5"
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            Manage Devices →
          </Link>
        </div>

        {!isAuthenticated && !isAuthLoading && (
          <div className="p-8 rounded-3xl bg-[#111318] border border-[#262932] text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Sign In Required</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              You must be logged into your GIFTEDpro account to manage security settings and credentials.
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white font-bold text-xs font-mono transition-colors"
            >
              Sign In to Your Account
            </Link>
          </div>
        )}

        {isAuthenticated && (
          <div className="space-y-8">
            {/* Account Info Pill */}
            <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-mono uppercase text-gray-500">Authenticated Account</span>
                <p className="text-sm font-semibold text-white">{user?.email}</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Session Active (14d idle / 30d max)
              </div>
            </div>

            {/* Password Change Section */}
            <section className="p-6 sm:p-8 rounded-3xl bg-[#111318] border border-[#262932] space-y-6">
              <div className="flex items-start gap-3 border-b border-[#262932] pb-5">
                <div className="p-2.5 rounded-xl bg-[#181A21] border border-[#262932] text-[#E50914]">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Change Account Password</h2>
                  <p className="text-xs text-gray-400">
                    Updating your password will revoke all other active device sessions for your security.
                  </p>
                </div>
              </div>

              {passwordSuccess && (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-lg">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-300">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full px-4 py-2.5 bg-[#0C0D12] border border-[#262932] rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914] pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-300">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters (upper, lower, digit)"
                      className="w-full px-4 py-2.5 bg-[#0C0D12] border border-[#262932] rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914] pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] font-mono text-gray-500">
                    Must be at least 8 characters long and include an uppercase letter, lowercase letter, and number.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-300">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-4 py-2.5 bg-[#0C0D12] border border-[#262932] rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-6 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold text-xs font-mono transition-colors flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  {isChangingPassword ? 'Updating Password...' : 'Save New Password'}
                </button>
              </form>
            </section>

            {/* Active Sessions & Global Signout */}
            <section className="p-6 sm:p-8 rounded-3xl bg-[#111318] border border-[#262932] space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-[#181A21] border border-[#262932] text-amber-400">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Global Session Revocation</h2>
                  <p className="text-xs text-gray-400 leading-relaxed max-w-xl">
                    Lost a mobile phone or signed in on a shared computer? Terminate all active sessions across all devices immediately.
                  </p>
                </div>
              </div>

              {logoutAllSuccess && (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs">
                  {logoutAllSuccess}
                </div>
              )}

              {logoutAllError && (
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
                  {logoutAllError}
                </div>
              )}

              <button
                type="button"
                onClick={handleLogoutAll}
                disabled={isLoggingOutAll}
                className="px-5 py-2.5 rounded-xl bg-[#181A21] hover:bg-amber-950/30 border border-[#262932] hover:border-amber-500/50 text-amber-400 font-mono text-xs font-bold transition-colors inline-flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                {isLoggingOutAll ? 'Terminating Sessions...' : 'Sign Out of All Devices'}
              </button>
            </section>

            {/* Danger Zone: GDPR & Tanzania PDPA 2022 Data Erasure */}
            <section className="p-6 sm:p-8 rounded-3xl bg-[#111318] border border-red-950/60 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-400">
                  <UserX className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-red-400">Danger Zone: Account Deletion &amp; Data Erasure</h2>
                  <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">
                    Under Tanzania Personal Data Protection Act 2022 and GDPR Article 17, you have the right to request deletion of your account and personal identifiers.
                    Financial transaction ledgers and mobile money audit trails are retained for 7 years pursuant to statutory tax and anti-fraud regulations.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  href="/account-deletion"
                  className="px-5 py-2.5 rounded-xl bg-red-950/50 hover:bg-red-900/60 border border-red-500/50 text-red-300 font-mono text-xs font-bold transition-colors inline-flex items-center gap-2"
                >
                  <UserX className="w-4 h-4" />
                  Request Account Deletion &amp; Erasure →
                </Link>
                <Link
                  href="/privacy"
                  className="text-xs text-gray-400 hover:text-white underline font-mono"
                >
                  Review Privacy Policy
                </Link>
              </div>
            </section>
          </div>
        )}
      </main>

      <CustomerFooter />
    </div>
  );
}
