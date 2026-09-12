import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { CartProvider } from '@/components/providers/CartProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';

export const metadata: Metadata = {
  title: {
    default: 'Northwind - Online Store',
    template: '%s | Northwind',
  },
  description:
    'Browse products, build a cart and pay from your wallet balance. Storefront for a NestJS, PostgreSQL and TypeORM commerce API.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-white text-slate-900">
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <a
                href="#main"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
              >
                Skip to content
              </a>
              {/* Header reads useSearchParams, so it needs a Suspense boundary. */}
              <Suspense fallback={<div className="h-16 border-b border-slate-200" />}>
                <Header />
              </Suspense>
              <main id="main" className="flex-1">
                {children}
              </main>
              <Footer />
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
