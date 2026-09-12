import { api } from './client';
import type {
  LoginResponse,
  MessageResponse,
  RegisterResponse,
  TwoFactorRequiredResponse,
} from '../types';
import { getRefreshToken } from '../session';

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/** POST /auth/user/register */
export async function register(payload: RegisterPayload) {
  // phoneNumber is optional on RegisterUserDto, but forbidNonWhitelisted means
  // we must omit the key entirely rather than send an empty string.
  const body: RegisterPayload = {
    email: payload.email,
    password: payload.password,
    firstName: payload.firstName,
    lastName: payload.lastName,
    ...(payload.phoneNumber ? { phoneNumber: payload.phoneNumber } : {}),
  };

  const { data } = await api.post<RegisterResponse>('/auth/user/register', body);
  return data;
}

/** POST /auth/user/login */
export async function login(payload: LoginPayload) {
  const { data } = await api.post<LoginResponse | TwoFactorRequiredResponse>(
    '/auth/user/login',
    payload,
  );
  return data;
}

/** POST /auth/logout - revokes the refresh token server-side. */
export async function logout() {
  const refreshToken = getRefreshToken();
  const { data } = await api.post<MessageResponse>(
    '/auth/logout',
    refreshToken ? { refreshToken } : {},
  );
  return data;
}

/** GET /auth/user/verify-email?token= */
export async function verifyEmail(token: string) {
  const { data } = await api.get<MessageResponse>('/auth/user/verify-email', {
    params: { token },
  });
  return data;
}

/** POST /auth/user/forgot-password */
export async function requestPasswordReset(email: string) {
  const { data } = await api.post<MessageResponse>('/auth/user/forgot-password', {
    email,
  });
  return data;
}

/** POST /auth/user/reset-password */
export async function resetPassword(token: string, newPassword: string) {
  const { data } = await api.post<MessageResponse>('/auth/user/reset-password', {
    token,
    newPassword,
  });
  return data;
}

export function isTwoFactorRequired(
  response: LoginResponse | TwoFactorRequiredResponse,
): response is TwoFactorRequiredResponse {
  return 'requiresTwoFactor' in response;
}
