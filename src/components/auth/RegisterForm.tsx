'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PasswordField } from './PasswordField';

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  const { register, isLoading, error, clearError } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

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
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    const success = await register({
      username: cleanUsername,
      email: cleanEmail,
      password,
      confirmPassword,
    });

    if (success) {
      if (returnTo && returnTo.startsWith('/')) {
        router.push(returnTo);
      } else {
        router.push('/');
      }
    }
  };

  const activeError = validationError || error;

  return (
    <div className="space-y-6">
      {/* Error alert */}
      {activeError && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">Registration failed</p>
            <p className="text-rose-300/90 leading-relaxed">{activeError}</p>
          </div>
        </div>
      )}

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
              disabled={isLoading}
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
              disabled={isLoading}
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
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
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
          disabled={isLoading}
        />

        {/* Password requirements hint */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Must be at least 6 characters long</span>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-xl bg-[#E50914] hover:bg-[#B11226] text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-[#E50914]/25 hover:shadow-[#E50914]/40 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Creating account...</span>
            </>
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
