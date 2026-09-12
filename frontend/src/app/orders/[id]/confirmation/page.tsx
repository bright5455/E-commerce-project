'use client';

import Link from 'next/link';
import { Suspense, use } from 'react';
import { OrderDetail } from '@/components/orders/OrderDetail';
import { RequireAuth } from '@/components/providers/RequireAuth';
import { LoadingBlock } from '@/components/ui/Spinner';

/**
 * Where checkout lands after POST /orders/checkout succeeds. Same order view as
 * /orders/[id], wrapped in a confirmation header - one component, two entries.
 */
export default function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <svg
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Thank you, your order is confirmed
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-600">
          Payment was taken from your wallet and the order is now being prepared. Keep the
          reference below if you need to get in touch.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/products"
            className="inline-flex h-11 items-center rounded-lg bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Continue shopping
          </Link>
          <Link
            href="/orders"
            className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-900 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            View all orders
          </Link>
        </div>
      </div>

      <Suspense fallback={<LoadingBlock />}>
        <RequireAuth>
          <OrderDetail orderId={id} showActions={false} />
        </RequireAuth>
      </Suspense>
    </div>
  );
}
