import { apiFetch } from './client';
import { AuthMeResponse, UserProfile } from './types';

export const authApi = {
  async register(email: string, password: string): Promise<{ message: string; user: UserProfile }> {
    return apiFetch<{ message: string; user: UserProfile }>('/auth/register', {
      method: 'POST',
      body: { email, password },
    });
  },

  async login(
    email: string,
    password: string,
    deviceIdentifier?: string,
    deviceName?: string,
    deviceType?: string,
  ): Promise<{ user: UserProfile; session: { id: string; expiresAt: string; lastActiveAt: string } }> {
    return apiFetch('/auth/login', {
      method: 'POST',
      body: {
        email,
        password,
        deviceIdentifier,
        deviceName: deviceName || (typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 50) : 'Web Browser'),
        deviceType: deviceType || 'browser',
      },
    });
  },

  async logout(): Promise<{ message: string }> {
    return apiFetch<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  },

  async logoutAll(): Promise<{ message: string }> {
    return apiFetch<{ message: string }>('/auth/logout-all', {
      method: 'POST',
    });
  },

  async getMe(): Promise<AuthMeResponse> {
    return apiFetch<AuthMeResponse>('/auth/me', {
      method: 'GET',
    });
  },

  async verifyEmail(token: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      body: { token },
    });
  },

  async resendVerification(email: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: { email },
    });
  },

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>('/auth/request-password-reset', {
      method: 'POST',
      body: { email },
    });
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: { token, newPassword },
    });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    });
  },
};
