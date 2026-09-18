'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { deleteProduct } from '@/lib/api/products';
import { getErrorMessage } from '@/lib/errors';
import type { Product } from '@/lib/types';

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

/** Admin-only controls shown on the product detail page. */
export function AdminProductActions({ product }: { product: Product }) {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!user || !ADMIN_ROLES.has(user.role)) return null;

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteProduct(product.id);
      toast.success(`"${product.name}" was removed from the catalogue`);
      router.push('/products');
    } catch (error) {
      toast.error(getErrorMessage(error));
      setIsDeleting(false);
      setIsConfirming(false);
    }
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-medium text-red-900">Admin</p>

      {isConfirming ? (
        <div className="mt-2 space-y-3">
          <p className="text-sm text-red-800">
            Remove &ldquo;{product.name}&rdquo; from the catalogue? Shoppers will no longer
            be able to find or buy it.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="danger"
              size="sm"
              isLoading={isDeleting}
              onClick={() => void handleDelete()}
            >
              {isDeleting ? 'Removing...' : 'Yes, remove it'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isDeleting}
              onClick={() => setIsConfirming(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="danger"
          size="sm"
          className="mt-2"
          onClick={() => setIsConfirming(true)}
        >
          Delete product
        </Button>
      )}
    </div>
  );
}
