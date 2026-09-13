'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as authApi from '@/lib/api/auth';
import { SESSION_EVENT, clearSession, getStoredUser, saveSession } from '@/lib/session';
import type { AuthUser } from '@/lib/types';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True until the stored session has been read on the client. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage after mount so server and client markup match.
  useEffect(() => {
    setUser(getStoredUser());
    setIsLoading(false);

    // Keeps this tab in sync when the axios interceptor clears a dead session,
    // and other tabs in sync when someone signs in or out elsewhere.
    const sync = () => setUser(getStoredUser());
    window.addEventListener(SESSION_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SESSION_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login({ email, password });

    if (authApi.isTwoFactorRequired(response)) {
      // Only admin accounts can enable 2FA in this backend; a shopper account
      // should never land here.
      throw new Error('This account requires two-factor authentication to sign in.');
    }

    saveSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
    });
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // The local session is cleared either way - a failed revoke must not
      // strand the shopper in a half-signed-in state.
    }
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
    }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}
