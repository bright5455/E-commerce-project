import { FlatCompat } from '@eslint/eslintrc';

// This app lives inside the NestJS backend's repo, which has its own strict
// eslint.config.mjs (typescript-eslint recommendedTypeChecked + prettier as an
// error) at the repo root. ESLint's flat config resolves upward through parent
// directories, so without a config here this app would inherit backend rules
// that were never meant to apply to Next.js/React code. This file scopes
// linting to Next's own rules instead.
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
];
