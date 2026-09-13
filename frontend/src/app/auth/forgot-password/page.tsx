'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/Field';
import { FormError } from '@/components/ui/States';
import { requestPasswordReset } from '@/lib/api/auth';
import { getErrorMessage } from '@/lib/errors';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      await requestPasswordReset(values.email);
      // The endpoint answers identically whether or not the account exists, so
      // we must not imply either way.
      setSent(true);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  }

  if (sent) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Check your email
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          If that address has an account, a password reset link is on its way. The link
          expires in one hour.
        </p>
        <Link
          href="/login"
          className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-6 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Reset your password
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Enter your email and we will send you a reset link.
        </p>
      </div>

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
        <Button type="submit" isLoading={isSubmitting} fullWidth size="lg">
          {isSubmitting ? 'Sending...' : 'Send reset link'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link
          href="/login"
          className="font-medium text-slate-900 underline underline-offset-4"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
