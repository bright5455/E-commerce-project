import { cn } from '@/lib/format';
import type { OrderStatus } from '@/lib/types';

const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  processing: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  shipped: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        ORDER_STATUS_STYLES[status] ?? ORDER_STATUS_STYLES.pending,
      )}
    >
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  );
}

interface StockBadgeProps {
  stock: number;
  isActive?: boolean;
  /** Below this, we nudge with "only N left". */
  lowStockThreshold?: number;
}

export function StockBadge({
  stock,
  isActive = true,
  lowStockThreshold = 10,
}: StockBadgeProps) {
  if (!isActive) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20">
        Unavailable
      </span>
    );
  }

  if (stock <= 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
        Out of stock
      </span>
    );
  }

  if (stock <= lowStockThreshold) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
        Only {stock} left
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
      In stock
    </span>
  );
}
