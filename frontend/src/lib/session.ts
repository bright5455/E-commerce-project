import type { AuthUser } from './types';

/**
 * Token storage.
 *
 * The backend issues bearer tokens from POST /auth/user/login and expects them
 * in the Authorization header (see JwtStrategy: ExtractJwt.fromAuthHeaderAsBearerToken).
 * It never sets a cookie, so the browser has to hold the token itself and
 * localStorage is the only option available to us. That means the token is
 * readable by any script running on this origin - keep third-party scripts off
 * this app, and prefer an httpOnly refresh cookie on the backend if you ever
 * harden this further.
 */

const ACCESS_TOKEN_KEY = 'ec.accessToken';
const REFRESH_TOKEN_KEY = 'ec.refreshToken';
const USER_KEY = 'ec.user';

/** Fired whenever the session changes so React providers can resync. */
export const SESSION_EVENT = 'ec:session-changed';

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const isBrowser = () => typeof window !== 'undefined';

function notify() {
  if (isBrowser()) window.dispatchEvent(new Event(SESSION_EVENT));
}

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  if (!isBrowser()) return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  notify();
}

/** Used by the refresh flow, which returns new tokens but no user payload. */
export function saveTokens(accessToken: string, refreshToken: string) {
  if (!isBrowser()) return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function saveUser(user: AuthUser) {
  if (!isBrowser()) return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  notify();
}

export function clearSession() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  notify();
}
