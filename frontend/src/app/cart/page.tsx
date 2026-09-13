'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { CartLineItem } from '@/components/cart/CartLineItem';
import { OrderSummary } from '@/components/cart/OrderSummary';
import { RequireAuth } from '@/components/providers/RequireAuth';
import { useCart } from '@/components/providers/CartProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { getErrorMessage } from '@/lib/errors';
import { toNumber } from '@/lib/format';

function CartContents() {
  const { cart, isLoading, error, refresh, clear } = useCart();
  const toast = useToast();
  const [isClearing, setIsClearing] = useState(false);

  if (isLoading && !cart) {
    return <LoadingBlock label="Loading your cart" />;
  }

  if (error && !cart?.items.length) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Browse the catalogue and add something you like. Items stay in your cart across devices."
        action={{ href: '/products', label: 'Start shopping' }}
      />
    );
  }

  // GET /cart already returns the subtotal as a fixed-2 string; trust it rather
  // than re-adding the lines client-side.
  const subtotal = toNumber(cart.total);

  const hasBlockingIssue = cart.items.some(
    (item) =>
      !item.product.isActive ||
      item.product.stock <= 0 ||
      item.quantity > item.product.stock,
  );

  async function handleClear() {
    setIsClearing(true);
    try {
      await clear();
      toast.success('Cart cleared');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
      <section
        aria-label="Cart items"
        className="rounded-xl border border-slate-200 bg-white px-5"
      >
        <ul className="divide-y divide-slate-100">
          {cart.items.map((item) => (
            <CartLineItem key={item.id} item={item} />
          ))}
        </ul>

        <div className="flex items-center justify-between border-t border-slate-100 py-4">
          <Link
            href="/products"
            className="text-sm font-medium text-slate-700 underline-offset-4 hover:underline"
          >
            Continue shopping
          </Link>
          <Button variant="ghost" size="sm" onClick={handleClear} isLoading={isClearing}>
            Clear cart
          </Button>
        </div>
      </section>

      <div className="lg:sticky lg:top-24">
        <OrderSummary subtotal={subtotal} itemCount={cart.itemCount}>
          <div className="space-y-3">
            {hasBlockingIssue && (
              <p
                role="alert"
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
              >
                Fix the flagged items above before you can check out.
              </p>
            )}
            <Link
              href="/checkout"
              aria-disabled={hasBlockingIssue}
              tabIndex={hasBlockingIssue ? -1 : undefined}
              onClick={(event) => {
                if (hasBlockingIssue) event.preventDefault();
              }}
              className={
                hasBlockingIssue
                  ? 'pointer-events-none flex h-12 w-full items-center justify-center rounded-lg bg-slate-300 text-sm font-medium text-white'
                  : 'flex h-12 w-full items-center justify-center rounded-lg bg-slate-900 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900'
              }
            >
              Proceed to checkout
            </Link>
            <p className="text-center text-xs text-slate-400">
              Tax and shipping are confirmed by the server at checkout.
            </p>
          </div>
        </OrderSummary>
      </div>
    </div>
  );
}

export default function CartPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight text-slate-900">
        Your cart
      </h1>
      <Suspense fallback={<LoadingBlock />}>
        <RequireAuth>
          <CartContents />
        </RequireAuth>
      </Suspense>
    </div>
  );
}
