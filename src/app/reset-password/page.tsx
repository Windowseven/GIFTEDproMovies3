import React from 'react';
import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Set New Password — GIFTEDproMovies',
  description: 'Choose a new password for your GIFTEDproMovies account.',
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Create New Password"
      subtitle="Ensure your new password is secure and at least 6 characters long"
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
