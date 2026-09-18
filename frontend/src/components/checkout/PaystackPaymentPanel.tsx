'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { verifyPayment, retryPayment } from '@/lib/api/payment';
import { getErrorMessage } from '@/lib/errors';
import { formatPrice, toNumber } from '@/lib/format';
import type { Order, PaymentInitResult } from '@/lib/types';

interface PaystackPaymentPanelProps {
  order: Order;
  payment: PaymentInitResult;
  /** Called once the order is confirmed paid (after verify()). */
  onPaid: (order: Order) => void;
}

/**
 * The card payment step for a PENDING order already created by
 * POST /orders/checkout. Opens Paystack's inline popup against the
 * server-issued access code - never a client-generated reference, so the
 * later verify call can always be tied back to this exact order.
 *
 * The popup's onSuccess is only used for fast UI feedback (it triggers an
 * immediate verify call); the Paystack webhook is the authoritative source of
 * truth for actually fulfilling the order, and finalizePaidOrder() on the
 * backend is idempotent so whichever arrives first wins.
 */
export function PaystackPaymentPanel({ order, payment, onPaid }: PaystackPaymentPanelProps) {
  const toast = useToast();
  const [status, setStatus] = useState<'idle' | 'opening' | 'verifying' | 'closed'>('idle');
  const [activePayment, setActivePayment] = useState(payment);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify(reference: string) {
    setStatus('verifying');
    try {
      const paidOrder = await verifyPayment(reference);
      onPaid(paidOrder);
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus('closed');
    }
  }

  async function openPopup() {
    setError(null);
    setStatus('opening');

    try {
      const { default: PaystackPop } = await import('@paystack/inline-js');
      const popup = new PaystackPop();

      popup.resumeTransaction(activePayment.accessCode, {
        onSuccess: (transaction) => {
          void handleVerify(transaction.reference);
        },
        onCancel: () => {
          setStatus('closed');
        },
        onError: (err) => {
          setError(err.message || 'The payment could not be completed.');
          setStatus('closed');
        },
      });
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus('closed');
    }
  }

  async function handleRetry() {
    setError(null);
    setStatus('opening');
    try {
      const result = await retryPayment(order.id);
      setActivePayment(result.payment);
      toast.success('New payment session started');
      setStatus('idle');
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus('closed');
    }
  }

  const busy = status === 'opening' || status === 'verifying';

  return (
    <section
      aria-labelledby="payment-heading"
      className="rounded-xl border border-slate-200 bg-white p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="payment-heading" className="text-base font-semibold text-slate-900">
            Payment
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Pay {formatPrice(toNumber(order.total))} securely with Paystack.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          Card
        </span>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="mt-4 space-y-3">
        <Button type="button" size="lg" fullWidth isLoading={busy} onClick={openPopup}>
          {status === 'verifying'
            ? 'Confirming payment...'
            : `Pay ${formatPrice(toNumber(order.total))} with card`}
        </Button>

        {status === 'closed' && (
          <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm text-amber-900">Payment wasn&apos;t completed.</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={handleRetry}>
                Try again
              </Button>
              <a
                href={activePayment.authorizationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
              >
                Open payment page instead
              </a>
            </div>
          </div>
        )}

        <p className="text-center text-xs leading-relaxed text-slate-400">
          Your order is reserved and will be confirmed automatically once payment succeeds.
        </p>
      </div>
    </section>
  );
}
