'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { RequireAuth } from '@/components/providers/RequireAuth';
import { useToast } from '@/components/providers/ToastProvider';
import { OrderStatusBadge, PaymentBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { getAllOrders, updateOrderStatus, type AdminOrder } from '@/lib/api/orders';
import { getUserStats, type UserStats } from '@/lib/api/users';
import { getErrorMessage } from '@/lib/errors';
import { formatDateTime, formatPrice, orderReference } from '@/lib/format';
import type { OrderStatus } from '@/lib/types';

const ADMIN_ROLES = new Set(['admin', 'super_admin']);
const PAGE_SIZE = 10;

// The backend enforces this same order - see validateStatusTransition in
// order.service.ts. Only the next fulfillment step is offered here;
// cancellation stays a shopper/wallet-refund action, not an admin one.
const NEXT_STEP: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  processing: { status: 'shipped', label: 'Mark as shipped' },
  shipped: { status: 'delivered', label: 'Mark as delivered' },
  delivered: { status: 'completed', label: 'Mark as completed' },
};

function UserStatsBanner() {
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    getUserStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        // Non-critical: the orders list is the point of this page, so a
        // failed stats fetch just hides the banner instead of erroring out.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats) return null;

  const tiles: Array<{ label: string; value: number }> = [
    { label: 'Total users', value: stats.totalUsers },
    { label: 'Active users', value: stats.activeUsers },
    { label: 'Admin accounts', value: stats.adminAccounts },
  ];

  return (
    <div className="mb-8 grid grid-cols-3 gap-3">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-semibold tracking-tight text-slate-900">
            {tile.value.toLocaleString()}
          </p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">{tile.label}</p>
        </div>
      ))}
    </div>
  );
}

function AdminOnly() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Admins only</h1>
      <p className="mt-2 text-sm text-slate-500">
        You need an admin or super admin account to manage orders.
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

function OrderRow({ order, onChanged }: { order: AdminOrder; onChanged: () => void }) {
  const toast = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const nextStep = NEXT_STEP[order.status];

  async function advance() {
    if (!nextStep) return;
    setIsUpdating(true);
    try {
      await updateOrderStatus(order.id, nextStep.status);
      toast.success(`Order ${orderReference(order.id)} is now ${nextStep.status}`);
      onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <li className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm font-semibold text-slate-900">
            {orderReference(order.id)}
          </span>
          <OrderStatusBadge status={order.status} />
          <PaymentBadge isPaid={order.isPaid} />
        </div>
        <p className="mt-1.5 text-sm text-slate-500">
          {order.user ? `${order.user.firstName} ${order.user.lastName} · ${order.user.email}` : 'Unknown customer'}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {formatDateTime(order.createdAt)} &middot; {order.items.length} item
          {order.items.length === 1 ? '' : 's'} &middot; {formatPrice(order.total)}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/orders/${order.id}`}
          className="text-sm font-medium text-slate-600 underline underline-offset-4 hover:text-slate-900"
        >
          View
        </Link>
        {nextStep && (
          <Button type="button" size="sm" isLoading={isUpdating} onClick={() => void advance()}>
            {nextStep.label}
          </Button>
        )}
      </div>
    </li>
  );
}

function AdminOrdersList() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getAllOrders({ page, limit: PAGE_SIZE });
      setOrders(response.data);
      setTotalPages(Math.max(1, response.meta.totalPages));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) return <LoadingBlock label="Loading orders" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (orders.length === 0) {
    return <EmptyState title="No orders yet" description="Orders placed by shoppers will appear here." />;
  }

  return (
    <div className="space-y-6">
      <ul className="space-y-3">
        {orders.map((order) => (
          <OrderRow key={order.id} order={order} onChanged={() => void load()} />
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
    </div>
  );
}

function AdminOrdersGate() {
  const { user } = useAuth();

  return (
    <RequireAuth>
      {user && ADMIN_ROLES.has(user.role) ? (
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="mb-2 text-3xl font-semibold tracking-tight text-slate-900">
            Manage orders
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            Advance an order to the next fulfillment stage as it ships and arrives.
          </p>
          <UserStatsBanner />
          <AdminOrdersList />
        </div>
      ) : (
        <AdminOnly />
      )}
    </RequireAuth>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <AdminOrdersGate />
    </Suspense>
  );
}
