import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { clearSession, getAccessToken, getRefreshToken, saveTokens } from '../session';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

if (!process.env.NEXT_PUBLIC_API_URL && typeof window !== 'undefined') {
  console.warn(
    'NEXT_PUBLIC_API_URL is not set. Falling back to http://localhost:3000/api/v1 - copy .env.example to .env.local.',
  );
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Single-flight refresh: if several requests 401 at once we only hit
 * POST /auth/refresh once and every caller waits on the same promise.
 */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    // Bare axios on purpose: this request must not go through the interceptor
    // that would attach the expired access token or recurse on failure.
    const { data } = await axios.post<{
      accessToken: string;
      refreshToken: string;
    }>(`${API_URL}/auth/refresh`, { refreshToken });

    saveTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    const isAuthEndpoint = config?.url?.includes('/auth/');
    const canRetry = status === 401 && config && !config._retried && !isAuthEndpoint;

    if (!canRetry) {
      return Promise.reject(error);
    }

    config._retried = true;

    refreshInFlight ??= refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });

    const newToken = await refreshInFlight;

    if (!newToken) {
      // The refresh token is gone, revoked or expired: the session is over.
      clearSession();
      return Promise.reject(error);
    }

    config.headers.Authorization = `Bearer ${newToken}`;
    return api(config);
  },
);
