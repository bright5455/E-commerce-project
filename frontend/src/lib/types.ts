/**
 * Types mirrored from the NestJS backend entities and DTOs.
 * Source of truth: src/<module>/entity/*.entity.ts and src/<module>/dto/*.dto.ts
 */

export type UserRole = 'user' | 'super_admin' | 'admin' | 'moderator';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

/** GET /profile - full profile, password fields stripped by the backend serializer. */
export interface Profile extends AuthUser {
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

/** POST /auth/user/login */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/** The backend returns this instead of tokens when an admin has 2FA enabled. */
export interface TwoFactorRequiredResponse {
  requiresTwoFactor: true;
  message: string;
}

export interface RegisterResponse {
  message: string;
  userId: string;
}

export interface MessageResponse {
  message: string;
}

export interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  user?: Pick<AuthUser, 'id' | 'firstName' | 'lastName'>;
}

/** products table. price arrives as a string because Postgres returns decimals as text. */
export interface Product {
  id: string;
  name: string;
  description: string;
  price: string | number;
  stock: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  reviews?: Review[];
}

/** GET /products */
export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** GET /products/search?q= */
export interface ProductSearchResponse {
  results: Product[];
  count: number;
}

export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  order?: 'ASC' | 'DESC';
}

/** cart table row, with the joined product. */
export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: Product;
  createdAt: string;
  updatedAt: string;
}

/** GET /cart */
export interface CartResponse {
  items: CartItem[];
  itemCount: number;
  total: string;
}

/** POST /cart/validate */
export interface CartValidationResponse {
  isValid: boolean;
  errors: string[];
}

export type OrderStatus =
  'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'completed';

export type PaymentMethod = 'wallet' | 'card' | 'bank_transfer';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  price: string | number;
  quantity: number;
  total: string | number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  subtotal: string | number;
  tax: string | number;
  shippingFee: string | number;
  total: string | number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  isPaid: boolean;
  paidAt: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingZipCode: string | null;
  shippingCountry: string | null;
  phoneNumber: string | null;
  trackingNumber: string | null;
  cancellationReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET /orders/my-orders */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * POST /orders/checkout - must match CheckoutDto exactly. The backend runs
 * ValidationPipe with forbidNonWhitelisted, so any extra key is a 400.
 */
export interface CheckoutPayload {
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingZipCode: string;
  shippingCountry: string;
  phoneNumber: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

/** GET /wallet - WalletService.getBalance returns this, not the Wallet entity. */
export interface WalletBalance {
  walletId: string;
  /** Fixed-2 decimal string, e.g. '250.00'. */
  balance: string;
}

export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'payment'
  | 'refund'
  | 'transfer_in'
  | 'transfer_out'
  | 'commission'
  | 'bonus'
  | 'penalty';

/** One row of GET /wallet/transactions. The service projects the entity down to this. */
export interface WalletTransactionSummary {
  id: string;
  amount: string;
  type: TransactionType;
  description: string;
  date: string;
}

export interface WalletTransactionHistory {
  page: number;
  limit: number;
  total: number;
  transactions: WalletTransactionSummary[];
}

export interface WalletDepositResponse {
  message: string;
  newBalance: string;
  transaction: { id: string; amount: number; type: TransactionType; description: string };
}
