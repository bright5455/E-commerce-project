'use client';

import { useState } from 'react';
import { cn } from '@/lib/format';

interface ProductImageProps {
  src: string | null;
  alt: string;
  className?: string;
  /** Product images above the fold should not be lazy. */
  priority?: boolean;
}

function Placeholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center bg-slate-100 text-slate-300',
        className,
      )}
      aria-hidden="true"
    >
      <svg
        className="h-10 w-10"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M18 10.5h.008v.008H18V10.5zM2.25 19.5V4.5a2.25 2.25 0 012.25-2.25h15a2.25 2.25 0 012.25 2.25v15a2.25 2.25 0 01-2.25 2.25h-15A2.25 2.25 0 012.25 19.5z"
        />
      </svg>
    </div>
  );
}

export function ProductImage({ src, alt, className, priority = false }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <Placeholder className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- see next.config.ts
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
