'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, ArrowRight, AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PasswordField } from './PasswordField';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  const { login, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearError();

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setValidationError('Email is required.');
      return;
    }
    if (!password) {
      setValidationError('Password is required.');
      return;
    }

    const success = await login({
      email: cleanEmail,
      password,
      rememberMe,
    });

    if (success) {
      if (returnTo && returnTo.startsWith('/')) {
        router.push(returnTo);
      } else {
        // Direct to role-appropriate home
        const stored = localStorage.getItem('giftedpro_auth_user');
        if (stored) {
          try {
            const user = JSON.parse(stored);
            if (user.role === 'ADMIN') {
              router.push('/admin');
              return;
            } else if (user.role === 'MEDIA_TEAM') {
              router.push('/media-team');
              return;
            }
          } catch {}
        }
        router.push('/');
      }
    }
  };

  // Quick fill demo credentials helper
  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Windowseven77.');
    setValidationError(null);
    clearError();
  };

  const activeError = validationError || error;

  return (
    <div className="space-y-6">
      {/* Return-to context pill if present */}
      {returnTo && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#D6A84F]/10 border border-[#D6A84F]/30 text-xs text-[#D6A84F]">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Sign in required to continue to your requested action.</span>
        </div>
      )}

      {/* Error alert */}
      {activeError && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">Sign in failed</p>
            <p className="text-rose-300/90 leading-relaxed">{activeError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-semibold text-gray-300">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              disabled={isLoading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. user@gmail.com"
              className="w-full pl-10 pr-4 py-2.5 bg-[#111318] border border-[#262932] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]/20 hover:border-gray-600 transition-all"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1">
          <PasswordField
            id="password"
            name="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
          <div className="flex justify-end pt-1">
            <Link
              href="/forgot-password"
              className="text-xs text-gray-400 hover:text-[#E50914] transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {/* Remember Me Checkbox */}
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded bg-[#111318] border-[#262932] text-[#E50914] focus:ring-[#E50914]/30 focus:ring-offset-0 focus:ring-1"
          />
          <span>Remember me on this browser</span>
        </label>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-xl bg-[#E50914] hover:bg-[#B11226] text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-[#E50914]/25 hover:shadow-[#E50914]/40 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Quick Demo Test Accounts Box */}
      <div className="p-3.5 rounded-xl bg-[#111318] border border-[#262932] space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-[#D6A84F]">
          <span className="flex items-center gap-1 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Quick Demo Accounts
          </span>
          <span className="text-[10px] text-gray-500">1-click fill</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleQuickFill('admin@gmail.com')}
            className="py-1.5 px-2 rounded-lg bg-[#181A21] border border-[#262932] hover:border-red-500/50 hover:bg-[#1E202A] text-[11px] font-medium text-gray-200 transition-all text-center truncate"
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('media@gmail.com')}
            className="py-1.5 px-2 rounded-lg bg-[#181A21] border border-[#262932] hover:border-blue-500/50 hover:bg-[#1E202A] text-[11px] font-medium text-gray-200 transition-all text-center truncate"
          >
            Media Team
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('user@gmail.com')}
            className="py-1.5 px-2 rounded-lg bg-[#181A21] border border-[#262932] hover:border-amber-500/50 hover:bg-[#1E202A] text-[11px] font-medium text-gray-200 transition-all text-center truncate"
          >
            Customer
          </button>
        </div>
        <p className="text-[10px] text-gray-500 text-center font-mono">
          Password: Windowseven77.
        </p>
      </div>

      {/* Register redirect link */}
      <div className="text-center pt-2 text-xs text-gray-400">
        Don&apos;t have an account?{' '}
        <Link
          href={returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : '/register'}
          className="text-white font-semibold hover:text-[#E50914] transition-colors"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}
