'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCart } from '@/components/providers/CartProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { cn, initialsOf } from '@/lib/format';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Shop' },
  { href: '/orders', label: 'Orders' },
];

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { itemCount } = useCart();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  // Keep the box in step with the URL so a shared /products?search=... link
  // shows its own term.
  useEffect(() => {
    setQuery(pathname === '/products' ? (searchParams.get('search') ?? '') : '');
  }, [pathname, searchParams]);

  // Any navigation closes whatever was open.
  useEffect(() => {
    setIsMenuOpen(false);
    setIsAccountOpen(false);
  }, [pathname]);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/products?search=${encodeURIComponent(trimmed)}` : '/products');
  }

  async function handleLogout() {
    await logout();
    toast.success('You have been signed out');
    router.push('/');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
            N
          </span>
          <span className="text-base font-semibold tracking-tight text-slate-900">
            Northwind
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? 'page' : undefined}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900',
                pathname === link.href
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <form
          role="search"
          onSubmit={handleSearch}
          className="ml-auto hidden max-w-xs flex-1 md:block lg:max-w-sm"
        >
          <label htmlFor="site-search" className="sr-only">
            Search products
          </label>
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
              />
            </svg>
            <input
              id="site-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link
            href="/cart"
            className="relative rounded-lg p-2.5 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            aria-label={
              itemCount > 0
                ? `Cart, ${itemCount} item${itemCount === 1 ? '' : 's'}`
                : 'Cart, empty'
            }
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
              />
            </svg>
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1 text-[11px] font-semibold text-white">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>

          {isLoading ? (
            <div className="h-9 w-20 animate-pulse rounded-lg bg-slate-100" />
          ) : isAuthenticated && user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAccountOpen((open) => !open)}
                aria-expanded={isAccountOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-lg p-1.5 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  {initialsOf(user.firstName, user.lastName)}
                </span>
                <span className="hidden max-w-24 truncate text-sm font-medium text-slate-700 lg:block">
                  {user.firstName}
                </span>
              </button>

              {isAccountOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    aria-hidden="true"
                    onClick={() => setIsAccountOpen(false)}
                  />
                  <div
                    role="menu"
                    className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                  >
                    <div className="border-b border-slate-100 px-3 py-2">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                    <Link
                      href="/profile"
                      role="menuitem"
                      className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/orders"
                      role="menuitem"
                      className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      My orders
                    </Link>
                    <Link
                      href="/wallet"
                      role="menuitem"
                      className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Wallet
                    </Link>
                    {ADMIN_ROLES.has(user.role) && (
                      <>
                        <Link
                          href="/admin/products/new"
                          role="menuitem"
                          className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          Add product
                        </Link>
                        <Link
                          href="/admin/orders"
                          role="menuitem"
                          className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          Manage orders
                        </Link>
                      </>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="block w-full border-t border-slate-100 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="hidden rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 sm:block"
              >
                Create account
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav"
            aria-label="Toggle navigation menu"
            className="rounded-lg p-2.5 text-slate-600 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 md:hidden"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={isMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
              />
            </svg>
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div id="mobile-nav" className="border-t border-slate-200 bg-white md:hidden">
          <div className="space-y-3 px-4 py-4">
            <form role="search" onSubmit={handleSearch}>
              <label htmlFor="mobile-search" className="sr-only">
                Search products
              </label>
              <input
                id="mobile-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products"
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </form>
            <nav aria-label="Mobile" className="flex flex-col">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {link.label}
                </Link>
              ))}
              {isAuthenticated && (
                <>
                  <Link
                    href="/wallet"
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Wallet
                  </Link>
                  <Link
                    href="/profile"
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Profile
                  </Link>
                  {user && ADMIN_ROLES.has(user.role) && (
                    <>
                      <Link
                        href="/admin/products/new"
                        className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Add product
                      </Link>
                      <Link
                        href="/admin/orders"
                        className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Manage orders
                      </Link>
                    </>
                  )}
                </>
              )}
              {!isAuthenticated && !isLoading && (
                <Link
                  href="/register"
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Create account
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
