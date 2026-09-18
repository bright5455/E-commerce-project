'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { LoadingBlock } from '@/components/ui/Spinner';
import { verifyPayment } from '@/lib/api/payment';
import { getErrorMessage } from '@/lib/errors';

/**
 * Landing page for the redirect-fallback path: opened when a shopper follows
 * `payment.authorizationUrl` directly (mobile/webview cases where the inline
 * popup is unreliable) instead of paying through PaystackPaymentPanel's popup.
 * Paystack appends `reference` (and `trxref`, an alias) to this URL - see
 * OrderService.initiatePaystackPayment's callbackPath: '/checkout/callback'.
 */
function CheckoutCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') ?? searchParams.get('trxref');

  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('');
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    if (!reference) {
      setStatus('error');
      setMessage('This payment link is missing its reference. Return to checkout and try again.');
      return;
    }

    verifyPayment(reference)
      .then((order) => {
        setStatus('success');
        router.replace(`/orders/${order.id}/confirmation`);
      })
      .catch((error) => {
        setStatus('error');
        setMessage(getErrorMessage(error));
      });
  }, [reference, router]);

  if (status === 'pending' || status === 'success') {
    return <LoadingBlock label="Confirming your payment" />;
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6">
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
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
            d="M12 9v3.75m0 3.75h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        We could not confirm this payment
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{message}</p>
      <Link
        href="/checkout"
        className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-lg bg-slate-900 px-6 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        Back to checkout
      </Link>
    </div>
  );
}

export default function CheckoutCallbackPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading" />}>
      <CheckoutCallback />
    </Suspense>
  );
}
