import { api } from './client';
import type { Profile } from '../types';

/**
 * GET /profile
 *
 * Deliberately not GET /auth/profile: that handler spreads the User instance
 * into a plain object, which defeats ClassSerializerInterceptor and leaks the
 * password hash. ProfileController returns the real entity, so @Exclude applies.
 */
export async function getProfile() {
  const { data } = await api.get<Profile>('/profile');
  return data;
}

/** PATCH /profile - UpdateProfileDto accepts firstName, lastName, phoneNumber. */
export async function updateProfile(payload: { firstName?: string; lastName?: string }) {
  const { data } = await api.patch<Profile>('/profile', payload);
  return data;
}
