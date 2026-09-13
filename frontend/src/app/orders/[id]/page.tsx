'use client';

import Link from 'next/link';
import { Suspense, use } from 'react';
import { OrderDetail } from '@/components/orders/OrderDetail';
import { RequireAuth } from '@/components/providers/RequireAuth';
import { LoadingBlock } from '@/components/ui/Spinner';

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex items-center gap-2 text-sm text-slate-500"
      >
        <Link href="/orders" className="hover:text-slate-900">
          Orders
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-slate-900">Order details</span>
      </nav>

      <h1 className="mb-8 text-3xl font-semibold tracking-tight text-slate-900">
        Order details
      </h1>

      <Suspense fallback={<LoadingBlock />}>
        <RequireAuth>
          <OrderDetail orderId={id} />
        </RequireAuth>
      </Suspense>
    </div>
  );
}
