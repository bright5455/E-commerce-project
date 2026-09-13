'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/providers/ToastProvider';
import { depositToWallet } from '@/lib/api/wallet';
import { getErrorMessage } from '@/lib/errors';
import { formatPrice } from '@/lib/format';

interface WalletPaymentPanelProps {
  balance: number;
  amountDue: number;
  isLoading: boolean;
  /** Called after a successful top-up so the parent can re-read the balance. */
  onFunded: () => Promise<void> | void;
}

/**
 * The payment step.
 *
 * This backend has no external gateway - POST /wallet/deposit credits the
 * balance and POST /orders/checkout debits it, both as authed JSON calls. No
 * payment key exists client-side because none is needed.
 */
export function WalletPaymentPanel({
  balance,
  amountDue,
  isLoading,
  onFunded,
}: WalletPaymentPanelProps) {
  const toast = useToast();
  const [isDepositing, setIsDepositing] = useState(false);

  const shortfall = Math.max(0, Math.round((amountDue - balance) * 100) / 100);
  const covered = shortfall === 0;

  async function handleTopUp(amount: number) {
    if (amount <= 0) return;

    setIsDepositing(true);
    try {
      await depositToWallet(amount, 'Wallet top-up at checkout');
      await onFunded();
      toast.success(`${formatPrice(amount)} added to your wallet`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsDepositing(false);
    }
  }

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
            Orders are paid from your wallet balance.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6"
            />
          </svg>
          Wallet
        </span>
      </div>

      <dl className="mt-4 space-y-2.5 border-t border-slate-100 pt-4 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Wallet balance</dt>
          <dd className="font-medium text-slate-900">
            {isLoading ? (
              <Spinner className="h-4 w-4 text-slate-400" />
            ) : (
              formatPrice(balance)
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Amount due</dt>
          <dd className="font-medium text-slate-900">{formatPrice(amountDue)}</dd>
        </div>
        {!covered && !isLoading && (
          <div className="flex items-center justify-between">
            <dt className="font-medium text-red-600">Short by</dt>
            <dd className="font-semibold text-red-600">{formatPrice(shortfall)}</dd>
          </div>
        )}
      </dl>

      {isLoading ? null : covered ? (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-900">
          <svg
            className="h-4 w-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Your balance covers this order.
        </p>
      ) : (
        <div className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-900">Top up your wallet to place this order.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => handleTopUp(shortfall)}
              isLoading={isDepositing}
            >
              Add {formatPrice(shortfall)}
            </Button>
            {[100, 500, 1000].map((amount) => (
              <Button
                key={amount}
                size="sm"
                variant="secondary"
                onClick={() => handleTopUp(amount)}
                disabled={isDepositing}
              >
                +{formatPrice(amount)}
              </Button>
            ))}
          </div>
          <p className="text-xs text-amber-800">
            This demo credits the wallet directly through the API. Swap this call for a
            gateway redirect if you add one to the backend.
          </p>
        </div>
      )}
    </section>
  );
}
