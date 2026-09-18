'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { RequireAuth } from '@/components/providers/RequireAuth';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import {
  deactivateUser,
  getAllUsers,
  reactivateUser,
} from '@/lib/api/users';
import { getErrorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import type { Profile } from '@/lib/types';

const ADMIN_ROLES = new Set(['admin', 'super_admin']);
const PAGE_SIZE = 10;

const ROLE_LABELS: Record<string, string> = {
  user: 'Shopper',
  moderator: 'Moderator',
  admin: 'Admin',
  super_admin: 'Super admin',
};

function AdminOnly() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Admins only</h1>
      <p className="mt-2 text-sm text-slate-500">
        You need an admin or super admin account to manage users.
      </p>
      <Link
        href="/products"
        className="mt-6 inline-block text-sm font-medium text-slate-900 underline underline-offset-4"
      >
        Back to shop
      </Link>
    </div>
  );
}

function UserRow({
  targetUser,
  isSelf,
  onChanged,
}: {
  targetUser: Profile;
  isSelf: boolean;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  async function toggleActive() {
    setIsUpdating(true);
    try {
      if (targetUser.isActive) {
        await deactivateUser(targetUser.id);
        toast.success(`${targetUser.email} was deactivated`);
      } else {
        await reactivateUser(targetUser.id);
        toast.success(`${targetUser.email} was reactivated`);
      }
      onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-900">
            {targetUser.firstName} {targetUser.lastName}
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
            {ROLE_LABELS[targetUser.role] ?? targetUser.role}
          </span>
          {!targetUser.isActive && (
            <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
              Deactivated
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-sm text-slate-500">{targetUser.email}</p>
        <p className="mt-1 text-xs text-slate-400">Joined {formatDate(targetUser.createdAt)}</p>
      </div>

      {!isSelf && (
        <Button
          type="button"
          variant={targetUser.isActive ? 'danger' : 'secondary'}
          size="sm"
          isLoading={isUpdating}
          onClick={() => void toggleActive()}
        >
          {targetUser.isActive ? 'Deactivate' : 'Reactivate'}
        </Button>
      )}
    </li>
  );
}

function AdminUsersList() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getAllUsers({ page, limit: PAGE_SIZE, search: search || undefined });
      setUsers(response.data);
      setTotalPages(Math.max(1, response.pagination.totalPages));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <input
        type="search"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        placeholder="Search by name or email"
        className="h-10 w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
      />

      {isLoading ? (
        <LoadingBlock label="Loading users" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : users.length === 0 ? (
        <EmptyState title="No users found" description="Try a different search." />
      ) : (
        <>
          <ul className="space-y-3">
            {users.map((targetUser) => (
              <UserRow
                key={targetUser.id}
                targetUser={targetUser}
                isSelf={targetUser.id === currentUser?.id}
                onChanged={() => void load()}
              />
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-6">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <p className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </p>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AdminUsersGate() {
  const { user } = useAuth();

  return (
    <RequireAuth>
      {user && ADMIN_ROLES.has(user.role) ? (
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="mb-2 text-3xl font-semibold tracking-tight text-slate-900">
            Manage users
          </h1>
          <p className="mb-8 text-sm text-slate-500">
            Deactivating an account blocks sign-in without deleting their data.
          </p>
          <AdminUsersList />
        </div>
      ) : (
        <AdminOnly />
      )}
    </RequireAuth>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <AdminUsersGate />
    </Suspense>
  );
}
