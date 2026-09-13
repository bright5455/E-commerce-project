'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RequireAuth } from '@/components/providers/RequireAuth';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/Field';
import { LoadingBlock } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/States';
import { depositToWallet, getWallet, getWalletTransactions } from '@/lib/api/wallet';
import { getErrorMessage } from '@/lib/errors';
import { formatDateTime, formatPrice, toNumber } from '@/lib/format';
import { depositSchema, type DepositFormValues } from '@/lib/validation';
import type { TransactionType, WalletTransactionSummary } from '@/lib/types';

/** Credits move money in, debits move it out. */
const CREDIT_TYPES: TransactionType[] = ['deposit', 'refund', 'transfer_in', 'bonus'];

const TYPE_LABELS: Record<TransactionType, string> = {
  deposit: 'Top-up',
  withdrawal: 'Withdrawal',
  payment: 'Order payment',
  refund: 'Refund',
  transfer_in: 'Transfer in',
  transfer_out: 'Transfer out',
  commission: 'Commission',
  bonus: 'Bonus',
  penalty: 'Penalty',
};

function TransactionRow({ transaction }: { transaction: WalletTransactionSummary }) {
  const isCredit = CREDIT_TYPES.includes(transaction.type);
  const amount = toNumber(transaction.amount);

  return (
    <li className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">
          {TYPE_LABELS[transaction.type] ?? transaction.type}
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{transaction.description}</p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={
            isCredit
              ? 'text-sm font-semibold text-emerald-700'
              : 'text-sm font-semibold text-slate-900'
          }
        >
          {isCredit ? '+' : '-'}
          {formatPrice(amount)}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">{formatDateTime(transaction.date)}</p>
      </div>
    </li>
  );
}

function WalletOverview() {
  const toast = useToast();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransactionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DepositFormValues>({
    resolver: zodResolver(depositSchema),
    defaultValues: { amount: undefined },
  });

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [wallet, history] = await Promise.all([getWallet(), getWalletTransactions()]);
      setBalance(toNumber(wallet.balance));
      setTransactions(history.transactions ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onDeposit(values: DepositFormValues) {
    try {
      const response = await depositToWallet(values.amount, 'Wallet top-up');
      setBalance(toNumber(response.newBalance));
      reset({ amount: undefined });
      toast.success(`${formatPrice(values.amount)} added to your wallet`);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (isLoading) return <LoadingBlock label="Loading your wallet" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      <div className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-slate-900 p-6 text-white">
          <p className="text-sm text-slate-300">Available balance</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight">
            {formatPrice(balance)}
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
            This balance pays for your orders. Checkout debits it and a cancelled order
            refunds it automatically.
          </p>
        </section>

        <section
          aria-labelledby="history-heading"
          className="rounded-xl border border-slate-200 bg-white p-5"
        >
          <h2 id="history-heading" className="text-base font-semibold text-slate-900">
            Recent activity
          </h2>

          {transactions.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-4 py-8 text-center text-sm text-slate-500">
              No wallet activity yet. Top up to get started.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {transactions.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <section
        aria-labelledby="topup-heading"
        className="rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-24"
      >
        <h2 id="topup-heading" className="text-base font-semibold text-slate-900">
          Add funds
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Credits your balance immediately through the API.
        </p>

        <form onSubmit={handleSubmit(onDeposit)} noValidate className="mt-5 space-y-4">
          <InputField
            label="Amount"
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            placeholder="0.00"
            error={errors.amount?.message}
            {...register('amount')}
          />

          <Button type="submit" isLoading={isSubmitting} fullWidth size="lg">
            {isSubmitting ? 'Adding funds...' : 'Add funds'}
          </Button>
        </form>

        <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-400">
          The backend has no external payment gateway, so deposits are credited directly. If
          you add one later, this form becomes the place to hand off to it.
        </p>
      </section>
    </div>
  );
}

export default function WalletPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight text-slate-900">Wallet</h1>
      <Suspense fallback={<LoadingBlock />}>
        <RequireAuth>
          <WalletOverview />
        </RequireAuth>
      </Suspense>
    </div>
  );
}
