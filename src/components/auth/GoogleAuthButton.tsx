'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';

interface GoogleAuthButtonProps {
  mode?: 'signin' | 'signup';
  returnTo?: string | null;
  disabled?: boolean;
  onBeforeRedirect?: () => boolean; // return false to halt redirect (e.g. if terms not accepted)
}

export function GoogleAuthButton({
  mode = 'signin',
  returnTo: customReturnTo,
  disabled = false,
  onBeforeRedirect,
}: GoogleAuthButtonProps) {
  const searchParams = useSearchParams();
  const returnTo = customReturnTo ?? searchParams.get('returnTo');

  const handleGoogleAuth = () => {
    if (disabled) return;
    if (onBeforeRedirect && !onBeforeRedirect()) {
      return;
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001/api/v1';
    const params = new URLSearchParams();
    if (returnTo && returnTo.startsWith('/')) {
      params.set('returnTo', returnTo);
    }

    const queryString = params.toString();
    const targetUrl = `${backendUrl}/auth/google${queryString ? `?${queryString}` : ''}`;

    window.location.href = targetUrl;
  };

  const actionText = mode === 'signup' ? 'Sign up with Google' : 'Continue with Google';

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={disabled}
        aria-label={actionText}
        className="w-full py-2.5 px-4 rounded-xl bg-[#16181F] hover:bg-[#1E212B] border border-[#262932] hover:border-gray-500 text-white font-medium text-sm transition-all shadow-sm active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
      >
        {/* Official Google G Logo (SVG) */}
        <svg
          className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span className="text-gray-200 group-hover:text-white transition-colors">
          {actionText}
        </span>
      </button>

      {/* Scope Disclaimer required by Privacy Policy §3.2 and Google User Data Policy */}
      <p className="text-[10px] text-gray-500 text-center leading-tight">
        We only receive your name and verified email address.
      </p>
    </div>
  );
}
