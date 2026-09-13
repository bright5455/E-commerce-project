import { api } from './client';
import type {
  WalletBalance,
  WalletDepositResponse,
  WalletTransactionHistory,
} from '../types';

/**
 * The wallet IS this platform's payment method. There is no external gateway in
 * the backend: POST /wallet/deposit credits the balance directly, and
 * POST /orders/checkout debits it. Both are plain authed JSON calls, so no
 * payment secret ever reaches the browser.
 *
 * Note these endpoints return purpose-built shapes, not the Wallet entity -
 * see WalletService.getBalance / getTransactionHistory.
 */

/** GET /wallet -> { walletId, balance } with balance as a fixed-2 string. */
export async function getWallet() {
  const { data } = await api.get<WalletBalance>('/wallet');
  return data;
}

/** GET /wallet/transactions -> paginated ledger. */
export async function getWalletTransactions() {
  const { data } = await api.get<WalletTransactionHistory>('/wallet/transactions');
  return data;
}

/** POST /wallet/deposit -> { message, newBalance, transaction } */
export async function depositToWallet(amount: number, description?: string) {
  const { data } = await api.post<WalletDepositResponse>('/wallet/deposit', {
    amount,
    ...(description ? { description } : {}),
  });
  return data;
}
