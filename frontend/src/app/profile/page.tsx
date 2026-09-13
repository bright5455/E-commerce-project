'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RequireAuth } from '@/components/providers/RequireAuth';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/Field';
import { LoadingBlock } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/States';
import { getProfile, updateProfile } from '@/lib/api/profile';
import { getErrorMessage } from '@/lib/errors';
import { formatDate, initialsOf } from '@/lib/format';
import { saveUser } from '@/lib/session';
import { profileSchema, type ProfileFormValues } from '@/lib/validation';
import type { Profile } from '@/lib/types';

function ProfileView() {
  const toast = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: '', lastName: '' },
  });

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getProfile();
      setProfile(data);
      reset({ firstName: data.firstName, lastName: data.lastName });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(values: ProfileFormValues) {
    try {
      const updated = await updateProfile(values);
      setProfile(updated);
      // Keep the header's greeting and initials in step with the new name.
      saveUser({
        id: updated.id,
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
        role: updated.role,
      });
      setIsEditing(false);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (isLoading) return <LoadingBlock label="Loading your profile" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!profile) return null;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center gap-5 rounded-xl border border-slate-200 bg-white p-6">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt=""
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-xl font-semibold text-white">
            {initialsOf(profile.firstName, profile.lastName)}
          </span>
        )}

        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold text-slate-900">
            {profile.firstName} {profile.lastName}
          </h2>
          <p className="truncate text-sm text-slate-500">{profile.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {profile.isEmailVerified ? (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                Email verified
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                Email not verified
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">
              {profile.role.replace('_', ' ')}
            </span>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="details-heading"
        className="rounded-xl border border-slate-200 bg-white p-6"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="details-heading" className="text-base font-semibold text-slate-900">
            Account details
          </h2>
          {!isEditing && (
            <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="First name"
                autoComplete="given-name"
                error={errors.firstName?.message}
                {...register('firstName')}
              />
              <InputField
                label="Last name"
                autoComplete="family-name"
                error={errors.lastName?.message}
                {...register('lastName')}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" isLoading={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save changes'}
              </Button>
              <Button
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => {
                  reset({ firstName: profile.firstName, lastName: profile.lastName });
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">First name</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-900">
                {profile.firstName}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Last name</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-900">
                {profile.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Email</dt>
              <dd className="mt-0.5 break-all text-sm font-medium text-slate-900">
                {profile.email}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Member since</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-900">
                {formatDate(profile.createdAt)}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/orders"
          className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
        >
          <h3 className="text-sm font-semibold text-slate-900">Your orders</h3>
          <p className="mt-1 text-sm text-slate-500">
            Track status, review items and cancel if you need to.
          </p>
        </Link>
        <Link
          href="/wallet"
          className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
        >
          <h3 className="text-sm font-semibold text-slate-900">Wallet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Check your balance, top up and see every transaction.
          </p>
        </Link>
      </section>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight text-slate-900">Profile</h1>
      <Suspense fallback={<LoadingBlock />}>
        <RequireAuth>
          <ProfileView />
        </RequireAuth>
      </Suspense>
    </div>
  );
}
