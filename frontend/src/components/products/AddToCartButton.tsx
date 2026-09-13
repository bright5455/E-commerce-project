'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCart } from '@/components/providers/CartProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { getErrorMessage } from '@/lib/errors';
import type { Product } from '@/lib/types';

interface AddToCartButtonProps {
  product: Pick<Product, 'id' | 'name' | 'stock' | 'isActive'>;
  quantity?: number;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function AddToCartButton({
  product,
  quantity = 1,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
}: AddToCartButtonProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const unavailable = !product.isActive || product.stock <= 0;

  function handleClick() {
    void performAdd();
  }

  async function performAdd() {
    // The cart lives server-side against the user id, so there is no guest cart
    // to fall back on - send them to sign in and bring them back here.
    if (!isAuthenticated) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      router.push(`/login?redirect=${encodeURIComponent(returnTo)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await addItem(product.id, quantity);
      toast.success(
        quantity > 1
          ? `${quantity} x ${product.name} added to your cart`
          : `${product.name} added to your cart`,
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      onClick={handleClick}
      isLoading={isSubmitting}
      disabled={unavailable}
      aria-label={
        unavailable ? `${product.name} is out of stock` : `Add ${product.name} to cart`
      }
    >
      {unavailable ? 'Out of stock' : isSubmitting ? 'Adding...' : 'Add to cart'}
    </Button>
  );
}
