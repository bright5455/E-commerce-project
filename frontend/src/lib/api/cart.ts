import { api } from './client';
import type {
  CartItem,
  CartResponse,
  CartValidationResponse,
  MessageResponse,
} from '../types';

/** All cart endpoints require a bearer token (CartController is guarded as a whole). */

/** GET /cart */
export async function getCart() {
  const { data } = await api.get<CartResponse>('/cart');
  return data;
}

/** POST /cart */
export async function addToCart(productId: string, quantity: number) {
  const { data } = await api.post<{ message: string; cartItem: CartItem }>('/cart', {
    productId,
    quantity,
  });
  return data;
}

/** PATCH /cart/:cartItemId/quantity - id is the cart row id, not the product id. */
export async function updateCartItemQuantity(cartItemId: string, quantity: number) {
  const { data } = await api.patch<{ message: string; cartItem: CartItem }>(
    `/cart/${cartItemId}/quantity`,
    { quantity },
  );
  return data;
}

/** DELETE /cart/:cartItemId */
export async function removeCartItem(cartItemId: string) {
  const { data } = await api.delete<MessageResponse>(`/cart/${cartItemId}`);
  return data;
}

/** DELETE /cart - 400s if the cart is already empty. */
export async function clearCart() {
  const { data } = await api.delete<MessageResponse>('/cart');
  return data;
}

/** POST /cart/validate - checks stock and availability before checkout. */
export async function validateCart() {
  const { data } = await api.post<CartValidationResponse>('/cart/validate');
  return data;
}
