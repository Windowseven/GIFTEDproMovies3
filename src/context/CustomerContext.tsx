'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CustomerProfile,
  CustomerEntitlement,
  ContinueWatchingItem,
} from '@/types/customer';
import {
  mockCustomerProfile,
  mockCustomerEntitlements,
  mockContinueWatching,
} from '@/data/mock/customerData';

import { useAuth } from '@/context/AuthContext';

export interface LipaTarget {
  isOpen: boolean;
  itemTitle: string;
  itemType: 'movie' | 'series' | 'subscription';
  accessType: 'stream' | 'download' | 'vip_pass';
  amountTsh: number;
  djName?: string;
  durationLabel?: string;
  itemSlug?: string;
  offerId?: string;
}

export interface TrailerTarget {
  isOpen: boolean;
  title: string;
  videoUrl?: string;
}

interface CustomerContextType {
  isAuthenticated: boolean;
  toggleAuth: () => void;
  profile: CustomerProfile;
  entitlements: CustomerEntitlement[];
  continueWatching: ContinueWatchingItem[];
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  trailerModal: TrailerTarget;
  openTrailer: (title: string, videoUrl?: string) => void;
  closeTrailer: () => void;
  lipaModal: LipaTarget;
  openLipa: (target: Omit<LipaTarget, 'isOpen'>) => void;
  closeLipa: () => void;
  completePurchase: (method: string, phone: string) => Promise<boolean>;
  lastPurchaseSuccess: boolean;
  resetPurchaseState: () => void;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [profile, setProfile] = useState<CustomerProfile>(mockCustomerProfile);
  const [entitlements, setEntitlements] = useState<CustomerEntitlement[]>([]);
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [lastPurchaseSuccess, setLastPurchaseSuccess] = useState<boolean>(false);

  const [trailerModal, setTrailerModal] = useState<TrailerTarget>({
    isOpen: false,
    title: '',
  });

  const [lipaModal, setLipaModal] = useState<LipaTarget>({
    isOpen: false,
    itemTitle: '',
    itemType: 'movie',
    accessType: 'stream',
    amountTsh: 0,
  });

  // Sync profile & live entitlements when auth user updates
  useEffect(() => {
    if (auth.user) {
      setProfile({
        id: auth.user.id,
        fullName: auth.user.displayName,
        email: auth.user.email,
        phoneMasked: '0754 ••• 456',
        avatarUrl: auth.user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        vipTierName: auth.user.vipTier || 'Customer',
        vipExpiresAt: '2026-12-31T23:59:59Z',
        isVip: auth.user.vipTier ? auth.user.vipTier.includes('VIP') : false,
      });

      // Fetch authentic customer entitlements from backend
      import('@/lib/api/commercialApi').then(({ commercialApi }) => {
        commercialApi.getMyLibrary().then((lib) => {
          if (lib && lib.exactEntitlements) {
            const mapped: CustomerEntitlement[] = lib.exactEntitlements.map((e) => ({
              id: e.id,
              itemTitle: 'Access Pass',
              itemSlug: e.targetMovieContentId || 'pass',
              itemType: e.targetKind === 'CATALOG' ? 'subscription' : 'movie',
              accessType: 'vip_pass',
              expiresAt: new Date(e.expiresAt).toLocaleDateString(),
              isActive: e.status === 'ACTIVE',
              orderNumber: `ORD-${e.id.slice(0, 4)}`,
              amountTsh: 0,
            }));
            setEntitlements(mapped);
          }
        }).catch(() => {
          setEntitlements([]);
        });
      });
    } else {
      setEntitlements([]);
    }
  }, [auth.user]);

  const isAuthenticated = auth.isAuthenticated;

  const toggleAuth = () => {
    if (auth.isAuthenticated) {
      auth.logout();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const openSearch = () => setIsSearchOpen(true);
  const closeSearch = () => setIsSearchOpen(false);

  const openTrailer = (title: string, videoUrl?: string) => {
    setTrailerModal({
      isOpen: true,
      title,
      videoUrl: videoUrl || 'https://www.w3schools.com/html/mov_bbb.mp4',
    });
  };

  const closeTrailer = () => {
    setTrailerModal((prev) => ({ ...prev, isOpen: false }));
  };

  const openLipa = (target: Omit<LipaTarget, 'isOpen'>) => {
    setLastPurchaseSuccess(false);
    setLipaModal({
      isOpen: true,
      ...target,
    });
  };

  const closeLipa = () => {
    setLipaModal((prev) => ({ ...prev, isOpen: false }));
  };

  const completePurchase = async (method: string, phone: string): Promise<boolean> => {
    // Simulate mobile money push and settlement
    return new Promise((resolve) => {
      setTimeout(() => {
        const newEntitlement: CustomerEntitlement = {
          id: `ent-${Date.now()}`,
          itemTitle: lipaModal.itemTitle,
          itemSlug: lipaModal.itemSlug || 'content',
          itemType: lipaModal.itemType,
          accessType: lipaModal.accessType,
          djName: lipaModal.djName,
          expiresAt: 'Oct 25, 2026',
          isActive: true,
          orderNumber: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
          amountTsh: lipaModal.amountTsh,
        };

        setEntitlements((prev) => [newEntitlement, ...prev]);
        setLastPurchaseSuccess(true);
        resolve(true);
      }, 1200);
    });
  };

  const resetPurchaseState = () => {
    setLastPurchaseSuccess(false);
  };

  // Keyboard shortcut ⌘K / Ctrl+K for global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setTrailerModal((prev) => ({ ...prev, isOpen: false }));
        setLipaModal((prev) => ({ ...prev, isOpen: false }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <CustomerContext.Provider
      value={{
        isAuthenticated,
        toggleAuth,
        profile,
        entitlements,
        continueWatching,
        isSearchOpen,
        openSearch,
        closeSearch,
        trailerModal,
        openTrailer,
        closeTrailer,
        lipaModal,
        openLipa,
        closeLipa,
        completePurchase,
        lastPurchaseSuccess,
        resetPurchaseState,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
}
