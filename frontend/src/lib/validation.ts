import { z } from 'zod';

/**
 * Client-side schemas kept deliberately in lockstep with the backend DTOs
 * (src/auth/dto/auth.dto.ts, src/order/dto/order.dto.ts). The server validates
 * again - this exists so shoppers see the problem before a round trip.
 */

// Mirrors RegisterUserDto's @Matches password rule exactly.
const PASSWORD_RULE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Mirrors RegisterUserDto's phone rule (E.164-ish).
const PHONE_RULE = /^\+?[1-9]\d{1,14}$/;

// Mirrors the name rule: letters, spaces, hyphens, apostrophes.
const NAME_RULE = /^[a-zA-Z\s'-]+$/;

const nameField = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label} must be at least 2 characters`)
    .max(50, `${label} must not exceed 50 characters`)
    .regex(NAME_RULE, `${label} can only contain letters, spaces, hyphens and apostrophes`);

export const registerSchema = z
  .object({
    firstName: nameField('First name'),
    lastName: nameField('Last name'),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Enter a valid email address'),
    phoneNumber: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || PHONE_RULE.test(value), {
        message: 'Enter a valid phone number, e.g. +2348012345678',
      }),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        PASSWORD_RULE,
        'Use upper and lower case letters, a number and a special character (@$!%*?&)',
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

/** Mirrors CheckoutDto: every shipping field is @IsNotEmpty on the server. */
export const checkoutSchema = z.object({
  shippingAddress: z.string().trim().min(5, 'Enter your street address'),
  shippingCity: z.string().trim().min(2, 'Enter your city'),
  shippingState: z.string().trim().min(2, 'Enter your state or region'),
  shippingZipCode: z.string().trim().min(3, 'Enter your postal or ZIP code'),
  shippingCountry: z.string().trim().min(2, 'Enter your country'),
  phoneNumber: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .regex(PHONE_RULE, 'Enter a valid phone number, e.g. +2348012345678'),
  notes: z.string().trim().max(500, 'Keep delivery notes under 500 characters').optional(),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

/** Mirrors AddFundsDto: @IsNumber + @Min(0.01). */
export const depositSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: 'Enter an amount' })
    .positive('Enter an amount greater than zero')
    .max(1_000_000, 'That amount is too large'),
});

export type DepositFormValues = z.infer<typeof depositSchema>;

export const profileSchema = z.object({
  firstName: nameField('First name'),
  lastName: nameField('Last name'),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

/** Mirrors CreateProductDto: name/description as strings, price/stock as @Min(0) numbers. */
export const createProductSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  description: z.string().trim().min(10, 'Description must be at least 10 characters'),
  price: z.coerce
    .number({ invalid_type_error: 'Enter a price' })
    .min(0, 'Price cannot be negative'),
  stock: z.coerce
    .number({ invalid_type_error: 'Enter a stock quantity' })
    .int('Stock must be a whole number')
    .min(0, 'Stock cannot be negative'),
  imageUrl: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^https?:\/\//.test(value), {
      message: 'Enter a valid image URL starting with http:// or https://',
    }),
});

export type CreateProductFormValues = z.infer<typeof createProductSchema>;
