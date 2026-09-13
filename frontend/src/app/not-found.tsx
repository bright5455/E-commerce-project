import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        We could not find that page
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        The link may be out of date, or the product may have been withdrawn from the
        catalogue.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/products"
          className="inline-flex h-11 items-center rounded-lg bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Browse products
        </Link>
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
