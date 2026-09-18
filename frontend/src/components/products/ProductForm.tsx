'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { InputField, TextareaField } from '@/components/ui/Field';
import { FormError } from '@/components/ui/States';
import { Spinner } from '@/components/ui/Spinner';
import { ProductImage } from './ProductImage';
import { uploadProductImage } from '@/lib/api/products';
import { toApiError } from '@/lib/errors';
import { createProductSchema, type CreateProductFormValues } from '@/lib/validation';

interface ProductFormProps {
  initialValues?: CreateProductFormValues;
  submitLabel: string;
  submittingLabel: string;
  onSubmit: (values: CreateProductFormValues) => Promise<void>;
  onCancel: () => void;
  cancelLabel: string;
}

const EMPTY_VALUES: CreateProductFormValues = {
  name: '',
  description: '',
  price: 0,
  stock: 0,
  imageUrl: '',
};

/** Shared by /admin/products/new (create) and /admin/products/[id]/edit (update). */
export function ProductForm({
  initialValues,
  submitLabel,
  submittingLabel,
  onSubmit,
  onCancel,
  cancelLabel,
}: ProductFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<CreateProductFormValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: initialValues ?? EMPTY_VALUES,
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

  // react-hook-form doesn't surface a single combined message; reuse FormError
  // for the first field error only after a submit attempt, matching how the
  // checkout/register forms report a top-level problem.
  const topError =
    submitCount > 0
      ? (errors.name?.message ?? errors.description?.message ?? errors.price?.message)
      : undefined;

  return (
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
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </form>
  );
}
