'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Mail, ArrowRight, AlertCircle, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PasswordField } from './PasswordField';
import { GoogleAuthButton } from './GoogleAuthButton';

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  const { register, isLoading, error, retryAfter, clearError } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Mandatory Legal & Age Declarations (Strict 18+ approved policy; unchecked by default)
  const [isAgeDeclared, setIsAgeDeclared] = useState(false);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  
  const [validationError, setValidationError] = useState<string | null>(null);
  const [registrationSuccessMessage, setRegistrationSuccessMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

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
    clearError();

    const cleanUsername = username.trim();
    const cleanEmail = email.trim();

    if (!cleanUsername) {
      setValidationError('Username is required.');
      return;
    }
    if (cleanUsername.length < 3) {
      setValidationError('Username must be at least 3 characters.');
      return;
    }
    if (!cleanEmail) {
      setValidationError('Email is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setValidationError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setValidationError('Password is required.');
      return;
    }
    // Backend standard: min 8 chars, uppercase, lowercase, number
    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setValidationError('Password must contain at least one uppercase letter.');
      return;
    }
    if (!/[a-z]/.test(password)) {
      setValidationError('Password must contain at least one lowercase letter.');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setValidationError('Password must contain at least one number.');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    // Strict legal gate enforcement
    if (!isAgeDeclared) {
      setValidationError('You must confirm that you are at least 18 years old.');
      return;
    }
    if (!isTermsAccepted) {
      setValidationError('You must accept the Terms of Service and Privacy Policy to register.');
      return;
    }

    const res = await register({
      username: cleanUsername,
      email: cleanEmail,
      password,
      confirmPassword,
    });

    if (res.success) {
      setRegistrationSuccessMessage(
        res.message || 'Registration successful! We have sent an email verification link to your address. Please verify before signing in.'
      );
    }
  };

  const activeError = validationError || error;
  const isSubmitDisabled = isLoading || !isAgeDeclared || !isTermsAccepted || (countdown !== null && countdown > 0);

  const handleGoogleBeforeRedirect = () => {
    if (!isAgeDeclared) {
      setValidationError('Please check the 18+ age declaration below before continuing with Google.');
      return false;
    }
    if (!isTermsAccepted) {
      setValidationError('Please accept the Terms of Service and Privacy Policy below before continuing with Google.');
      return false;
    }
    return true;
  };

  // Success / Verification Notice Screen
  if (registrationSuccessMessage) {
    return (
      <div className="space-y-6 text-center py-4 animate-fadeIn">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-xl">
          <Mail className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white">Check Your Email</h3>
          <p className="text-xs text-gray-300 max-w-sm mx-auto leading-relaxed">
            {registrationSuccessMessage}
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#111318] border border-[#262932] text-xs text-gray-400 max-w-xs mx-auto">
          <span>Sent to: </span>
          <strong className="text-white font-mono">{email}</strong>
        </div>
        <div className="pt-2">
          <Link
            href={returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login'}
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#B11226] text-white font-bold text-xs shadow-lg transition-all"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rate limit warning */}
      {countdown !== null && countdown > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400">
          <Clock className="w-4 h-4 shrink-0 animate-pulse" />
          <span>Too many registration requests. Please wait {countdown} seconds before retrying.</span>
        </div>
      )}

      {/* Error alert */}
      {activeError && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">Registration notice</p>
            <p className="text-rose-300/90 leading-relaxed">{activeError}</p>
          </div>
        </div>
      )}

      {/* Google Sign-Up Button */}
      <GoogleAuthButton
        mode="signup"
        returnTo={returnTo}
        disabled={isLoading || (countdown !== null && countdown > 0)}
        onBeforeRedirect={handleGoogleBeforeRedirect}
      />

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#262932]" />
        </div>
        <div className="relative px-3 bg-[#0E1015] text-[11px] font-mono text-gray-500 uppercase tracking-widest">
          or register with email
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username Field */}
        <div className="space-y-1.5">
          <label htmlFor="username" className="text-xs font-semibold text-gray-300">
            Username
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
              <User className="w-4 h-4" />
            </div>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              disabled={isLoading || countdown !== null}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. juma_movies"
              className="w-full pl-10 pr-4 py-2.5 bg-[#111318] border border-[#262932] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]/20 hover:border-gray-600 transition-all"
            />
          </div>
        </div>

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
              placeholder="e.g. juma@gmail.com"
              className="w-full pl-10 pr-4 py-2.5 bg-[#111318] border border-[#262932] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]/20 hover:border-gray-600 transition-all"
            />
          </div>
        </div>

        {/* Password Field */}
        <PasswordField
          id="password"
          name="password"
          label="Password"
          autoComplete="new-password"
          placeholder="Min 8 characters (A-Z, a-z, 0-9)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading || countdown !== null}
        />

        {/* Confirm Password Field */}
        <PasswordField
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm Password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading || countdown !== null}
        />

        {/* Password Requirements Guide */}
        <div className="p-3 rounded-xl bg-[#111318] border border-[#262932] space-y-1 text-[11px] text-gray-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className={`w-3.5 h-3.5 ${password.length >= 8 ? 'text-emerald-400' : 'text-gray-600'}`} />
            <span>At least 8 characters long</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className={`w-3.5 h-3.5 ${/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-emerald-400' : 'text-gray-600'}`} />
            <span>Uppercase and lowercase letters</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className={`w-3.5 h-3.5 ${/[0-9]/.test(password) ? 'text-emerald-400' : 'text-gray-600'}`} />
            <span>At least one number</span>
          </div>
        </div>

        {/* MANDATORY LEGAL & AGE DECLARATIONS (Unchecked by default) */}
        <div className="pt-2 space-y-3 border-t border-[#262932]">
          {/* Declaration 1: Strict 18+ Age Declaration */}
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-300 select-none group">
            <input
              type="checkbox"
              id="age-declaration"
              checked={isAgeDeclared}
              onChange={(e) => setIsAgeDeclared(e.target.checked)}
              disabled={isLoading}
              className="mt-0.5 w-4 h-4 rounded bg-[#111318] border-[#262932] text-[#E50914] focus:ring-[#E50914]/30 focus:ring-offset-0 focus:ring-1 shrink-0"
            />
            <span className="leading-snug">
              I declare that I am at least <strong>18 years of age</strong> (Strict 18+ policy for V1 accounts).
            </span>
          </label>

          {/* Declaration 2: Terms of Service & Privacy Policy Acceptance */}
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-300 select-none group">
            <input
              type="checkbox"
              id="terms-acceptance"
              checked={isTermsAccepted}
              onChange={(e) => setIsTermsAccepted(e.target.checked)}
              disabled={isLoading}
              className="mt-0.5 w-4 h-4 rounded bg-[#111318] border-[#262932] text-[#E50914] focus:ring-[#E50914]/30 focus:ring-offset-0 focus:ring-1 shrink-0"
            />
            <span className="leading-snug">
              I have read and agree to the{' '}
              <Link href="/terms" target="_blank" className="text-[#D6A84F] hover:underline font-semibold">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" target="_blank" className="text-[#D6A84F] hover:underline font-semibold">
                Privacy Policy
              </Link>.
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="w-full py-3 px-4 rounded-xl bg-[#E50914] hover:bg-[#B11226] text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-[#E50914]/25 hover:shadow-[#E50914]/40 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Registering account...</span>
            </>
          ) : countdown !== null && countdown > 0 ? (
            <span>Wait {countdown}s</span>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Login redirect link */}
      <div className="text-center pt-2 text-xs text-gray-400">
        Already have an account?{' '}
        <Link
          href={returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login'}
          className="text-white font-semibold hover:text-[#E50914] transition-colors"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
