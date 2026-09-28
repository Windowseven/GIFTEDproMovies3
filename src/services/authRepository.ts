import {
  AuthUser,
  LoginCredentials,
  RegisterCredentials,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  AuthResponse,
  UserRole,
} from '@/types/auth';

const STORAGE_KEY_USER = 'giftedpro_auth_user';
const STORAGE_KEY_ACCOUNTS = 'giftedpro_registered_users';

interface StoredAccount {
  user: AuthUser;
  passwordHash: string; // Plain mock string for client simulation
}

// Master Pre-configured Accounts as requested
const DEFAULT_ACCOUNTS: StoredAccount[] = [
  {
    user: {
      id: 'usr_admin_01',
      email: 'admin@gmail.com',
      username: 'admin',
      displayName: 'System Administrator',
      role: 'ADMIN',
      avatarUrl: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    passwordHash: 'Windowseven77.',
  },
  {
    user: {
      id: 'usr_media_01',
      email: 'media@gmail.com',
      username: 'mediateam',
      displayName: 'Media Operations Lead',
      role: 'MEDIA_TEAM',
      avatarUrl: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    passwordHash: 'Windowseven77.',
  },
  {
    user: {
      id: 'usr_cust_01',
      email: 'user@gmail.com',
      username: 'giftedfan',
      displayName: 'Baraka M. (VIP Ultra)',
      role: 'CUSTOMER',
      avatarUrl: null,
      vipTier: 'VIP Ultra Pass',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    passwordHash: 'Windowseven77.',
  },
];

class AuthRepository {
  private getAccounts(): StoredAccount[] {
    if (typeof window === 'undefined') return DEFAULT_ACCOUNTS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS));
        return DEFAULT_ACCOUNTS;
      }
      return JSON.parse(stored);
    } catch {
      return DEFAULT_ACCOUNTS;
    }
  }

  private saveAccounts(accounts: StoredAccount[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
    } catch (e) {
      console.warn('Failed to save registered accounts to storage', e);
    }
  }

  /**
   * Retrieve current active session from browser storage
   */
  getCurrentUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    try {
      const userJson = localStorage.getItem(STORAGE_KEY_USER);
      if (!userJson) return null;
      return JSON.parse(userJson) as AuthUser;
    } catch {
      return null;
    }
  }

  /**
   * Authenticate user with Email + Password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Simulate realistic network latency (300ms)
    await new Promise((resolve) => setTimeout(resolve, 300));

    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password;

    if (!email) {
      return { success: false, error: 'Email address is required.' };
    }
    if (!password) {
      return { success: false, error: 'Password is required.' };
    }

    const accounts = this.getAccounts();
    const account = accounts.find((a) => a.user.email.toLowerCase() === email);

    if (!account || account.passwordHash !== password) {
      return {
        success: false,
        error: 'Email or password is incorrect. Please check your details and try again.',
      };
    }

    if (!account.user.isActive) {
      return {
        success: false,
        error: 'This account has been deactivated. Please contact support.',
      };
    }

    // Persist session
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(account.user));
    }

    return {
      success: true,
      user: account.user,
    };
  }

  /**
   * Register a new account with Username, Email, Password, and Confirm Password
   */
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const username = credentials.username.trim();
    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password;
    const confirmPassword = credentials.confirmPassword;

    if (!username) {
      return { success: false, error: 'Username is required.' };
    }
    if (username.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters long.' };
    }
    if (!email) {
      return { success: false, error: 'Email address is required.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password) {
      return { success: false, error: 'Password is required.' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }
    if (password !== confirmPassword) {
      return { success: false, error: 'Passwords do not match.' };
    }

    const accounts = this.getAccounts();
    const existing = accounts.find(
      (a) =>
        a.user.email.toLowerCase() === email ||
        a.user.username.toLowerCase() === username.toLowerCase()
    );

    if (existing) {
      return {
        success: false,
        error: 'An account with this email or username already exists.',
      };
    }

    const newUser: AuthUser = {
      id: `usr_${Date.now()}`,
      email,
      username,
      displayName: username,
      role: 'CUSTOMER',
      avatarUrl: null,
      vipTier: 'Free User',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newAccount: StoredAccount = {
      user: newUser,
      passwordHash: password,
    };

    accounts.push(newAccount);
    this.saveAccounts(accounts);

    // Auto sign-in on registration per MD-14 §14
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
    }

    return {
      success: true,
      user: newUser,
    };
  }

  /**
   * Request password reset instructions
   */
  async forgotPassword(payload: ForgotPasswordPayload): Promise<AuthResponse> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const email = payload.email.trim().toLowerCase();

    if (!email) {
      return { success: false, error: 'Email address is required.' };
    }

    // Per MD-14 §16: Always show success to prevent account enumeration
    return {
      success: true,
      message: 'If an account is associated with this email, instructions have been sent.',
    };
  }

  /**
   * Reset password with token
   */
  async resetPassword(payload: ResetPasswordPayload): Promise<AuthResponse> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (!payload.password) {
      return { success: false, error: 'New password is required.' };
    }
    if (payload.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }
    if (payload.password !== payload.confirmPassword) {
      return { success: false, error: 'Passwords do not match.' };
    }

    return {
      success: true,
      message: 'Your password has been updated successfully. You can now sign in.',
    };
  }

  /**
   * Switch active role for development testing
   */
  switchMockRole(role: UserRole | 'GUEST'): AuthUser | null {
    if (typeof window === 'undefined') return null;

    if (role === 'GUEST') {
      localStorage.removeItem(STORAGE_KEY_USER);
      return null;
    }

    const accounts = this.getAccounts();
    const account = accounts.find((a) => a.user.role === role);
    if (account) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(account.user));
      return account.user;
    }
    return null;
  }

  /**
   * Log out active user
   */
  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  }
}

export const authRepository = new AuthRepository();
