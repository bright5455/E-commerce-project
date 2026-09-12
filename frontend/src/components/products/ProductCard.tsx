import Link from 'next/link';
import { AddToCartButton } from './AddToCartButton';
import { ProductImage } from './ProductImage';
import { StockBadge } from '@/components/ui/Badge';
import { formatPrice } from '@/lib/format';
import type { Product } from '@/lib/types';

export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-sm">
      <Link
        href={`/products/${product.id}`}
        className="relative block aspect-square overflow-hidden bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        aria-label={`View ${product.name}`}
      >
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          priority={priority}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium leading-snug text-slate-900">
              <Link
                href={`/products/${product.id}`}
                className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                {product.name}
              </Link>
            </h3>
          </div>
          <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">
            {product.description}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-lg font-semibold tracking-tight text-slate-900">
            {formatPrice(product.price)}
          </p>
          <StockBadge stock={product.stock} isActive={product.isActive} />
        </div>

        <div className="flex gap-2">
          <AddToCartButton product={product} size="sm" fullWidth />
          <Link
            href={`/products/${product.id}`}
            className="inline-flex h-9 shrink-0 items-center rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            View
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="aspect-square animate-pulse bg-slate-100" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-6 w-1/3 animate-pulse rounded bg-slate-200" />
        <div className="h-9 w-full animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}
