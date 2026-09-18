import { api } from './client';
import type {
  CheckoutPayload,
  CheckoutResult,
  Order,
  OrderStatus,
  PaginatedResponse,
  PaymentInitResult,
} from '../types';

export interface OrderQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
}

/**
 * POST /orders/checkout
 *
 * For `paymentMethod: 'wallet'`, the backend reads the caller's cart, prices
 * it, debits the wallet, writes the order, decrements stock and empties the
 * cart - all inside one transaction - and this resolves to the finished Order.
 *
 * For `paymentMethod: 'card'`, the backend instead creates a PENDING, unpaid
 * order (wallet/stock/cart untouched) and initializes a Paystack transaction
 * for it, resolving to `{ order, payment }`. The order is only fulfilled once
 * the Paystack popup succeeds and the backend verifies it - see
 * lib/api/payment.ts and PaystackPaymentPanel.
 */
export async function checkout(payload: CheckoutPayload) {
  const { data } = await api.post<CheckoutResult>('/orders/checkout', payload);
  return data;
}

/** True when checkout() is still awaiting a Paystack payment, not a finished Order. */
export function isPaymentPending(
  result: CheckoutResult,
): result is { order: Order; payment: PaymentInitResult } {
  return 'payment' in result;
}

/** GET /orders/my-orders */
export async function getMyOrders(query: OrderQuery = {}) {
  const { data } = await api.get<PaginatedResponse<Order>>('/orders/my-orders', {
    params: query,
  });
  return data;
}

/** GET /orders/:id */
export async function getOrder(id: string) {
  const { data } = await api.get<Order>(`/orders/${id}`);
  return data;
}

/** PATCH /orders/:id/cancel - refunds the order total back to the wallet. */
export async function cancelOrder(id: string, reason: string) {
  const { data } = await api.patch<Order>(`/orders/${id}/cancel`, { reason });
  return data;
}
