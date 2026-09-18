'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { RequireAuth } from '@/components/providers/RequireAuth';
import { useToast } from '@/components/providers/ToastProvider';
import { LoadingBlock } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/States';
import { ProductForm } from '@/components/products/ProductForm';
import { getProduct, updateProduct } from '@/lib/api/products';
import { getErrorMessage, toApiError } from '@/lib/errors';
import type { CreateProductFormValues } from '@/lib/validation';

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

function AdminOnly() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Admins only</h1>
      <p className="mt-2 text-sm text-slate-500">
        You need an admin or super admin account to edit products.
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

function EditProductForm({ productId }: { productId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [initialValues, setInitialValues] = useState<CreateProductFormValues | null>(null);
  const [productName, setProductName] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProduct(productId)
      .then((product) => {
        if (cancelled) return;
        setProductName(product.name);
        setInitialValues({
          name: product.name,
          description: product.description,
          price: Number(product.price),
          stock: product.stock,
          imageUrl: product.imageUrl ?? '',
        });
      })
      .catch((error) => setLoadError(getErrorMessage(error)));
    return () => {
      cancelled = true;
    };
  }, [productId]);

  async function handleSubmit(values: CreateProductFormValues) {
    try {
      await updateProduct(productId, {
        name: values.name,
        description: values.description,
        price: values.price,
        stock: values.stock,
        imageUrl: values.imageUrl || undefined,
      });
      toast.success(`"${values.name}" was updated`);
      router.push(`/products/${productId}`);
    } catch (error) {
      toast.error(toApiError(error).message);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <ErrorState message={loadError} />
      </div>
    );
  }

  if (!initialValues) return <LoadingBlock label="Loading product" />;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Edit {productName}
        </h1>
        <p className="mt-2 text-sm text-slate-500">Changes apply to the catalogue immediately.</p>
      </div>

      <ProductForm
        initialValues={initialValues}
        submitLabel="Save changes"
        submittingLabel="Saving..."
        cancelLabel="Cancel"
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/products/${productId}`)}
      />
    </div>
  );
}

function EditProductGate() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();

  return (
    <RequireAuth>
      {user && ADMIN_ROLES.has(user.role) ? (
        <EditProductForm productId={params.id} />
      ) : (
        <AdminOnly />
      )}
    </RequireAuth>
  );
}

export default function EditProductPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <EditProductGate />
    </Suspense>
  );
}
