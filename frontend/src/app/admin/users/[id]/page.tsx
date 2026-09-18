'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { RequireAuth } from '@/components/providers/RequireAuth';
import { ProductImage } from '@/components/products/ProductImage';
import { OrderStatusBadge, PaymentBadge } from '@/components/ui/Badge';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { getUserCart } from '@/lib/api/cart';
import { getAllOrders, type AdminOrder } from '@/lib/api/orders';
import { getUser } from '@/lib/api/users';
import { getErrorMessage } from '@/lib/errors';
import { formatDate, formatDateTime, formatPrice, orderReference } from '@/lib/format';
import type { CartResponse, Profile } from '@/lib/types';

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

const ROLE_LABELS: Record<string, string> = {
  user: 'Shopper',
  moderator: 'Moderator',
  admin: 'Admin',
  super_admin: 'Super admin',
};

function AdminOnly() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Admins only</h1>
      <p className="mt-2 text-sm text-slate-500">
        You need an admin or super admin account to view user details.
      </p>
      <Link
        href="/products"
        className="mt-6 inline-block text-sm font-medium text-slate-900 underline underline-offset-4"
      >
        Back to shop
      </Link>
    </div>
  );
}

function UserDetail({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getUser(userId)
      .then((data) => !cancelled && setProfile(data))
      .catch((err) => !cancelled && setError(getErrorMessage(err)));

    getUserCart(userId)
      .then((data) => !cancelled && setCart(data))
      .catch(() => {});

    getAllOrders({ userId, limit: 20 })
      .then((response) => !cancelled && setOrders(response.data))
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (error) return <ErrorState message={error} />;
  if (!profile) return <LoadingBlock label="Loading user" />;

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {profile.firstName} {profile.lastName}
          </h1>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
            {ROLE_LABELS[profile.role] ?? profile.role}
          </span>
          {!profile.isActive && (
            <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
              Deactivated
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500">{profile.email}</p>
        <p className="mt-1 text-xs text-slate-400">Joined {formatDate(profile.createdAt)}</p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight text-slate-900">
          Cart {cart && cart.items.length > 0 && `(${cart.itemCount} item${cart.itemCount === 1 ? '' : 's'})`}
        </h2>
        {!cart ? (
          <LoadingBlock label="Loading cart" />
        ) : cart.items.length === 0 ? (
          <EmptyState title="Cart is empty" description="Nothing currently sitting in this shopper's cart." />
        ) : (
          <div className="space-y-2">
            <ul className="space-y-2">
              {cart.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-50">
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
                    <p className="text-xs text-slate-500">
                      Qty {item.quantity} &middot; {formatPrice(item.product.price)} each
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-slate-900">
                    {formatPrice(Number(item.product.price) * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>
            <p className="text-right text-sm font-medium text-slate-500">
              Cart total: {formatPrice(cart.total)}
            </p>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight text-slate-900">Orders</h2>
        {!orders ? (
          <LoadingBlock label="Loading orders" />
        ) : orders.length === 0 ? (
          <EmptyState title="No orders yet" description="This user hasn't placed an order." />
        ) : (
          <ul className="space-y-2">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-slate-900">
                        {orderReference(order.id)}
                      </span>
                      <OrderStatusBadge status={order.status} />
                      <PaymentBadge isPaid={order.isPaid} />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatPrice(order.total)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function AdminUserDetailGate() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();

  return (
    <RequireAuth>
      {user && ADMIN_ROLES.has(user.role) ? (
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <Link
            href="/admin/users"
            className="mb-6 inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            &larr; Back to all users
          </Link>
          <UserDetail userId={params.id} />
        </div>
      ) : (
        <AdminOnly />
      )}
    </RequireAuth>
  );
}

export default function AdminUserDetailPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <AdminUserDetailGate />
    </Suspense>
  );
}
