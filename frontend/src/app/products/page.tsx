import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProductCard, ProductCardSkeleton } from '@/components/products/ProductCard';
import { ProductFilters } from '@/components/products/ProductFilters';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { listProducts } from '@/lib/api/products';
import { getErrorMessage } from '@/lib/errors';
import type { ProductQuery } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Products',
  description: 'Browse the full Northwind catalogue.',
};

const PAGE_SIZE = 12;

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toPositiveNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function buildQuery(params: SearchParams): ProductQuery {
  const order = first(params.order);

  return {
    page: Math.max(1, Number.parseInt(first(params.page) ?? '1', 10) || 1),
    limit: PAGE_SIZE,
    search: first(params.search)?.trim() || undefined,
    minPrice: toPositiveNumber(first(params.minPrice)),
    maxPrice: toPositiveNumber(first(params.maxPrice)),
    sortBy: first(params.sortBy) ?? 'createdAt',
    order: order === 'ASC' ? 'ASC' : 'DESC',
  };
}

async function ProductResults({ params }: { params: SearchParams }) {
  const query = buildQuery(params);

  let data;
  try {
    data = await listProducts(query);
  } catch (error) {
    return <ErrorState message={getErrorMessage(error)} />;
  }

  if (data.products.length === 0) {
    return (
      <EmptyState
        title={query.search ? `No results for "${query.search}"` : 'No products found'}
        description={
          query.search || query.minPrice || query.maxPrice
            ? 'Try a different search term or widen your price range.'
            : 'The catalogue is empty. Products created through the admin API will show up here.'
        }
        action={{ href: '/products', label: 'Clear filters' }}
      />
    );
  }

  function hrefForPage(page: number) {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const single = first(value);
      if (single) next.set(key, single);
    }
    next.set('page', String(page));
    return `/products?${next.toString()}`;
  }

  return (
    <>
      <p className="text-sm text-slate-500">
        Showing {data.products.length} of {data.total} product{data.total === 1 ? '' : 's'}
        {query.search ? ` matching "${query.search}"` : ''}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
        {data.products.map((product, index) => (
          <ProductCard key={product.id} product={product} priority={index < 4} />
        ))}
      </div>

      <div className="mt-10">
        <Pagination page={data.page} totalPages={data.totalPages} buildHref={hrefForPage} />
      </div>
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  // Re-mounts the streamed results whenever the filters change.
  const suspenseKey = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) => {
      const single = first(value);
      return single ? [[key, single] as [string, string]] : [];
    }),
  ).toString();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Products</h1>
        <p className="mt-1 text-sm text-slate-500">
          Everything currently in stock, straight from the catalogue.
        </p>
      </header>

      <Suspense fallback={<div className="h-20 animate-pulse rounded-xl bg-slate-100" />}>
        <ProductFilters />
      </Suspense>

      <div className="mt-8">
        <Suspense key={suspenseKey} fallback={<ResultsSkeleton />}>
          <ProductResults params={params} />
        </Suspense>
      </div>
    </div>
  );
}
