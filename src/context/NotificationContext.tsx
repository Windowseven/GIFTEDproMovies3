'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useAuth } from './AuthContext';
import { notificationsApi } from '@/lib/api/notificationsApi';
import type { NotificationItem } from '@/lib/api/types';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Reconcile and deduplicate notifications list by stable ID
function reconcileNotifications(
  fetchedList: NotificationItem[],
  previousList: NotificationItem[],
): NotificationItem[] {
  const map = new Map<string, NotificationItem>();
  for (const item of previousList) {
    map.set(item.id, item);
  }
  for (const item of fetchedList) {
    map.set(item.id, item);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id;

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  // Fetch initial or reconciliation state via REST
  const syncWithRest = useCallback(async () => {
    if (!isAuthenticated || !userId) return;
    try {
      setIsLoading(true);
      const [list, count] = await Promise.all([
        notificationsApi.listNotifications({ limit: 50 }),
        notificationsApi.getUnreadCount(),
      ]);
      if (isMountedRef.current) {
        setNotifications((prev) => reconcileNotifications(list, prev));
        setUnreadCount(count);
        setError(null);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch notifications';
        setError(msg);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [isAuthenticated, userId]);

  // Connect to SSE stream
  const connectSSE = useCallback(() => {
    if (!isAuthenticated || !userId || typeof window === 'undefined') return;

    // Clean up any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      const streamUrl = notificationsApi.getStreamUrl();
      const es = new EventSource(streamUrl, { withCredentials: true });
      eventSourceRef.current = es;

      es.onopen = () => {
        if (isMountedRef.current) {
          setIsConnected(true);
          reconnectAttemptRef.current = 0;
          // Sync any notifications that arrived while reconnecting
          syncWithRest();
        }
      };

      es.addEventListener('connected', () => {
        if (isMountedRef.current) {
          setIsConnected(true);
        }
      });

      es.addEventListener('heartbeat', () => {
        if (isMountedRef.current) {
          setIsConnected(true);
        }
      });

      es.addEventListener('notification', (event: MessageEvent) => {
        try {
          const newNotif = JSON.parse(event.data) as NotificationItem;
          if (isMountedRef.current && newNotif?.id) {
            setNotifications((prev) => {
              if (prev.some((n) => n.id === newNotif.id)) {
                return prev;
              }
              return [newNotif, ...prev];
            });
            if (!newNotif.readAt) {
              setUnreadCount((c) => c + 1);
            }
          }
        } catch {
          // Ignore parse errors on malformed messages
        }
      });

      es.onerror = () => {
        if (isMountedRef.current) {
          setIsConnected(false);
        }

        // Native EventSource automatically reconnects when readyState is CONNECTING (0).
        // Only if readyState is CLOSED (2) do we need to manually instantiate a new connection.
        if (es.readyState === EventSource.CLOSED) {
          es.close();
          eventSourceRef.current = null;

          const attempt = reconnectAttemptRef.current;
          const delay = Math.min(1500 * Math.pow(1.5, attempt), 30000);
          reconnectAttemptRef.current += 1;

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && isAuthenticated && userId) {
              connectSSE();
            }
          }, delay);
        }
      };
    } catch {
      if (isMountedRef.current) {
        setIsConnected(false);
      }
    }
  }, [isAuthenticated, userId, syncWithRest]);

  // Lifecycle coordination - strictly tied to authentication state and userId
  useEffect(() => {
    isMountedRef.current = true;

    if (isAuthenticated && userId) {
      syncWithRest();
      connectSSE();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setIsConnected(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    }

    return () => {
      isMountedRef.current = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [isAuthenticated, userId, syncWithRest, connectSSE]);

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await notificationsApi.markAsRead(id);
    } catch (err: unknown) {
      // Revert if API failed
      await syncWithRest();
      throw err;
    }
  }, [syncWithRest]);

  const markAllAsRead = useCallback(async () => {
    const nowIso = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || nowIso })));
    setUnreadCount(0);

    try {
      await notificationsApi.markAllAsRead();
    } catch (err: unknown) {
      await syncWithRest();
      throw err;
    }
  }, [syncWithRest]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        isLoading,
        error,
        markAsRead,
        markAllAsRead,
        refresh: syncWithRest,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
