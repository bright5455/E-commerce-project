import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductImage } from '@/components/products/ProductImage';
import { ProductPurchasePanel } from '@/components/products/ProductPurchasePanel';
import { StockBadge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/States';
import { getProduct } from '@/lib/api/products';
import { ApiError } from '@/lib/errors';
import { formatDate, formatPrice } from '@/lib/format';
import type { Product } from '@/lib/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function loadProduct(id: string): Promise<Product | 'not-found' | ApiError> {
  try {
    return await getProduct(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return 'not-found';
    return error instanceof ApiError
      ? error
      : new ApiError('Could not load this product.', 0);
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await loadProduct(id);

  if (typeof result === 'string' || result instanceof ApiError) {
    return { title: 'Product' };
  }

  return {
    title: result.name,
    description: result.description.slice(0, 155),
  };
}

function averageRating(product: Product): { average: number; count: number } | null {
  if (!product.reviews || product.reviews.length === 0) return null;
  const total = product.reviews.reduce((sum, review) => sum + review.rating, 0);
  return { average: total / product.reviews.length, count: product.reviews.length };
}

function Stars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={
            star <= Math.round(value) ? 'h-4 w-4 text-amber-400' : 'h-4 w-4 text-slate-200'
          }
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.363 1.118l1.286 3.958c.3.921-.755 1.688-1.539 1.118l-3.366-2.446a1 1 0 00-1.176 0l-3.367 2.446c-.783.57-1.838-.197-1.538-1.118l1.286-3.958a1 1 0 00-.363-1.118L2.063 9.385c-.783-.57-.38-1.81.588-1.81h4.161a1 1 0 00.951-.69l1.286-3.958z" />
        </svg>
      ))}
    </span>
  );
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await loadProduct(id);

  if (result === 'not-found') notFound();

  if (result instanceof ApiError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <ErrorState message={result.message} />
      </div>
    );
  }

  const product = result;
  const rating = averageRating(product);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex items-center gap-2 text-sm text-slate-500"
      >
        <Link href="/" className="hover:text-slate-900">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/products" className="hover:text-slate-900">
          Products
        </Link>
        <span aria-hidden="true">/</span>
        <span className="truncate text-slate-900">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            priority
            className="aspect-square h-full w-full object-cover"
          />
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <StockBadge stock={product.stock} isActive={product.isActive} />
              {rating && (
                <span className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Stars value={rating.average} />
                  <span>
                    {rating.average.toFixed(1)} ({rating.count} review
                    {rating.count === 1 ? '' : 's'})
                  </span>
                </span>
              )}
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              {product.name}
            </h1>

            <p className="text-3xl font-semibold tracking-tight text-slate-900">
              {formatPrice(product.price)}
            </p>
          </div>

          <div className="prose-sm">
            <h2 className="text-sm font-semibold text-slate-900">Description</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {product.description}
            </p>
          </div>

          <ProductPurchasePanel product={product} />

          <dl className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-6 text-sm">
            <div>
              <dt className="text-slate-500">Availability</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Unit price</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {formatPrice(product.price)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Listed</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {formatDate(product.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Product ID</dt>
              <dd className="mt-0.5 truncate font-mono text-xs text-slate-600">
                {product.id}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {product.reviews && product.reviews.length > 0 && (
        <section className="mt-16 border-t border-slate-200 pt-10">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Customer reviews
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {product.reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <Stars value={review.rating} />
                  <span className="text-xs text-slate-400">
                    {formatDate(review.createdAt)}
                  </span>
                </div>
                {review.comment && (
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    {review.comment}
                  </p>
                )}
                {review.user && (
                  <p className="mt-3 text-xs font-medium text-slate-500">
                    {review.user.firstName} {review.user.lastName?.[0] ?? ''}.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
