/**
 * GIFTEDproMovies Authentication & Authorization Types
 * Aligned with MD-08 (Data Models) and MD-14 (Authentication UI)
 */

export type UserRole = 'ADMIN' | 'MEDIA_TEAM' | 'CUSTOMER';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string | null;
  vipTier?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AuthStatus =
  | 'IDLE'
  | 'LOADING'
  | 'AUTHENTICATED'
  | 'UNAUTHENTICATED'
  | 'ERROR';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  password: string;
  confirmPassword: string;
  token?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
  message?: string;
}
