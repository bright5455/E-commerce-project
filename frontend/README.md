# Northwind Storefront

A Next.js (App Router) frontend for the NestJS + PostgreSQL + TypeORM
e-commerce API in the parent directory. Every screen talks to the real backend
— nothing here is mocked.

Browse products → product details → add to cart → cart → checkout → wallet
payment → order confirmation → order history, plus authentication and a
profile page, all built against the API's actual endpoints and DTOs.

## What was found in the backend, and what changed

Before writing any UI, the backend was read end to end (controllers, services,
DTOs, entities). Two real gaps were found and fixed with the smallest possible
change — see the code comments at each site for details:

1. **`POST /orders/checkout` was a stub.** It priced two hardcoded fake
   products (`product-1`, `product-2` at fixed prices) instead of reading the
   caller's actual cart, and never touched stock or emptied the cart. Fixed in
   [`src/order/order.service.ts`](../src/order/order.service.ts): `checkout()`
   now reads the real cart, snapshots each product's real name/image/price,
   decrements stock, records a wallet transaction, empties the cart, and does
   all of it inside the existing DB transaction. `create()` (the non-checkout
   order endpoint) had the same stub and was fixed the same way.
   [`src/order/order.module.ts`](../src/order/order.module.ts) now also
   registers the `Cart` and `Product` repositories the service needs.
2. **No payment gateway exists in this backend.** There is no Paystack,
   Stripe, or any other integration anywhere in the codebase — grep confirms
   it. Payment is a wallet balance: `POST /wallet/deposit` credits it directly
   and `POST /orders/checkout` debits it. The checkout page here reflects that
   real design rather than inventing a gateway integration the backend doesn't
   have. See **How payment works** below.

Nothing else in the backend was changed. No new endpoints, no new DTO fields,
no schema changes.

### Known backend gap not fixed here

The committed migration (`src/migrations/1764956662974-InitialMigration.ts`)
is a diff generated against a database that already had its schema applied
via `synchronize: true` — running it against a genuinely empty database fails
immediately (`relation "transactions" does not exist`) because its `up()`
starts by altering tables it never created. This was pre-existing and outside
the scope of the frontend work asked for, so it wasn't touched. To stand up a
fresh database today, temporarily set `synchronize: true` in
`src/app.module.ts`, start the backend once so TypeORM creates the schema,
then set it back to `false`. A proper fix is to regenerate the migration
against an empty database.

## Tech stack

- Next.js 15 (App Router), TypeScript, React 19
- Tailwind CSS 4
- axios for API calls, native `fetch` for the public product catalogue (so it
  can render in Server Components)
- React Hook Form + Zod for every form
- No state library, no UI kit — Context for auth/cart, plain Tailwind for UI

## Project structure

```
frontend/
├── src/
│   ├── app/                      Routes (App Router)
│   │   ├── page.tsx               Home
│   │   ├── products/              Catalogue + product detail
│   │   ├── login/, register/      Auth
│   │   ├── auth/verify-email/     Matches the link MailService emails
│   │   ├── auth/forgot-password/  \_ mail.service.ts builds these URLs;
│   │   ├── auth/reset-password/   /  routes here match exactly
│   │   ├── cart/                  Cart
│   │   ├── checkout/              Shipping form + wallet payment
│   │   ├── orders/                Order history, detail, confirmation
│   │   ├── wallet/                Balance, top-up, transaction history
│   │   └── profile/               Account details
│   ├── components/
│   │   ├── providers/              Auth, Cart, Toast contexts + route guard
│   │   ├── products/, cart/, checkout/, orders/, layout/
│   │   └── ui/                     Button, Field, Badge, States, etc.
│   └── lib/
│       ├── api/                    One file per backend module: auth, products,
│       │                           cart, orders, wallet, profile, plus client.ts
│       │                           (the shared axios instance)
│       ├── types.ts                Types mirroring the backend's entities/DTOs
│       ├── errors.ts               Turns any axios error into a shopper-facing message
│       ├── session.ts              Token storage (localStorage) + cross-tab sync
│       ├── validation.ts           Zod schemas mirroring the backend's class-validator rules
│       └── format.ts                Money/date formatting, decimal-string coercion
```

API calls never appear inside a component — everything goes through
`src/lib/api/*`.

## Environment variables

```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

Copy `.env.example` to `.env.local` and adjust if your backend runs elsewhere.
That's the only variable this app uses. It is intentionally the only
`NEXT_PUBLIC_*` value — there is nothing else to expose, since there is no
payment gateway key on the frontend side (there isn't one on the backend
side either).

## Running locally

From `frontend/`:

```bash
npm install
cp .env.example .env.local     # adjust NEXT_PUBLIC_API_URL if needed
npm run dev                    # http://localhost:3001
```

The backend must be running separately (from the repo root):

```bash
npm run start:dev              # http://localhost:3000, prefix /api/v1
```

The backend needs `FRONTEND_URL` in its own `.env` set to this app's URL
(`http://localhost:3001` in dev) so that the verification and password-reset
emails it sends link back here correctly.

The dev server runs on port 3001 (see the `dev`/`start` scripts in
`package.json`) so it doesn't collide with the backend's port 3000.

## How the frontend talks to the backend

- `src/lib/api/client.ts` creates one axios instance with `baseURL:
  NEXT_PUBLIC_API_URL`. A request interceptor attaches
  `Authorization: Bearer <token>` from `localStorage`. A response interceptor
  catches a single 401, calls `POST /auth/refresh` once (de-duplicated across
  concurrent requests), retries the original call, and clears the session if
  the refresh itself fails.
- The public catalogue (`/`, `/products`, `/products/[id]`) is fetched with
  plain `fetch` inside Server Components — no token needed, matches the
  backend leaving those routes unguarded.
- Every other page (`/cart`, `/checkout`, `/orders`, `/wallet`, `/profile`) is
  a Client Component wrapped in `<RequireAuth>`, which redirects to `/login`
  if there's no session — mirroring the `JwtAuthGuard` those routes sit behind
  on the server.
- Errors are normalized in `src/lib/errors.ts`: NestJS's `ValidationPipe`
  messages (both a single string and the array form) are surfaced directly
  since they're already written for humans; unhelpful or missing messages
  fall back to a generic, status-appropriate sentence. Network failures,
  401/403/404/409/429/5xx are all handled explicitly.

## How payment actually works here

This backend has no Paystack/Stripe/etc. integration — there's no gateway
key, no webhook, no `initialize`/`verify` pair anywhere in the code. Payment
is a wallet balance owned by each user:

- `GET /wallet` → current balance
- `POST /wallet/deposit` → credits the balance directly (this is what "adding
  funds" means in this demo — a real gateway would sit behind this call
  instead of crediting on request)
- `POST /orders/checkout` → reads the cart, prices it, and if the wallet
  balance covers the total, debits it, creates the order, decrements stock,
  and empties the cart — all in one DB transaction. If the balance is too
  low, nothing is charged and the response says exactly how much is missing.
- `PATCH /orders/:id/cancel` → refunds the order's total back to the wallet
  if it was paid.

The checkout page ([`src/app/checkout/page.tsx`](src/app/checkout/page.tsx))
shows the wallet balance against the order total, and offers one-click top-up
buttons when the balance is short — that's `WalletPaymentPanel`
([`src/components/checkout/WalletPaymentPanel.tsx`](src/components/checkout/WalletPaymentPanel.tsx)).
If you later add a real gateway to the backend, that component and
`src/lib/api/wallet.ts` are the two places to change — the rest of the
checkout flow (shipping form, order summary, submit handler) doesn't need to
know how the balance got funded.

## Testing the flows

Every step below hits the real backend — there's no seed script, so create
what you need through the API as you go (or through Swagger at
`http://localhost:3000/api/docs` while the backend runs in development).

**Register + sign in**
1. `/register` → fill the form → the backend emails a verification link
   (dev without SMTP set up: watch the backend's console log for mail-send
   failures, and instead fetch the token directly, e.g.
   `SELECT "emailVerificationToken" FROM users WHERE email = '...'`).
2. Visit `/auth/verify-email?token=<token>`, then `/login`.

**Products**: products are created by an admin
(`POST /products`, requires an `admin`/`super_admin` account — see
`POST /auth/admin/register-first` to bootstrap the first one) or inserted
directly for testing. Once at least one exists, `/products` and `/` will
show it.

**Cart**: open a product at `/products/[id]`, set a quantity, **Add to
cart**. The header's cart icon updates immediately. Go to `/cart` to change
quantities or remove items — both call the backend immediately and re-fetch,
so refreshing the page always shows the server's numbers.

**Checkout / payment**: go to `/checkout` from a non-empty cart. If your
wallet balance doesn't cover the total, use the **Add funds** buttons on the
payment panel (this calls `POST /wallet/deposit` for real) or top up from
`/wallet` directly. Submitting **Pay** calls `POST /cart/validate` first,
then `POST /orders/checkout`; a stock or balance problem is shown inline and
nothing is charged.

**Order confirmation / history**: a successful checkout redirects to
`/orders/[id]/confirmation`. `/orders` lists every order for the signed-in
user with a status filter; `/orders/[id]` shows the full breakdown and lets
you cancel a `pending`/`processing` order (refunds the wallet automatically).

**Profile**: `/profile` shows the account and lets you update your name
(`PATCH /profile`).

## Deployment

This is a standard Next.js app — deploy it anywhere Next.js runs (Vercel,
a Node server, a container).

1. Set `NEXT_PUBLIC_API_URL` in the hosting platform's environment settings
   to the backend's public URL, including its `/api/v1` prefix.
2. Point the backend's `ALLOWED_ORIGINS` (CORS) and `FRONTEND_URL` (email
   links) at this app's deployed URL.
3. Build and start:
   ```bash
   npm run build
   npm run start
   ```

Nothing here needs server-side secrets — every environment variable this app
reads is `NEXT_PUBLIC_*` by design, and the only one is the API URL.
