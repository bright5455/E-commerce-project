'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as cartApi from '@/lib/api/cart';
import { getErrorMessage } from '@/lib/errors';
import type { CartResponse } from '@/lib/types';
import { useAuth } from './AuthProvider';

interface CartContextValue {
  cart: CartResponse | null;
  itemCount: number;
  isLoading: boolean;
  error: string | null;
  /** Re-reads GET /cart. Every mutation below already calls this. */
  refresh: () => Promise<void>;
  addItem: (productId: string, quantity: number) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  clear: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

const EMPTY_CART: CartResponse = { items: [], itemCount: 0, total: '0.00' };

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      setCart(await cartApi.getCart());
    } catch (err) {
      setError(getErrorMessage(err));
      setCart(EMPTY_CART);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // The cart lives on the server per user, so it loads on sign-in and empties
  // from view on sign-out.
  useEffect(() => {
    if (isAuthLoading) return;
    void refresh();
  }, [isAuthLoading, refresh]);

  // Mutations intentionally do not swallow errors: callers show the message and
  // decide what to do. They re-read the cart so the server stays the source of
  // truth for totals and stock-capped quantities.
  const addItem = useCallback(
    async (productId: string, quantity: number) => {
      await cartApi.addToCart(productId, quantity);
      await refresh();
    },
    [refresh],
  );

  const updateQuantity = useCallback(
    async (cartItemId: string, quantity: number) => {
      await cartApi.updateCartItemQuantity(cartItemId, quantity);
      await refresh();
    },
    [refresh],
  );

  const removeItem = useCallback(
    async (cartItemId: string) => {
      await cartApi.removeCartItem(cartItemId);
      await refresh();
    },
    [refresh],
  );

  const clear = useCallback(async () => {
    await cartApi.clearCart();
    await refresh();
  }, [refresh]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      itemCount: cart?.itemCount ?? 0,
      isLoading,
      error,
      refresh,
      addItem,
      updateQuantity,
      removeItem,
      clear,
    }),
    [cart, isLoading, error, refresh, addItem, updateQuantity, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside <CartProvider>');
  }
  return context;
}
