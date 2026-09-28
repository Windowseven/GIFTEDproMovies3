import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata: Metadata = {
  title: 'Create Account — GIFTEDproMovies',
  description: 'Create your GIFTEDproMovies account to watch and download the finest Swahili translated cinema and series.',
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create Account"
      subtitle="Join GIFTEDproMovies to unlock certified DJ releases and offline viewing"
    >
      <Suspense
        fallback={
          <div className="py-8 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#E50914]/30 border-t-[#E50914] rounded-full animate-spin" />
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
