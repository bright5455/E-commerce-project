import type { NextConfig } from 'next';

/**
 * No `images` config on purpose.
 *
 * Product image URLs are free-form strings written by admins (Cloudinary URLs
 * today, anything tomorrow), so gating them on next/image's host allowlist would
 * silently break the catalogue whenever someone pastes a new host. The catalogue
 * uses plain <img> with a lazy-loaded fallback instead - see ProductImage.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // This app lives inside the NestJS backend's repo, which has its own
  // package-lock.json at the root. Without this, Next.js's workspace-root
  // detection picks that directory instead of this one.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
