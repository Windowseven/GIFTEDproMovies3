'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AuthUser,
  AuthStatus,
  UserRole,
  LoginCredentials,
  RegisterCredentials,
  ForgotPasswordPayload,
  ResetPasswordPayload,
} from '@/types/auth';
import { authRepository } from '@/services/authRepository';

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | 'GUEST';
  status: AuthStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  retryAfter: number | null;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; user?: AuthUser; error?: string; errorCode?: string; retryAfter?: number }>;
  register: (credentials: RegisterCredentials) => Promise<{ success: boolean; message?: string; error?: string; retryAfter?: number }>;
  logout: () => Promise<void>;
  forgotPassword: (payload: ForgotPasswordPayload) => Promise<{ success: boolean; message?: string; error?: string }>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<{ success: boolean; message?: string; error?: string }>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const activeUser = await authRepository.getCurrentUser();
      if (activeUser) {
        setUser(activeUser);
        setStatus('AUTHENTICATED');
      } else {
        setUser(null);
        setStatus('UNAUTHENTICATED');
      }
    } catch {
      setUser(null);
      setStatus('UNAUTHENTICATED');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize from backend session on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const clearError = useCallback(() => {
    setError(null);
    setRetryAfter(null);
  }, []);

  const login = async (
    credentials: LoginCredentials,
  ): Promise<{ success: boolean; user?: AuthUser; error?: string; errorCode?: string; retryAfter?: number }> => {
    setError(null);
    setRetryAfter(null);
    setIsLoading(true);
    setStatus('LOADING');

    const res = await authRepository.login(credentials);
    setIsLoading(false);

    if (res.success && res.user) {
      setUser(res.user);
      setStatus('AUTHENTICATED');
      return { success: true, user: res.user };
    } else {
      setError(res.error || 'Authentication failed. Please check your credentials.');
      if (res.retryAfter) {
        setRetryAfter(res.retryAfter);
      }
      setStatus('ERROR');
      return {
        success: false,
        error: res.error,
        errorCode: res.errorCode,
        retryAfter: res.retryAfter,
      };
    }
  };

  const register = async (
    credentials: RegisterCredentials,
  ): Promise<{ success: boolean; message?: string; error?: string; retryAfter?: number }> => {
    setError(null);
    setRetryAfter(null);
    setIsLoading(true);
    setStatus('LOADING');

    const res = await authRepository.register(credentials);
    setIsLoading(false);

    if (res.success && res.user) {
      setUser(res.user);
      setStatus('AUTHENTICATED');
      return { success: true, message: res.message };
    } else {
      setError(res.error || 'Registration failed. Please check your details.');
      if (res.retryAfter) {
        setRetryAfter(res.retryAfter);
      }
      setStatus('ERROR');
      return {
        success: false,
        error: res.error,
        retryAfter: res.retryAfter,
      };
    }
  };

  const logout = async () => {
    setIsLoading(true);
    await authRepository.logout();
    setUser(null);
    setStatus('UNAUTHENTICATED');
    setError(null);
    setRetryAfter(null);
    setIsLoading(false);
  };

  const forgotPassword = async (payload: ForgotPasswordPayload) => {
    return await authRepository.forgotPassword(payload);
  };

  const resetPassword = async (payload: ResetPasswordPayload) => {
    return await authRepository.resetPassword(payload);
  };

  const role: UserRole | 'GUEST' = user ? user.role : 'GUEST';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        status,
        isAuthenticated,
        isLoading,
        error,
        retryAfter,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        clearError,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
