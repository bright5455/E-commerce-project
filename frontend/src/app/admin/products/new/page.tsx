'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/components/providers/AuthProvider';
import { RequireAuth } from '@/components/providers/RequireAuth';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { InputField, TextareaField } from '@/components/ui/Field';
import { FormError } from '@/components/ui/States';
import { LoadingBlock, Spinner } from '@/components/ui/Spinner';
import { ProductImage } from '@/components/products/ProductImage';
import { createProduct, uploadProductImage } from '@/lib/api/products';
import { toApiError } from '@/lib/errors';
import { createProductSchema, type CreateProductFormValues } from '@/lib/validation';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<CreateProductFormValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: { name: '', description: '', price: 0, stock: 0, imageUrl: '' },
  });

  const imageUrl = watch('imageUrl');

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // lets picking the same file twice re-trigger onChange
    if (!file) return;

    setImageError(null);
    setIsUploading(true);
    try {
      const { imageUrl: uploaded } = await uploadProductImage(file);
      setValue('imageUrl', uploaded, { shouldValidate: true });
    } catch (error) {
      setImageError(toApiError(error).message);
    } finally {
      setIsUploading(false);
    }
  }

  async function onSubmit(values: CreateProductFormValues) {
    try {
      await createProduct({
        name: values.name,
        description: values.description,
        price: values.price,
        stock: values.stock,
        imageUrl: values.imageUrl || undefined,
      });

      toast.success(`"${values.name}" was added to the catalogue`);
      reset({ name: '', description: '', price: 0, stock: 0, imageUrl: '' });
    } catch (error) {
      toast.error(toApiError(error).message);
    }
  }

  // react-hook-form doesn't surface a single combined message; reuse FormError
  // for the first field error only after a submit attempt, matching how the
  // checkout/register forms report a top-level problem.
  const topError =
    submitCount > 0
      ? (errors.name?.message ?? errors.description?.message ?? errors.price?.message)
      : undefined;

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

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {topError && <FormError message={topError} />}

        <InputField
          label="Product name"
          placeholder="Wireless Headphones"
          error={errors.name?.message}
          {...register('name')}
        />

        <TextareaField
          label="Description"
          placeholder="Over-ear Bluetooth headphones with noise cancellation."
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            label="Price (USD)"
            type="number"
            step="0.01"
            min="0"
            placeholder="49.99"
            error={errors.price?.message}
            {...register('price')}
          />
          <InputField
            label="Stock"
            type="number"
            step="1"
            min="0"
            placeholder="25"
            error={errors.stock?.message}
            {...register('stock')}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-800">
            Product photo
            <span className="ml-1 font-normal text-slate-400">(optional)</span>
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={handleFileChange}
          />

          <div className="flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              {isUploading ? (
                <div className="flex h-full items-center justify-center">
                  <Spinner className="h-5 w-5 text-slate-400" />
                </div>
              ) : (
                <ProductImage
                  src={imageUrl || null}
                  alt="Selected product photo"
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading
                  ? 'Uploading...'
                  : imageUrl
                    ? 'Choose a different photo'
                    : 'Choose from gallery'}
              </Button>
              {imageUrl && !isUploading && (
                <button
                  type="button"
                  className="text-left text-xs font-medium text-slate-500 hover:text-slate-700"
                  onClick={() => setValue('imageUrl', '', { shouldValidate: true })}
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>

          {imageError && <p className="text-xs font-medium text-red-600">{imageError}</p>}
          {errors.imageUrl && (
            <p className="text-xs font-medium text-red-600">{errors.imageUrl.message}</p>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" isLoading={isSubmitting}>
            {isSubmitting ? 'Adding product...' : 'Add product'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push('/products')}>
            View catalogue
          </Button>
        </div>
      </form>
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
