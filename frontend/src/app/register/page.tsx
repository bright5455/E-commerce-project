'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/Field';
import { FormError } from '@/components/ui/States';
import { useToast } from '@/components/providers/ToastProvider';
import { register as registerUser } from '@/lib/api/auth';
import { toApiError } from '@/lib/errors';
import { registerSchema, type RegisterFormValues } from '@/lib/validation';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);

  const redirectTo = searchParams.get('redirect') ?? '/products';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    setFormError(null);
    try {
      await registerUser({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        phoneNumber: values.phoneNumber || undefined,
      });

      toast.success('Account created. Check your email to verify it.');
      setCreatedEmail(values.email);
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.status === 409) {
        setFormError('An account with that email already exists. Try signing in instead.');
        return;
      }

      setFormError(apiError.message);
    }
  }

  // The backend will not issue tokens until the address is verified, so there is
  // nothing useful to auto-login into. Say so plainly instead.
  if (createdEmail) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16 text-center sm:px-6">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Verify your email
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          We sent a verification link to{' '}
          <strong className="text-slate-900">{createdEmail}</strong>. Open it to activate
          your account, then come back and sign in.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          Sign-in is blocked until the address is verified.
        </p>
        <Button
          className="mt-6"
          fullWidth
          size="lg"
          onClick={() =>
            router.push(`/login?registered=1&redirect=${encodeURIComponent(redirectTo)}`)
          }
        >
          Continue to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Already registered?{' '}
          <Link
            href={`/login?redirect=${encodeURIComponent(redirectTo)}`}
            className="font-medium text-slate-900 underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError && <FormError message={formError} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            label="First name"
            autoComplete="given-name"
            placeholder="Ada"
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <InputField
            label="Last name"
            autoComplete="family-name"
            placeholder="Lovelace"
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>

        <InputField
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <InputField
          label="Phone number"
          type="tel"
          autoComplete="tel"
          optional
          placeholder="+2348012345678"
          error={errors.phoneNumber?.message}
          {...register('phoneNumber')}
        />

        <InputField
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          hint="Needs upper and lower case, a number and one of @$!%*?&"
          error={errors.password?.message}
          {...register('password')}
        />

        <InputField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" isLoading={isSubmitting} fullWidth size="lg">
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="py-24" />}>
      <RegisterForm />
    </Suspense>
  );
}
