'use client';

import React, { useState } from 'react';
import { MediaTeamHeader } from '@/components/media-team/MediaTeamHeader';
import { MediaTeamSidebar } from '@/components/media-team/MediaTeamSidebar';
import { RoleGuard } from '@/components/auth/RoleGuard';

export default function MediaTeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <RoleGuard allowedRoles={['ADMIN', 'MEDIA_TEAM']}>
      <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col antialiased selection:bg-white/20 selection:text-white">
      {/* Media Team Header */}
      <MediaTeamHeader
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      <div className="flex-1 flex w-full">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <MediaTeamSidebar />
        </div>

        {/* Mobile Slide-in Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative w-64 max-w-[80vw] bg-[#08090C] h-full shadow-2xl z-10 flex flex-col border-r border-[#262932]">
              <MediaTeamSidebar
                onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main Workspace Area */}
        <main className="flex-1 p-4 lg:p-8 min-w-0 overflow-y-auto pb-12">
          {children}
        </main>
      </div>
    </div>
    </RoleGuard>
  );
}

