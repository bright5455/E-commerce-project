'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { estimateTotals, OrderSummary } from '@/components/cart/OrderSummary';
import { WalletPaymentPanel } from '@/components/checkout/WalletPaymentPanel';
import { ProductImage } from '@/components/products/ProductImage';
import { RequireAuth } from '@/components/providers/RequireAuth';
import { useCart } from '@/components/providers/CartProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { InputField, TextareaField } from '@/components/ui/Field';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState, FormError } from '@/components/ui/States';
import { validateCart } from '@/lib/api/cart';
import { checkout } from '@/lib/api/orders';
import { getWallet } from '@/lib/api/wallet';
import { toApiError } from '@/lib/errors';
import { formatPrice, toNumber } from '@/lib/format';
import { checkoutSchema, type CheckoutFormValues } from '@/lib/validation';

function CheckoutFlow() {
  const router = useRouter();
  const { cart, isLoading: isCartLoading, refresh: refreshCart } = useCart();
  const toast = useToast();

  const [balance, setBalance] = useState(0);
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shippingAddress: '',
      shippingCity: '',
      shippingState: '',
      shippingZipCode: '',
      shippingCountry: '',
      phoneNumber: '',
      notes: '',
    },
  });

  const loadWallet = useCallback(async () => {
    setIsWalletLoading(true);
    try {
      const wallet = await getWallet();
      setBalance(toNumber(wallet.balance));
    } catch {
      // A missing wallet is not fatal here - checkout will report it precisely.
      setBalance(0);
    } finally {
      setIsWalletLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  if (isCartLoading && !cart) {
    return <LoadingBlock label="Loading checkout" />;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        title="Nothing to check out"
        description="Your cart is empty, so there is no order to place yet."
        action={{ href: '/products', label: 'Browse products' }}
      />
    );
  }

  const subtotal = toNumber(cart.total);
  const totals = estimateTotals(subtotal);
  const canAfford = balance >= totals.total;
  const busy = isPlacingOrder || isSubmitting;

  async function onSubmit(values: CheckoutFormValues) {
    setSubmitError(null);
    setIsPlacingOrder(true);

    try {
      // Ask the server to re-check stock and availability before we charge
      // anything. Cheaper than a failed checkout and gives a precise message.
      const validation = await validateCart();
      if (!validation.isValid) {
        setSubmitError(
          validation.errors[0] ??
            'Some items in your cart are no longer available. Review your cart and try again.',
        );
        await refreshCart();
        return;
      }

      const order = await checkout({
        shippingAddress: values.shippingAddress,
        shippingCity: values.shippingCity,
        shippingState: values.shippingState,
        shippingZipCode: values.shippingZipCode,
        shippingCountry: values.shippingCountry,
        phoneNumber: values.phoneNumber,
        paymentMethod: 'wallet',
        // notes is optional on CheckoutDto and forbidNonWhitelisted is on, so
        // omit the key entirely when it is blank.
        ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
      });

      // The server empties the cart as part of the same transaction.
      await refreshCart();
      toast.success('Payment complete. Your order is confirmed.');
      router.replace(`/orders/${order.id}/confirmation`);
    } catch (error) {
      const apiError = toApiError(error);
      setSubmitError(apiError.message);

      // An insufficient-balance or stock rejection leaves nothing charged, but
      // both the wallet and the cart may have moved on.
      await Promise.all([loadWallet(), refreshCart()]);
    } finally {
      setIsPlacingOrder(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start"
    >
      <div className="space-y-6">
        <section
          aria-labelledby="shipping-heading"
          className="rounded-xl border border-slate-200 bg-white p-5"
        >
          <h2 id="shipping-heading" className="text-base font-semibold text-slate-900">
            Delivery details
          </h2>
          <p className="mt-1 text-sm text-slate-500">Where should this order go?</p>

          <div className="mt-5 space-y-4">
            <InputField
              label="Street address"
              autoComplete="street-address"
              placeholder="12 Balogun Street"
              error={errors.shippingAddress?.message}
              {...register('shippingAddress')}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="City"
                autoComplete="address-level2"
                placeholder="Lagos"
                error={errors.shippingCity?.message}
                {...register('shippingCity')}
              />
              <InputField
                label="State or region"
                autoComplete="address-level1"
                placeholder="Lagos State"
                error={errors.shippingState?.message}
                {...register('shippingState')}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Postal / ZIP code"
                autoComplete="postal-code"
                placeholder="100001"
                error={errors.shippingZipCode?.message}
                {...register('shippingZipCode')}
              />
              <InputField
                label="Country"
                autoComplete="country-name"
                placeholder="Nigeria"
                error={errors.shippingCountry?.message}
                {...register('shippingCountry')}
              />
            </div>

            <InputField
              label="Phone number"
              type="tel"
              autoComplete="tel"
              placeholder="+2348012345678"
              hint="Used by the courier to reach you on delivery."
              error={errors.phoneNumber?.message}
              {...register('phoneNumber')}
            />

            <TextareaField
              label="Delivery notes"
              optional
              placeholder="Gate code, landmark, preferred drop-off time..."
              error={errors.notes?.message}
              {...register('notes')}
            />
          </div>
        </section>

        <WalletPaymentPanel
          balance={balance}
          amountDue={totals.total}
          isLoading={isWalletLoading}
          onFunded={loadWallet}
        />
      </div>

      <div className="space-y-4 lg:sticky lg:top-24">
        <section
          aria-labelledby="items-heading"
          className="rounded-xl border border-slate-200 bg-white p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="items-heading" className="text-base font-semibold text-slate-900">
              Items
            </h2>
            <Link
              href="/cart"
              className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline"
            >
              Edit
            </Link>
          </div>

          <ul className="mt-4 space-y-3">
            {cart.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  <ProductImage
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-slate-500">Qty {item.quantity}</p>
                </div>
                <p className="shrink-0 text-sm font-medium text-slate-900">
                  {formatPrice(toNumber(item.product.price) * item.quantity)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <OrderSummary subtotal={subtotal} itemCount={cart.itemCount} title="Total due">
          <div className="space-y-3">
            {submitError && <FormError message={submitError} />}

            <Button
              type="submit"
              size="lg"
              fullWidth
              isLoading={busy}
              disabled={!canAfford || isWalletLoading}
            >
              {busy
                ? 'Processing payment...'
                : canAfford
                  ? `Pay ${formatPrice(totals.total)}`
                  : 'Top up your wallet to pay'}
            </Button>

            <p className="text-center text-xs leading-relaxed text-slate-400">
              Paying debits your wallet, reserves the stock and creates the order in one
              transaction. Nothing is charged if any part fails.
            </p>
          </div>
        </OrderSummary>
      </div>
    </form>
  );
}

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight text-slate-900">
        Checkout
      </h1>
      <Suspense fallback={<LoadingBlock />}>
        <RequireAuth>
          <CheckoutFlow />
        </RequireAuth>
      </Suspense>
    </div>
  );
}
