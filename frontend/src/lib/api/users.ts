import { api } from './client';
import type { Profile } from '../types';

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  adminAccounts: number;
}

/** GET /users/admin/stats/all - admin/super_admin only. */
export async function getUserStats() {
  const { data } = await api.get<UserStats>('/users/admin/stats/all');
  return data;
}

export interface UserQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface UserListResponse {
  data: Profile[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

/** GET /users - admin/super_admin only. */
export async function getAllUsers(query: UserQuery = {}) {
  const { data } = await api.get<UserListResponse>('/users', { params: query });
  return data;
}

/** PATCH /users/:id/deactivate - admin/super_admin only. */
export async function deactivateUser(id: string) {
  const { data } = await api.patch<Profile>(`/users/${id}/deactivate`);
  return data;
}

/** PUT /users/:id - reused here just to flip isActive back on; admin/super_admin only. */
export async function reactivateUser(id: string) {
  const { data } = await api.put<Profile>(`/users/${id}`, { isActive: true });
  return data;
}
