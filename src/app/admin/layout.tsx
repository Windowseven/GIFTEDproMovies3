'use client';

import React, { useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { RoleGuard } from '@/components/auth/RoleGuard';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col font-sans">
      {/* Top Header */}
      <AdminHeader
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex max-w-[1720px] w-full mx-auto relative">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <AdminSidebar />
        </div>

        {/* Mobile Sidebar Drawer Overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative z-50 w-72 bg-[#08090C] h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
              <AdminSidebar onCloseMobileMenu={() => setIsMobileMenuOpen(false)} />
            </div>
          </div>
        )}

        {/* Primary Page Content */}
        <main className="flex-1 min-w-0 pb-10 p-3 sm:p-5 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
    </RoleGuard>
  );
}
