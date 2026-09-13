'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { cancelOrder } from '@/lib/api/orders';
import { getErrorMessage } from '@/lib/errors';

interface CancelOrderButtonProps {
  orderId: string;
  onCancelled: () => Promise<void> | void;
}

/**
 * PATCH /orders/:id/cancel requires a non-empty reason and refunds the paid
 * total back to the wallet, so it deserves an explicit confirmation step.
 */
export function CancelOrderButton({ orderId, onCancelled }: CancelOrderButtonProps) {
  const toast = useToast();
  const [isConfirming, setIsConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCancel() {
    const trimmed = reason.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    try {
      await cancelOrder(orderId, trimmed);
      toast.success('Order cancelled. Your wallet has been refunded.');
      setIsConfirming(false);
      setReason('');
      await onCancelled();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isConfirming) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">Need to cancel?</h2>
        <p className="mt-1 text-sm text-slate-500">
          You can cancel while the order is still pending or processing. The total goes
          straight back to your wallet.
        </p>
        <Button
          variant="secondary"
          className="mt-4"
          fullWidth
          onClick={() => setIsConfirming(true)}
        >
          Cancel this order
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5">
      <h2 className="text-base font-semibold text-red-900">Cancel this order?</h2>
      <p className="mt-1 text-sm text-red-800">
        This cannot be undone. Tell us why so we can record it.
      </p>

      <label
        htmlFor="cancel-reason"
        className="mt-4 block text-sm font-medium text-red-900"
      >
        Reason
      </label>
      <textarea
        id="cancel-reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={3}
        placeholder="Ordered the wrong size"
        className="mt-1.5 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20"
      />

      <div className="mt-4 flex gap-2">
        <Button
          variant="danger"
          onClick={handleCancel}
          isLoading={isSubmitting}
          disabled={!reason.trim()}
          fullWidth
        >
          {isSubmitting ? 'Cancelling...' : 'Confirm cancellation'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setIsConfirming(false);
            setReason('');
          }}
          disabled={isSubmitting}
        >
          Keep order
        </Button>
      </div>
    </div>
  );
}
