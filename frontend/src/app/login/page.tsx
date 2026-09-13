'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/Field';
import { FormError } from '@/components/ui/States';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { toApiError } from '@/lib/errors';
import { loginSchema, type LoginFormValues } from '@/lib/validation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const redirectTo = searchParams.get('redirect') ?? '/products';
  const justRegistered = searchParams.get('registered') === '1';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);
    try {
      const user = await login(values.email, values.password);
      toast.success(`Welcome back, ${user.firstName}`);
      // replace, not push: the login page should not sit in the back stack.
      router.replace(redirectTo);
    } catch (error) {
      const apiError = toApiError(error);

      // The backend rejects unverified accounts with a 401 carrying this exact
      // message - worth spelling out, since it is not a credentials problem.
      if (apiError.message.toLowerCase().includes('verify your email')) {
        setFormError(
          'Your email address has not been verified yet. Open the verification link we emailed you, then sign in again.',
        );
        return;
      }

      setFormError(apiError.message);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Sign in to your account
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          New here?{' '}
          <Link
            href={`/register?redirect=${encodeURIComponent(redirectTo)}`}
            className="font-medium text-slate-900 underline underline-offset-4"
          >
            Create an account
          </Link>
        </p>
      </div>

      {justRegistered && (
        <div
          role="status"
          className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
        >
          Account created. Verify your email address, then sign in below.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError && <FormError message={formError} />}

        <InputField
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <div>
          <InputField
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            error={errors.password?.message}
            {...register('password')}
          />
          <div className="mt-1.5 text-right">
            <Link
              href="/auth/forgot-password"
              className="text-xs font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        <Button type="submit" isLoading={isSubmitting} fullWidth size="lg">
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
        Your session is stored in this browser and sent to the API as a bearer token. Sign
        out when you are finished on a shared device.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-24" />}>
      <LoginForm />
    </Suspense>
  );
}
