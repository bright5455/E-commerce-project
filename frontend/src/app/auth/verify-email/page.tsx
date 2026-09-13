'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { LoadingBlock } from '@/components/ui/Spinner';
import { verifyEmail } from '@/lib/api/auth';
import { getErrorMessage } from '@/lib/errors';

/**
 * Landing page for the link in the verification email.
 *
 * The route is /auth/verify-email because MailService builds the link as
 * `${FRONTEND_URL}/auth/verify-email?token=...` (mail.service.ts:138). Point
 * FRONTEND_URL at this app and the emailed link lands here unchanged.
 */
function VerifyEmail() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('');
  // React 18+ dev remounts effects; the token is single-use, so only fire once.
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    if (!token) {
      setStatus('error');
      setMessage(
        'This verification link is missing its token. Use the exact link from your email.',
      );
      return;
    }

    verifyEmail(token)
      .then((response) => {
        setStatus('success');
        setMessage(response.message);
      })
      .catch((error) => {
        setStatus('error');
        setMessage(getErrorMessage(error));
      });
  }, [token]);

  if (status === 'pending') {
    return <LoadingBlock label="Verifying your email address" />;
  }

  const isSuccess = status === 'success';

  return (
    <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6">
      <div
        className={
          isSuccess
            ? 'mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600'
            : 'mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600'
        }
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d={
              isSuccess
                ? 'M4.5 12.75l6 6 9-13.5'
                : 'M12 9v3.75m0 3.75h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
            }
          />
        </svg>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        {isSuccess ? 'Email verified' : 'We could not verify that link'}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{message}</p>

      <Link
        href="/login"
        className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-lg bg-slate-900 px-6 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        {isSuccess ? 'Sign in' : 'Back to sign in'}
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading" />}>
      <VerifyEmail />
    </Suspense>
  );
}
