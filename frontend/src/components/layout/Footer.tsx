import Link from 'next/link';

const SHOP_LINKS = [
  { href: '/products', label: 'All products' },
  { href: '/products?sortBy=price&order=ASC', label: 'Lowest price' },
  { href: '/products?sortBy=createdAt&order=DESC', label: 'New arrivals' },
];

const ACCOUNT_LINKS = [
  { href: '/orders', label: 'My orders' },
  { href: '/wallet', label: 'Wallet' },
  { href: '/profile', label: 'Profile' },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
                N
              </span>
              <span className="text-base font-semibold tracking-tight text-slate-900">
                Northwind
              </span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-slate-500">
              A storefront built on a NestJS, PostgreSQL and TypeORM API. Browse, add to
              cart, pay from your wallet balance and track every order.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900">Shop</h2>
            <ul className="mt-3 space-y-2">
              {SHOP_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-500 transition hover:text-slate-900"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900">Account</h2>
            <ul className="mt-3 space-y-2">
              {ACCOUNT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-500 transition hover:text-slate-900"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900">How payment works</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Orders are paid from your account wallet. Top the wallet up, then checkout
              debits it in a single transaction and the balance is refunded automatically if
              you cancel.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Northwind. Demo storefront.
          </p>
        </div>
      </div>
    </footer>
  );
}
