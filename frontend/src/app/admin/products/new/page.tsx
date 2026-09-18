'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { RequireAuth } from '@/components/providers/RequireAuth';
import { useToast } from '@/components/providers/ToastProvider';
import { LoadingBlock } from '@/components/ui/Spinner';
import { ProductForm } from '@/components/products/ProductForm';
import { createProduct } from '@/lib/api/products';
import { toApiError } from '@/lib/errors';
import type { CreateProductFormValues } from '@/lib/validation';

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

function AdminOnly() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">
        Admins only
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        You need an admin or super admin account to add products.
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

function AddProductForm() {
  const router = useRouter();
  const toast = useToast();
  // Bumping this remounts <ProductForm> with fresh defaults after a
  // successful add, so an admin can add several products in a row.
  const [formKey, setFormKey] = useState(0);

  async function handleSubmit(values: CreateProductFormValues) {
    try {
      await createProduct({
        name: values.name,
        description: values.description,
        price: values.price,
        stock: values.stock,
        imageUrl: values.imageUrl || undefined,
      });
      toast.success(`"${values.name}" was added to the catalogue`);
      setFormKey((key) => key + 1);
    } catch (error) {
      toast.error(toApiError(error).message);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Add a product
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          It appears in the catalogue immediately once saved.
        </p>
      </div>

      <ProductForm
        key={formKey}
        submitLabel="Add product"
        submittingLabel="Adding product..."
        cancelLabel="View catalogue"
        onSubmit={handleSubmit}
        onCancel={() => router.push('/products')}
      />
    </div>
  );
}

function AddProductGate() {
  const { user } = useAuth();

  return (
    <RequireAuth>
      {user && ADMIN_ROLES.has(user.role) ? <AddProductForm /> : <AdminOnly />}
    </RequireAuth>
  );
}

export default function AddProductPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <AddProductGate />
    </Suspense>
  );
}
