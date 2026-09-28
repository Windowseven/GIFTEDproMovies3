import React from 'react';
import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Forgot Password — GIFTEDproMovies',
  description: 'Recover access to your GIFTEDproMovies account.',
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset Password"
      subtitle="Enter your email to receive password recovery instructions"
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
