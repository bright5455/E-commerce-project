import { formatPrice } from '@/lib/format';

/**
 * Mirrors OrderService.calculateTotals so the shopper sees the same arithmetic
 * the server will apply: 10% tax, and shipping waived above $500.
 *
 * The server recomputes all of this at checkout - what it returns on the order
 * is authoritative. This is a preview.
 */
export const TAX_RATE = 0.1;
export const FREE_SHIPPING_THRESHOLD = 500;
export const FLAT_SHIPPING_FEE = 50;

export function estimateTotals(subtotal: number) {
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const shippingFee = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;
  return {
    subtotal,
    tax,
    shippingFee,
    total: Math.round((subtotal + tax + shippingFee) * 100) / 100,
  };
}

interface OrderSummaryProps {
  subtotal: number;
  itemCount: number;
  /** Rendered under the totals, e.g. the checkout button or wallet state. */
  children?: React.ReactNode;
  title?: string;
}

export function OrderSummary({
  subtotal,
  itemCount,
  children,
  title = 'Order summary',
}: OrderSummaryProps) {
  const totals = estimateTotals(subtotal);
  const amountToFreeShipping = FREE_SHIPPING_THRESHOLD - subtotal;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>

      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">
            Subtotal ({itemCount} item{itemCount === 1 ? '' : 's'})
          </dt>
          <dd className="font-medium text-slate-900">{formatPrice(totals.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Tax (10%)</dt>
          <dd className="font-medium text-slate-900">{formatPrice(totals.tax)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Shipping</dt>
          <dd className="font-medium text-slate-900">
            {totals.shippingFee === 0 ? 'Free' : formatPrice(totals.shippingFee)}
          </dd>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-3">
          <dt className="text-base font-semibold text-slate-900">Total</dt>
          <dd className="text-base font-semibold text-slate-900">
            {formatPrice(totals.total)}
          </dd>
        </div>
      </dl>

      {totals.shippingFee > 0 && amountToFreeShipping > 0 && (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Spend {formatPrice(amountToFreeShipping)} more to get free shipping.
        </p>
      )}

      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
