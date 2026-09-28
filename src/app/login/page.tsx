import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Sign In — GIFTEDproMovies',
  description: 'Sign in to your GIFTEDproMovies account to access your stream passes, downloads, and personal library.',
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome Back"
      subtitle="Sign in to continue your East African cinematic experience"
    >
      <Suspense
        fallback={
          <div className="py-8 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#E50914]/30 border-t-[#E50914] rounded-full animate-spin" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
