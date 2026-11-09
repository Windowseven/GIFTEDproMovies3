import {
  AuthUser,
  LoginCredentials,
  RegisterCredentials,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  AuthResponse,
  UserRole,
} from '@/types/auth';
import { authApi } from '@/lib/api/authApi';
import { ApiError, UserProfile } from '@/lib/api/types';

function mapProfileToAuthUser(profile: UserProfile): AuthUser {
  let role: UserRole = 'CUSTOMER';
  if (profile.role === 'admin') role = 'ADMIN';
  else if (profile.role === 'media_team') role = 'MEDIA_TEAM';

  const namePart = profile.email.split('@')[0];
  const capitalizedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

  return {
    id: profile.id,
    email: profile.email,
    username: namePart,
    displayName: capitalizedName,
    role,
    avatarUrl: null,
    vipTier: role === 'CUSTOMER' ? 'Standard Customer' : undefined,
    isActive: profile.status === 'active',
    createdAt: profile.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

class AuthRepository {
  /**
   * Retrieve current active session from authoritative backend cookie session
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const res = await authApi.getMe();
      const profile = res?.user || (res as unknown as { data?: { user?: typeof res.user } })?.data?.user;
      if (profile) {
        return mapProfileToAuthUser(profile);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Authenticate with email & password against backend API
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse & { retryAfter?: number; errorCode?: string }> {
    try {
      const res = await authApi.login(credentials.email, credentials.password);
      const profile = res?.user || (res as unknown as { data?: { user?: typeof res.user } })?.data?.user;
      if (profile) {
        const authUser = mapProfileToAuthUser(profile);
        return {
          success: true,
          user: authUser,
          message: 'Signed in successfully',
        };
      }
      return {
        success: false,
        error: 'Failed to authenticate with server',
      };
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        return {
          success: false,
          error: err.message,
          errorCode: err.errorName,
          retryAfter: err.retryAfter,
        };
      }
      const message = err instanceof Error ? err.message : 'Login failed';
      return { success: false, error: message };
    }
  }

  /**
   * Register customer account via backend API
   */
  async register(credentials: RegisterCredentials): Promise<AuthResponse & { retryAfter?: number }> {
    try {
      const res = await authApi.register(credentials.email, credentials.password);
      const profile = res?.user || (res as unknown as { data?: { user?: typeof res.user } })?.data?.user;
      if (profile) {
        const authUser = mapProfileToAuthUser(profile);
        return {
          success: true,
          user: authUser,
          message: res.message || 'Registration successful. Please verify your email.',
        };
      }
      return {
        success: false,
        error: 'Registration failed on server',
      };
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        return {
          success: false,
          error: err.message,
          retryAfter: err.retryAfter,
        };
      }
      const message = err instanceof Error ? err.message : 'Registration failed';
      return { success: false, error: message };
    }
  }

  /**
   * Terminate active backend session
   */
  async logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch (e) {
      console.warn('Backend logout call returned error', e);
    }
  }

  /**
   * Request password reset token via email
   */
  async forgotPassword(payload: ForgotPasswordPayload): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await authApi.requestPasswordReset(payload.email);
      return { success: true, message: res.message };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to request password reset';
      return { success: false, error: msg };
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(payload: ResetPasswordPayload): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!payload.token) {
      return { success: false, error: 'Password reset token is missing' };
    }
    try {
      const res = await authApi.resetPassword(payload.token, payload.password);
      return { success: true, message: res.message };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset password';
      return { success: false, error: msg };
    }
  }
}

export const authRepository = new AuthRepository();
