import { api } from './client';
import type { CheckoutPayload, Order, OrderStatus, PaginatedResponse } from '../types';

export interface OrderQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
}

/**
 * POST /orders/checkout
 *
 * This is the payment step. The backend reads the caller's cart, prices it,
 * debits the wallet, writes the order, decrements stock and empties the cart -
 * all inside one transaction. A 400 here means the cart is empty, stock ran out
 * or the wallet balance is too low; nothing is charged in any of those cases.
 */
export async function checkout(payload: CheckoutPayload) {
  const { data } = await api.post<Order>('/orders/checkout', payload);
  return data;
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
