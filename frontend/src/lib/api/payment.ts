import { api } from './client';
import type { Order, PaymentInitResult } from '../types';

/**
 * GET /payment/verify/:reference
 *
 * Confirms a Paystack payment and finalizes the order server-side (decrements
 * stock, marks it paid, clears the cart). Safe to call more than once - the
 * backend is idempotent, since the webhook may finalize the same order first.
 */
export async function verifyPayment(reference: string) {
  const { data } = await api.get<Order>(`/payment/verify/${reference}`);
  return data;
}

/**
 * POST /payment/initialize
 *
 * Re-opens a Paystack payment session for an order that's still PENDING and
 * unpaid - used when a popup was closed early or a session expired.
 */
export async function retryPayment(orderId: string) {
  const { data } = await api.post<{ order: Order; payment: PaymentInitResult }>(
    '/payment/initialize',
    { orderId },
  );
  return data;
}
