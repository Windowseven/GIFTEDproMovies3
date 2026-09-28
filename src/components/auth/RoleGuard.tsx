'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types/auth';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
}

export function RoleGuard({
  children,
  allowedRoles,
  fallback,
}: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isLoading) return;

    if (!isAuthenticated) {
      const returnUrl = encodeURIComponent(pathname);
      router.replace(`/login?returnTo=${returnUrl}`);
      return;
    }

    if (user && !allowedRoles.includes(user.role)) {
      router.replace('/unauthorized');
    }
  }, [mounted, isLoading, isAuthenticated, user, allowedRoles, pathname, router]);

  // Loading state during hydration or auth check
  if (!mounted || isLoading) {
    return (
      fallback || (
        <div className="min-h-screen bg-[#08090C] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
            <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">
              Verifying Authorization...
            </span>
          </div>
        </div>
      )
    );
  }

  // Not authenticated or not allowed
  if (!isAuthenticated || (user && !allowedRoles.includes(user.role))) {
    return (
      <div className="min-h-screen bg-[#08090C] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
          <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">
            Redirecting...
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
