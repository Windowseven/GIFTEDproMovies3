'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, ArrowRight, AlertCircle, ShieldAlert, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/api/authApi';
import { PasswordField } from './PasswordField';
import { GoogleAuthButton } from './GoogleAuthButton';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const oauthError = searchParams.get('error');

  const { login, isLoading, error, retryAfter, clearError, user, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isUnverified, setIsUnverified] = useState<boolean>(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<boolean>(false);
  const [successRole, setSuccessRole] = useState<string | null>(null);

  // Auto-redirect if already logged in with valid session
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'ADMIN') {
        const dest =
          returnTo &&
          typeof returnTo === 'string' &&
          returnTo.startsWith('/admin') &&
          !returnTo.startsWith('//') &&
          !returnTo.includes('\\')
            ? returnTo
            : '/admin';
        window.location.href = dest;
      } else if (user.role === 'MEDIA_TEAM') {
        const dest =
          returnTo &&
          typeof returnTo === 'string' &&
          returnTo.startsWith('/media-team') &&
          !returnTo.startsWith('//') &&
          !returnTo.includes('\\')
            ? returnTo
            : '/media-team';
        window.location.href = dest;
      } else {
        const dest =
          returnTo &&
          typeof returnTo === 'string' &&
          returnTo.startsWith('/') &&
          !returnTo.startsWith('/admin') &&
          !returnTo.startsWith('/media-team') &&
          !returnTo.startsWith('//') &&
          !returnTo.includes('\\')
            ? returnTo
            : '/';
        window.location.href = dest;
      }
    }
  }, [isLoading, isAuthenticated, user, returnTo]);

  // Rate limit countdown effect
  useEffect(() => {
    if (retryAfter && retryAfter > 0) {
      setCountdown(retryAfter);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev && prev > 1) return prev - 1;
          clearInterval(interval);
          return null;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [retryAfter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setIsUnverified(false);
    setResendStatus(null);
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

    const res = await login({
      email: cleanEmail,
      password,
      rememberMe,
    });

    if (res.success && res.user) {
      const authenticatedRole = res.user.role;
      setLoginSuccess(true);
      setSuccessRole(authenticatedRole);

      // Authoritative Role-Based Destination Routing
      let destination: string;

      if (authenticatedRole === 'ADMIN') {
        // Admin credentials MUST direct to Admin panel (/admin)
        // Only allow deep-linking if returnTo is explicitly within /admin
        if (
          returnTo &&
          typeof returnTo === 'string' &&
          returnTo.startsWith('/admin') &&
          !returnTo.startsWith('//') &&
          !returnTo.includes('\\')
        ) {
          destination = returnTo;
        } else {
          destination = '/admin';
        }
      } else if (authenticatedRole === 'MEDIA_TEAM') {
        // Media Team credentials MUST direct to Media Team studio (/media-team)
        // Only allow deep-linking if returnTo is explicitly within /media-team
        if (
          returnTo &&
          typeof returnTo === 'string' &&
          returnTo.startsWith('/media-team') &&
          !returnTo.startsWith('//') &&
          !returnTo.includes('\\')
        ) {
          destination = returnTo;
        } else {
          destination = '/media-team';
        }
      } else {
        // Customer credentials MUST direct to Customer home (/)
        // Only allow deep-linking to customer-safe routes (disallow /admin or /media-team)
        if (
          returnTo &&
          typeof returnTo === 'string' &&
          returnTo.startsWith('/') &&
          !returnTo.startsWith('/admin') &&
          !returnTo.startsWith('/media-team') &&
          !returnTo.startsWith('//') &&
          !returnTo.includes('\\')
        ) {
          destination = returnTo;
        } else {
          destination = '/';
        }
      }

      // Allow feedback banner to render for 400ms before navigating
      setTimeout(() => {
        window.location.href = destination;
      }, 400);
    } else {
      if (res.errorCode === 'EMAIL_NOT_VERIFIED' || res.error?.toLowerCase().includes('not verified')) {
        setIsUnverified(true);
      }
      if (res.retryAfter) {
        setCountdown(res.retryAfter);
      }
    }
  };

  const handleResendVerification = async () => {
    if (!email) return;
    setIsResending(true);
    setResendStatus(null);
    try {
      const res = await authApi.resendVerification(email.trim());
      setResendStatus(res.message || 'Verification link sent! Please check your email.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send verification link';
      setResendStatus(`Error: ${msg}`);
    } finally {
      setIsResending(false);
    }
  };

  const activeError = validationError || error;
  const isSubmitDisabled = isLoading || (countdown !== null && countdown > 0);

  return (
    <div className="space-y-6">
      {/* Immediate Login Success Feedback */}
      {loginSuccess && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs shadow-lg animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <div>
            <p className="font-bold text-white">Authenticated Successfully</p>
            <p className="text-[11px] text-emerald-300">
              {successRole === 'ADMIN'
                ? 'Redirecting to Admin Control Panel...'
                : successRole === 'MEDIA_TEAM'
                ? 'Redirecting to Media Team Studio...'
                : 'Redirecting to your dashboard...'}
            </p>
          </div>
        </div>
      )}

      {/* Return-to context pill if present */}
      {returnTo && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#D6A84F]/10 border border-[#D6A84F]/30 text-xs text-[#D6A84F]">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Sign in required to continue to your requested action.</span>
        </div>
      )}

      {/* OAuth error alert */}
      {oauthError && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div className="space-y-0.5">
            <p className="font-semibold">Google Sign-In Notice</p>
            <p className="text-amber-200/90 leading-relaxed">
              Google authentication was not completed ({oauthError}). Please try again or sign in with your email and password.
            </p>
          </div>
        </div>
      )}

      {/* Rate limit banner */}
      {countdown !== null && countdown > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400">
          <Clock className="w-4 h-4 shrink-0 animate-pulse" />
          <span>Too many sign-in attempts. Please wait {countdown} seconds before retrying.</span>
        </div>
      )}

      {/* Google Authentication Button */}
      <GoogleAuthButton
        mode="signin"
        returnTo={returnTo}
        disabled={isLoading || (countdown !== null && countdown > 0)}
      />

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#262932]" />
        </div>
        <div className="relative px-3 bg-[#0E1015] text-[11px] font-mono text-gray-500 uppercase tracking-widest">
          or continue with email
        </div>
      </div>

      {/* Unverified account alert */}
      {isUnverified && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>Email verification required</span>
          </div>
          <p className="text-[11px] text-amber-200/80 leading-relaxed">
            Your email address has not been verified yet. Check your inbox or click below to receive a new link.
          </p>
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={isResending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold transition-all disabled:opacity-50"
          >
            {isResending ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Mail className="w-3 h-3" />
            )}
            <span>Resend Verification Link</span>
          </button>
          {resendStatus && (
            <p className="text-[11px] text-emerald-400 font-mono mt-1">{resendStatus}</p>
          )}
        </div>
      )}

      {/* Standard Error alert */}
      {activeError && !isUnverified && (
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
              disabled={isLoading || countdown !== null}
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
            disabled={isLoading || countdown !== null}
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

        {/* Session Expiry Disclosure */}
        <div className="p-3 rounded-xl bg-[#111318] border border-[#262932] text-[11px] text-gray-400 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          <span>Sessions remain securely active for 14 days idle (or 30 days maximum).</span>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="w-full py-3 px-4 rounded-xl bg-[#E50914] hover:bg-[#B11226] text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-[#E50914]/25 hover:shadow-[#E50914]/40 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Signing in...</span>
            </>
          ) : countdown !== null && countdown > 0 ? (
            <span>Wait {countdown}s</span>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

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
