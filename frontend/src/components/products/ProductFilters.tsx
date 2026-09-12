'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';

/**
 * Filters are driven entirely by the URL so the catalogue stays a Server
 * Component, results are shareable and the back button behaves.
 * Query keys match ProductController.findAll exactly.
 */

const SORT_OPTIONS = [
  { value: 'createdAt:DESC', label: 'Newest first' },
  { value: 'price:ASC', label: 'Price: low to high' },
  { value: 'price:DESC', label: 'Price: high to low' },
  { value: 'name:ASC', label: 'Name: A to Z' },
];

export function ProductFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') ?? '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') ?? '');

  const sortValue = `${searchParams.get('sortBy') ?? 'createdAt'}:${
    searchParams.get('order') ?? 'DESC'
  }`;

  function pushWith(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    // Any filter change invalidates the current page number.
    params.delete('page');
    const qs = params.toString();
    router.push(qs ? `/products?${qs}` : '/products');
  }

  function handlePriceSubmit(event: FormEvent) {
    event.preventDefault();
    pushWith({ minPrice: minPrice || null, maxPrice: maxPrice || null });
  }

  const hasFilters =
    searchParams.has('minPrice') ||
    searchParams.has('maxPrice') ||
    searchParams.has('search');

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
      <form onSubmit={handlePriceSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="minPrice" className="block text-xs font-medium text-slate-600">
            Min price
          </label>
          <input
            id="minPrice"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
            placeholder="0"
            className="mt-1 h-10 w-28 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>
        <div>
          <label htmlFor="maxPrice" className="block text-xs font-medium text-slate-600">
            Max price
          </label>
          <input
            id="maxPrice"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            placeholder="Any"
            className="mt-1 h-10 w-28 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Apply
        </Button>
        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setMinPrice('');
              setMaxPrice('');
              router.push('/products');
            }}
          >
            Clear
          </Button>
        )}
      </form>

      <div>
        <label htmlFor="sort" className="block text-xs font-medium text-slate-600">
          Sort by
        </label>
        <select
          id="sort"
          value={sortValue}
          onChange={(event) => {
            const [sortBy, order] = event.target.value.split(':');
            pushWith({ sortBy, order });
          }}
          className="mt-1 h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
