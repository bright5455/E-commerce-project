import { api } from './client';

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
