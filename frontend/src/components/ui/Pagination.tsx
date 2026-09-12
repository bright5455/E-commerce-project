import Link from 'next/link';
import { cn } from '@/lib/format';

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Builds the href for a page number, e.g. (p) => `/products?page=${p}`. */
  buildHref: (page: number) => string;
}

/** Compact page window: first, last, current and its neighbours. */
function pageWindow(page: number, totalPages: number): Array<number | 'gap'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const result: Array<number | 'gap'> = [];
  let previous = 0;
  for (const current of sorted) {
    if (previous && current - previous > 1) result.push('gap');
    result.push(current);
    previous = current;
  }
  return result;
}

export function Pagination({ page, totalPages, buildHref }: PaginationProps) {
  if (totalPages <= 1) return null;

  const items = pageWindow(page, totalPages);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
      <PageLink
        href={buildHref(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="px-3"
      >
        Previous
      </PageLink>

      {items.map((item, index) =>
        item === 'gap' ? (
          <span
            key={`gap-${index}`}
            className="px-2 text-sm text-slate-400"
            aria-hidden="true"
          >
            ...
          </span>
        ) : (
          <PageLink
            key={item}
            href={buildHref(item)}
            isCurrent={item === page}
            aria-label={`Page ${item}`}
            className="min-w-10"
          >
            {item}
          </PageLink>
        ),
      )}

      <PageLink
        href={buildHref(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className="px-3"
      >
        Next
      </PageLink>
    </nav>
  );
}

interface PageLinkProps {
  href: string;
  disabled?: boolean;
  isCurrent?: boolean;
  className?: string;
  'aria-label': string;
  children: React.ReactNode;
}

function PageLink({
  href,
  disabled,
  isCurrent,
  className,
  children,
  ...rest
}: PageLinkProps) {
  const base = cn(
    'inline-flex h-10 items-center justify-center rounded-lg border px-2 text-sm font-medium transition',
    className,
  );

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={cn(base, 'cursor-not-allowed border-slate-200 text-slate-300')}
        {...rest}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-current={isCurrent ? 'page' : undefined}
      className={cn(
        base,
        isCurrent
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}
