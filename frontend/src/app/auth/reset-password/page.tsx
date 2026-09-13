'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/Field';
import { FormError } from '@/components/ui/States';
import { useToast } from '@/components/providers/ToastProvider';
import { resetPassword } from '@/lib/api/auth';
import { getErrorMessage } from '@/lib/errors';

/**
 * Route is /auth/reset-password to match the link MailService sends:
 * `${FRONTEND_URL}/auth/reset-password?token=...` (mail.service.ts:192).
 */

const PASSWORD_RULE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const schema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        PASSWORD_RULE,
        'Use upper and lower case letters, a number and a special character (@$!%*?&)',
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const token = searchParams.get('token');
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(values: FormValues) {
    if (!token) return;
    setFormError(null);
    try {
      await resetPassword(token, values.newPassword);
      toast.success('Password updated. Sign in with your new password.');
      router.replace('/login');
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  }

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          This reset link is incomplete
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Use the exact link from your email, or request a new one.
        </p>
        <Link
          href="/auth/forgot-password"
          className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-lg bg-slate-900 px-6 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Choose a new password
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Reset links expire one hour after they are requested.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError && <FormError message={formError} />}

        <InputField
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="Needs upper and lower case, a number and one of @$!%*?&"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />

        <InputField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" isLoading={isSubmitting} fullWidth size="lg">
          {isSubmitting ? 'Updating...' : 'Update password'}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="py-24" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
