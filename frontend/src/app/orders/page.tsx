'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { RequireAuth } from '@/components/providers/RequireAuth';
import { OrderStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { getMyOrders } from '@/lib/api/orders';
import { getErrorMessage } from '@/lib/errors';
import { formatDateTime, formatPrice, orderReference } from '@/lib/format';
import type { Order, OrderStatus } from '@/lib/types';

const STATUS_FILTERS: Array<{ value: OrderStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAGE_SIZE = 10;

function OrdersList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getMyOrders({
        page,
        limit: PAGE_SIZE,
        ...(status === 'all' ? {} : { status }),
      });
      setOrders(response.data);
      setTotalPages(Math.max(1, response.meta.totalPages));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filter orders by status"
      >
        {STATUS_FILTERS.map((filter) => {
          const isActive = status === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => {
                setStatus(filter.value);
                setPage(1);
              }}
              className={
                isActive
                  ? 'rounded-full bg-slate-900 px-4 py-1.5 text-sm font-medium text-white'
                  : 'rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50'
              }
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <LoadingBlock label="Loading your orders" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : orders.length === 0 ? (
        <EmptyState
          title={status === 'all' ? 'No orders yet' : `No ${status} orders`}
          description={
            status === 'all'
              ? 'Once you place an order it will appear here with its status and full breakdown.'
              : 'Try a different status filter.'
          }
          action={{ href: '/products', label: 'Start shopping' }}
        />
      ) : (
        <>
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-sm font-semibold text-slate-900">
                        {orderReference(order.id)}
                      </span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="mt-1.5 text-sm text-slate-500">
                      {formatDateTime(order.createdAt)} &middot; {order.items.length} item
                      {order.items.length === 1 ? '' : 's'}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-400">
                      {order.items.map((item) => item.productName).join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-1">
                    <p className="text-lg font-semibold text-slate-900">
                      {formatPrice(order.total)}
                    </p>
                    <span className="text-sm font-medium text-slate-500">View details</span>
                  </div>
                </Link>
              </li>
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

export default function OrdersPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight text-slate-900">
        Your orders
      </h1>
      <Suspense fallback={<LoadingBlock />}>
        <RequireAuth>
          <OrdersList />
        </RequireAuth>
      </Suspense>
    </div>
  );
}
