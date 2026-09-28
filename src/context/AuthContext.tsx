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
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (credentials: RegisterCredentials) => Promise<boolean>;
  logout: () => void;
  forgotPassword: (payload: ForgotPasswordPayload) => Promise<{ success: boolean; message?: string; error?: string }>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<{ success: boolean; message?: string; error?: string }>;
  switchMockRole: (role: UserRole | 'GUEST') => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize from storage on client mount
  useEffect(() => {
    const existing = authRepository.getCurrentUser();
    if (existing) {
      setUser(existing);
      setStatus('AUTHENTICATED');
    } else {
      setStatus('UNAUTHENTICATED');
    }
    setIsLoading(false);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    setStatus('LOADING');

    const res = await authRepository.login(credentials);
    setIsLoading(false);

    if (res.success && res.user) {
      setUser(res.user);
      setStatus('AUTHENTICATED');
      return true;
    } else {
      setError(res.error || 'Authentication failed. Please check your credentials.');
      setStatus('ERROR');
      return false;
    }
  };

  const register = async (credentials: RegisterCredentials): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    setStatus('LOADING');

    const res = await authRepository.register(credentials);
    setIsLoading(false);

    if (res.success && res.user) {
      setUser(res.user);
      setStatus('AUTHENTICATED');
      return true;
    } else {
      setError(res.error || 'Registration failed. Please check your details.');
      setStatus('ERROR');
      return false;
    }
  };

  const logout = () => {
    authRepository.logout();
    setUser(null);
    setStatus('UNAUTHENTICATED');
    setError(null);
  };

  const forgotPassword = async (payload: ForgotPasswordPayload) => {
    return await authRepository.forgotPassword(payload);
  };

  const resetPassword = async (payload: ResetPasswordPayload) => {
    return await authRepository.resetPassword(payload);
  };

  const switchMockRole = (targetRole: UserRole | 'GUEST') => {
    const updatedUser = authRepository.switchMockRole(targetRole);
    if (updatedUser) {
      setUser(updatedUser);
      setStatus('AUTHENTICATED');
    } else {
      setUser(null);
      setStatus('UNAUTHENTICATED');
    }
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
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        switchMockRole,
        clearError,
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
