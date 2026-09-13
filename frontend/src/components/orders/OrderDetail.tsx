'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CancelOrderButton } from './CancelOrderButton';
import { ProductImage } from '@/components/products/ProductImage';
import { OrderStatusBadge } from '@/components/ui/Badge';
import { LoadingBlock } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/States';
import { getOrder } from '@/lib/api/orders';
import { getErrorMessage } from '@/lib/errors';
import { formatDateTime, formatPrice, orderReference } from '@/lib/format';
import type { Order } from '@/lib/types';

interface OrderDetailProps {
  orderId: string;
  /** Hides the cancel control on the confirmation screen. */
  showActions?: boolean;
}

export function OrderDetail({ orderId, showActions = true }: OrderDetailProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setOrder(await getOrder(orderId));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) return <LoadingBlock label="Loading order" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!order) return null;

  const canCancel = order.status === 'pending' || order.status === 'processing';

  const addressLines = [
    order.shippingAddress,
    [order.shippingCity, order.shippingState].filter(Boolean).join(', '),
    [order.shippingZipCode, order.shippingCountry].filter(Boolean).join(' '),
  ].filter((line): line is string => Boolean(line && line.trim()));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Order reference
          </p>
          <p className="mt-1 font-mono text-lg font-semibold text-slate-900">
            {orderReference(order.id)}
          </p>
          <p className="mt-1 break-all font-mono text-xs text-slate-400">{order.id}</p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <OrderStatusBadge status={order.status} />
          <p className="text-sm text-slate-500">Placed {formatDateTime(order.createdAt)}</p>
          {order.isPaid && order.paidAt && (
            <p className="text-xs text-emerald-700">Paid {formatDateTime(order.paidAt)}</p>
          )}
        </div>
      </div>

      {order.status === 'cancelled' && order.cancellationReason && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <span className="font-medium text-slate-900">Cancelled:</span>{' '}
          {order.cancellationReason}
          {order.isPaid && ' The order total was refunded to your wallet.'}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <section
          aria-label="Order items"
          className="rounded-xl border border-slate-200 bg-white p-5"
        >
          <h2 className="text-base font-semibold text-slate-900">
            {order.items.length} item{order.items.length === 1 ? '' : 's'}
          </h2>

          <ul className="mt-4 divide-y divide-slate-100">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-4">
                <Link
                  href={`/products/${item.productId}`}
                  className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                >
                  <ProductImage
                    src={item.productImage}
                    alt={item.productName}
                    className="h-full w-full object-cover"
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    <Link href={`/products/${item.productId}`} className="hover:underline">
                      {item.productName}
                    </Link>
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {formatPrice(item.price)} x {item.quantity}
                  </p>
                </div>

                <p className="shrink-0 text-sm font-semibold text-slate-900">
                  {formatPrice(item.total)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-4">
          <section
            aria-label="Payment summary"
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <h2 className="text-base font-semibold text-slate-900">Payment</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Subtotal</dt>
                <dd className="font-medium text-slate-900">
                  {formatPrice(order.subtotal)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Tax</dt>
                <dd className="font-medium text-slate-900">{formatPrice(order.tax)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Shipping</dt>
                <dd className="font-medium text-slate-900">
                  {Number(order.shippingFee) === 0
                    ? 'Free'
                    : formatPrice(order.shippingFee)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2.5">
                <dt className="text-base font-semibold text-slate-900">Total</dt>
                <dd className="text-base font-semibold text-slate-900">
                  {formatPrice(order.total)}
                </dd>
              </div>
              <div className="flex justify-between pt-1">
                <dt className="text-slate-500">Method</dt>
                <dd className="font-medium capitalize text-slate-900">
                  {order.paymentMethod.replace('_', ' ')}
                </dd>
              </div>
            </dl>
          </section>

          <section
            aria-label="Delivery"
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <h2 className="text-base font-semibold text-slate-900">Delivery</h2>
            {addressLines.length > 0 ? (
              <address className="mt-3 text-sm not-italic leading-relaxed text-slate-600">
                {addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
                {order.phoneNumber && (
                  <span className="mt-2 block text-slate-500">{order.phoneNumber}</span>
                )}
              </address>
            ) : (
              <p className="mt-3 text-sm text-slate-400">No delivery address recorded.</p>
            )}

            {order.trackingNumber && (
              <p className="mt-3 border-t border-slate-100 pt-3 text-sm">
                <span className="text-slate-500">Tracking:</span>{' '}
                <span className="font-mono font-medium text-slate-900">
                  {order.trackingNumber}
                </span>
              </p>
            )}

            {order.notes && (
              <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
                <span className="text-slate-500">Notes:</span> {order.notes}
              </p>
            )}
          </section>

          {showActions && canCancel && (
            <CancelOrderButton orderId={order.id} onCancelled={load} />
          )}
        </div>
      </div>
    </div>
  );
}
