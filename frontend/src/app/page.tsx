import Link from 'next/link';
import { ProductCard } from '@/components/products/ProductCard';
import { ProductImage } from '@/components/products/ProductImage';
import { ErrorState } from '@/components/ui/States';
import { getTopSelling, listProducts } from '@/lib/api/products';
import { getErrorMessage } from '@/lib/errors';
import type { Product } from '@/lib/types';

/**
 * Server Component: the catalogue is public, so it renders on the server with
 * no token involved. Only the interactive bits below (add to cart) are client
 * components.
 */

const VALUE_PROPS = [
  {
    title: 'Live stock',
    body: 'Every product shows the real quantity left, checked again the moment you pay.',
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  },
  {
    title: 'Wallet checkout',
    body: 'Top up once, then pay in a single click. Cancel an order and the refund is instant.',
    icon: 'M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9v3',
  },
  {
    title: 'Order tracking',
    body: 'Every order keeps its own reference, status history and full item breakdown.',
    icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z',
  },
];

async function loadHomeProducts(): Promise<
  | { featured: Product[]; latest: Product[]; error: null }
  | { featured: []; latest: []; error: string }
> {
  try {
    const [featured, latest] = await Promise.all([
      getTopSelling(4),
      listProducts({ limit: 8, sortBy: 'createdAt', order: 'DESC' }),
    ]);
    return { featured, latest: latest.products, error: null };
  } catch (error) {
    return { featured: [], latest: [], error: getErrorMessage(error) };
  }
}

export default async function HomePage() {
  const { featured, latest, error } = await loadHomeProducts();

  return (
    <>
      <section className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:py-24">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Northwind Store
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Everything you need, priced honestly.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-600">
              A working storefront on a real API. Browse the catalogue, build a cart, pay
              from your wallet balance and follow the order all the way through.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/products"
                className="inline-flex h-12 items-center rounded-lg bg-slate-900 px-6 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                Browse products
              </Link>
              <Link
                href="/register"
                className="inline-flex h-12 items-center rounded-lg border border-slate-300 bg-white px-6 text-sm font-medium text-slate-900 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                Create an account
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {(featured.length > 0 ? featured : latest).slice(0, 4).map((product, index) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                <div className="aspect-square overflow-hidden bg-slate-50">
                  <ProductImage
                    src={product.imageUrl}
                    alt={product.name}
                    priority={index < 2}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                </div>
                <p className="truncate px-3 py-2 text-xs font-medium text-slate-700">
                  {product.name}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-3">
          {VALUE_PROPS.map((item) => (
            <div key={item.title} className="flex gap-3">
              <svg
                className="h-6 w-6 shrink-0 text-slate-900"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{item.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Featured products
            </h2>
            <p className="mt-1 text-sm text-slate-500">Popular picks from the catalogue.</p>
          </div>
          <Link
            href="/products"
            className="shrink-0 text-sm font-medium text-slate-900 underline-offset-4 hover:underline"
          >
            View all
          </Link>
        </div>

        <div className="mt-6">
          {error ? (
            <ErrorState message={error} />
          ) : featured.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center text-sm text-slate-500">
              No products have been published yet. Add some through the admin API and they
              will appear here.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {featured.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index < 4} />
              ))}
            </div>
          )}
        </div>
      </section>

      {latest.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            New arrivals
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {latest.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
