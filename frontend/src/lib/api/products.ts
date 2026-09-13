import { API_URL } from './client';
import { ApiError } from '../errors';
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
