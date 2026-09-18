import axios from 'axios';
import { api, API_URL } from './client';
import { ApiError } from '../errors';
import { getAccessToken } from '../session';
import type {
  Product,
  ProductListResponse,
  ProductQuery,
  ProductSearchResponse,
} from '../types';

/**
 * Product endpoints are public, so these use fetch rather than the authed axios
 * instance. That lets the catalogue render in Server Components.
 *
 * Stock and prices change, so nothing here is cached.
 */

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, { cache: 'no-store', ...init });
  } catch {
    throw new ApiError(
      'Cannot reach the server. Check your connection and make sure the API is running.',
      0,
    );
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const raw = (body as { message?: string | string[] } | null)?.message;
    const message = Array.isArray(raw) ? raw[0] : raw;
    throw new ApiError(
      message ?? 'We could not load this right now. Please try again.',
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

function buildQuery(query: ProductQuery): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** GET /products */
export function listProducts(query: ProductQuery = {}) {
  return getJson<ProductListResponse>(`/products${buildQuery(query)}`);
}

/** GET /products/:id */
export function getProduct(id: string) {
  return getJson<Product>(`/products/${id}`);
}

/** GET /products/search?q= - the backend 400s on an empty query. */
export function searchProducts(q: string) {
  const trimmed = q.trim();
  if (!trimmed) {
    return Promise.resolve<ProductSearchResponse>({ results: [], count: 0 });
  }
  return getJson<ProductSearchResponse>(
    `/products/search?q=${encodeURIComponent(trimmed)}`,
  );
}

/** GET /products/top-selling - returns a bare array, not a wrapper object. */
export function getTopSelling(limit = 8) {
  return getJson<Product[]>(`/products/top-selling?limit=${limit}`);
}

export interface CreateProductPayload {
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string;
}

/** POST /products - admin/super_admin only, guarded by JwtAuthGuard + RolesGuard. */
export async function createProduct(payload: CreateProductPayload) {
  const { data } = await api.post<{ message: string; product: Product }>(
    '/products',
    payload,
  );
  return data;
}

/** DELETE /products/:id - admin/super_admin only. */
export async function deleteProduct(id: string) {
  const { data } = await api.delete<{ message: string }>(`/products/${id}`);
  return data;
}

export interface UpdateProductPayload {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  imageUrl?: string;
}

/** PATCH /products/:id - admin/super_admin only. */
export async function updateProduct(id: string, payload: UpdateProductPayload) {
  const { data } = await api.patch<{ message: string; product: Product }>(
    `/products/${id}`,
    payload,
  );
  return data;
}

export interface LowStockResponse {
  products: Product[];
  count: number;
  threshold: number;
}

/** GET /products/admin/low-stock - admin/super_admin only. */
export async function getLowStockProducts(threshold = 10) {
  const { data } = await api.get<LowStockResponse>('/products/admin/low-stock', {
    params: { threshold },
  });
  return data;
}

/**
 * POST /products/upload-image - admin/super_admin only.
 *
 * Bare axios on purpose, like the token refresh call in client.ts: the shared
 * `api` instance always sends `Content-Type: application/json`, which - once
 * already present - stops the browser from attaching the multipart boundary
 * a FormData upload needs. Skipping the instance avoids that.
 */
export async function uploadProductImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await axios.post<{ imageUrl: string }>(
    `${API_URL}/products/upload-image`,
    formData,
    { headers: { Authorization: `Bearer ${getAccessToken()}` } },
  );
  return data;
}
