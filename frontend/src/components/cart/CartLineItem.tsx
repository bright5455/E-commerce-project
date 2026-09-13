'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ProductImage } from '@/components/products/ProductImage';
import { QuantityStepper } from '@/components/products/QuantityStepper';
import { Spinner } from '@/components/ui/Spinner';
import { useCart } from '@/components/providers/CartProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { getErrorMessage } from '@/lib/errors';
import { formatPrice, toNumber } from '@/lib/format';
import type { CartItem } from '@/lib/types';

export function CartLineItem({ item }: { item: CartItem }) {
  const { updateQuantity, removeItem } = useCart();
  const toast = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const unitPrice = toNumber(item.product.price);
  const lineTotal = unitPrice * item.quantity;
  const outOfStock = !item.product.isActive || item.product.stock <= 0;
  const overStock = item.quantity > item.product.stock;

  async function handleQuantityChange(next: number) {
    if (next === item.quantity) return;

    setIsUpdating(true);
    try {
      await updateQuantity(item.id, next);
    } catch (error) {
      // The server caps quantity at available stock and rejects anything over;
      // the refresh inside the provider restores the real value either way.
      toast.error(getErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleRemove() {
    setIsRemoving(true);
    try {
      await removeItem(item.id);
      toast.success(`${item.product.name} removed from your cart`);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setIsRemoving(false);
    }
  }

  return (
    <li className="flex gap-4 py-5">
      <Link
        href={`/products/${item.productId}`}
        className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 sm:h-28 sm:w-28"
      >
        <ProductImage
          src={item.product.imageUrl}
          alt={item.product.name}
          className="h-full w-full object-cover"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium text-slate-900">
              <Link href={`/products/${item.productId}`} className="hover:underline">
                {item.product.name}
              </Link>
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">{formatPrice(unitPrice)} each</p>
          </div>

          <p className="shrink-0 text-sm font-semibold text-slate-900">
            {formatPrice(lineTotal)}
          </p>
        </div>

        {(outOfStock || overStock) && (
          <p role="alert" className="text-xs font-medium text-red-600">
            {outOfStock
              ? 'This product is no longer available. Remove it to continue.'
              : `Only ${item.product.stock} left. Reduce the quantity to continue.`}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <QuantityStepper
              value={item.quantity}
              onChange={handleQuantityChange}
              max={Math.max(item.product.stock, 1)}
              label={item.product.name}
              disabled={isUpdating || isRemoving || outOfStock}
              size="sm"
            />
            {isUpdating && <Spinner className="h-4 w-4 text-slate-400" />}
          </div>

          <button
            type="button"
            onClick={handleRemove}
            disabled={isRemoving || isUpdating}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          >
            {isRemoving ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            )}
            <span>Remove</span>
          </button>
        </div>
      </div>
    </li>
  );
}
