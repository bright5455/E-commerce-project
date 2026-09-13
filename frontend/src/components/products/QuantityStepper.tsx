'use client';

import { cn } from '@/lib/format';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  disabled?: boolean;
  /** Labels the control for screen readers, e.g. the product name. */
  label: string;
  size?: 'sm' | 'md';
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  disabled = false,
  label,
  size = 'md',
}: QuantityStepperProps) {
  const clamp = (next: number) => Math.min(Math.max(next, min), Math.max(max, min));

  const buttonSize = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const inputSize = size === 'sm' ? 'h-8 w-10 text-sm' : 'h-10 w-14';

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border border-slate-300 bg-white',
        disabled && 'opacity-60',
      )}
    >
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || value <= min}
        aria-label={`Decrease quantity of ${label}`}
        className={cn(
          buttonSize,
          'flex items-center justify-center rounded-l-lg text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-slate-900',
        )}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" d="M5 12h14" />
        </svg>
      </button>

      <input
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        aria-label={`Quantity of ${label}`}
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value, 10);
          if (!Number.isNaN(parsed)) onChange(clamp(parsed));
        }}
        // Typing can leave the box empty mid-edit; snap back on blur.
        onBlur={(event) => {
          if (event.target.value === '') onChange(min);
        }}
        className={cn(
          inputSize,
          'border-x border-slate-300 text-center font-medium text-slate-900 [appearance:textfield] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-900/10 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
        )}
      />

      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled || value >= max}
        aria-label={`Increase quantity of ${label}`}
        className={cn(
          buttonSize,
          'flex items-center justify-center rounded-r-lg text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-slate-900',
        )}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}
