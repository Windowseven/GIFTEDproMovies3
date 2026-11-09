'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import type { NotificationItem } from '@/lib/api/types';

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.readAt) {
      try {
        await markAsRead(notif.id);
      } catch {
        // Handled silently
      }
    }
  };

  const handleMarkAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markAllAsRead();
    } catch {
      // Handled silently
    }
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Notifications (${unreadCount} unread)`}
        className="relative p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition-colors focus:ring-2 focus:ring-[#D6A84F] focus:outline-none"
      >
        {/* Bell Icon (SVG) */}
        <svg
          className="w-5 h-5 transition-transform active:scale-95"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Live region for screen readers */}
        <span role="status" aria-atomic="true" className="sr-only">
          {unreadCount > 0 ? `${unreadCount} unread notifications` : 'No unread notifications'}
        </span>

        {/* Unread badge count */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-[#D6A84F] text-[#08090C] text-[11px] font-bold shadow-md animate-in fade-in zoom-in-75 duration-150"
            aria-hidden="true"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications panel"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-[#121318] border border-white/10 shadow-2xl z-50 overflow-hidden backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#161820]/90">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-white">Notifications</h3>
              {/* SSE Live status indicator */}
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
                title={isConnected ? 'Live real-time updates active' : 'Connecting for real-time updates...'}
                aria-label={isConnected ? 'Connected' : 'Connecting'}
              />
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="text-xs text-[#D6A84F] hover:text-[#e4be6c] font-medium transition-colors focus:outline-none focus:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="max-h-96 overflow-y-auto divide-y divide-white/5 overscroll-contain">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <svg
                  className="mx-auto h-8 w-8 text-neutral-500 mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <p className="text-sm font-medium text-neutral-300">No notifications yet</p>
                <p className="text-xs text-neutral-500 mt-1">
                  We will let you know when important account or system events occur.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.readAt;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNotificationClick(notif);
                      }
                    }}
                    className={`px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer text-left focus:outline-none focus:bg-white/5 ${
                      isUnread ? 'bg-white/[0.03] hover:bg-white/[0.07]' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    {/* Unread indicator dot */}
                    <div className="pt-1 flex-shrink-0">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          isUnread ? 'bg-[#D6A84F]' : 'bg-transparent'
                        }`}
                        aria-hidden="true"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-xs font-semibold truncate ${
                            isUnread ? 'text-white' : 'text-neutral-300'
                          }`}
                        >
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-neutral-500 whitespace-nowrap flex-shrink-0">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
