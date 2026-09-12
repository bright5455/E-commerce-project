'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import { LoadingBlock } from '@/components/ui/Spinner';

/**
 * Client-side guard for pages that need a session.
 *
 * The backend is the real authority - every protected endpoint is behind
 * JwtAuthGuard and will 401 regardless of what the browser thinks. This just
 * saves the shopper from watching a page fail, and sends them back where they
 * were after signing in.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isLoading || isAuthenticated) return;

    const query = searchParams.toString();
    const returnTo = query ? `${pathname}?${query}` : pathname;
    router.replace(`/login?redirect=${encodeURIComponent(returnTo)}`);
  }, [isAuthenticated, isLoading, pathname, router, searchParams]);

  if (isLoading) {
    return <LoadingBlock label="Checking your session" />;
  }

  if (!isAuthenticated) {
    return <LoadingBlock label="Redirecting to sign in" />;
  }

  return <>{children}</>;
}
