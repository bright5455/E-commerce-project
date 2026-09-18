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
import { ProductImage } from '@/components/products/ProductImage';
import {
  getAllOrders,
  getOrderStats,
  updateOrderStatus,
  type AdminOrder,
  type OrderStats,
} from '@/lib/api/orders';
import { getLowStockProducts } from '@/lib/api/products';
import { getUserStats, type UserStats } from '@/lib/api/users';
import { getErrorMessage } from '@/lib/errors';
import { formatDateTime, formatPrice, orderReference } from '@/lib/format';
import type { OrderStatus, Product } from '@/lib/types';

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

function StatsBanner() {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Independent, best-effort fetches: the orders list below is the point of
    // this page, so either stats call failing just hides its own tiles.
    getUserStats()
      .then((data) => !cancelled && setUserStats(data))
      .catch(() => {});
    getOrderStats()
      .then((data) => !cancelled && setOrderStats(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!userStats && !orderStats) return null;

  const tiles: Array<{ label: string; value: string }> = [
    ...(userStats
      ? [
          { label: 'Total users', value: userStats.totalUsers.toLocaleString() },
          { label: 'Active users', value: userStats.activeUsers.toLocaleString() },
        ]
      : []),
    ...(orderStats
      ? [
          { label: 'Total orders', value: orderStats.totalOrders.toLocaleString() },
          { label: 'Orders this month', value: orderStats.orders.thisMonth.toLocaleString() },
          { label: 'Revenue this month', value: formatPrice(orderStats.revenue.thisMonth) },
          {
            label: 'Revenue growth',
            value: `${orderStats.revenue.growth >= 0 ? '+' : ''}${orderStats.revenue.growth.toFixed(1)}%`,
          },
        ]
      : []),
  ];

  return (
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xl font-semibold tracking-tight text-slate-900">{tile.value}</p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">{tile.label}</p>
        </div>
      ))}
    </div>
  );
}

function LowStockAlert() {
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLowStockProducts(10)
      .then((data) => !cancelled && setProducts(data.products))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!products || products.length === 0) return null;

  return (
    <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">
        {products.length} product{products.length === 1 ? '' : 's'} low on stock
      </p>
      <ul className="mt-3 space-y-2">
        {products.map((product) => (
          <li key={product.id}>
            <Link
              href={`/products/${product.id}`}
              className="flex items-center gap-3 rounded-lg border border-amber-100 bg-white p-2.5 transition hover:border-amber-300"
            >
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-slate-50">
                <ProductImage
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                {product.name}
              </span>
              <span className="shrink-0 text-sm font-semibold text-amber-700">
                {product.stock} left
              </span>
            </Link>
          </li>
        ))}
      </ul>
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
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                Manage orders
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Advance an order to the next fulfillment stage as it ships and arrives.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/admin/products/new"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                Add product
              </Link>
              <Link
                href="/admin/users"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                Manage users
              </Link>
            </div>
          </div>
          <StatsBanner />
          <LowStockAlert />
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
