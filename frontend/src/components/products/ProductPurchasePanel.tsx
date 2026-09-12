'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { QuantityStepper } from './QuantityStepper';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCart } from '@/components/providers/CartProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { getErrorMessage } from '@/lib/errors';
import { formatPrice, toNumber } from '@/lib/format';
import type { Product } from '@/lib/types';

/**
 * The buy box. Quantity is capped at the stock the server reported; the server
 * checks stock again on POST /cart, so this is a convenience, not the guard.
 */
export function ProductPurchasePanel({ product }: { product: Product }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const toast = useToast();

  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const unavailable = !product.isActive || product.stock <= 0;
  const lineTotal = toNumber(product.price) * quantity;

  function handleAddToCart() {
    void performAddToCart();
  }

  async function performAddToCart() {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/products/${product.id}`)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await addItem(product.id, quantity);
      setJustAdded(true);
      toast.success(`${product.name} added to your cart`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (unavailable) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm font-medium text-slate-900">
          {product.isActive ? 'Out of stock' : 'No longer available'}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {product.isActive
            ? 'This product is sold out. Check back soon or browse similar items.'
            : 'This product has been withdrawn from the catalogue.'}
        </p>
        <Link
          href="/products"
          className="mt-4 inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-900 transition hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          Browse other products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-800" id="quantity-label">
            Quantity
          </label>
          <p className="mt-0.5 text-xs text-slate-500">{product.stock} available</p>
        </div>
        <QuantityStepper
          value={quantity}
          onChange={(next) => {
            setQuantity(next);
            setJustAdded(false);
          }}
          max={product.stock}
          label={product.name}
          disabled={isSubmitting}
        />
      </div>

      {quantity > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
          <span className="text-slate-500">
            {quantity} x {formatPrice(product.price)}
          </span>
          <span className="font-semibold text-slate-900">{formatPrice(lineTotal)}</span>
        </div>
      )}

      <Button onClick={handleAddToCart} isLoading={isSubmitting} fullWidth size="lg">
        {isSubmitting ? 'Adding to cart...' : 'Add to cart'}
      </Button>

      {justAdded && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-emerald-900">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Added to cart
          </span>
          <Link
            href="/cart"
            className="shrink-0 text-sm font-semibold text-emerald-900 underline underline-offset-4"
          >
            View cart
          </Link>
        </div>
      )}
    </div>
  );
}
