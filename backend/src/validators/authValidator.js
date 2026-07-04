const { z } = require('zod');

/**
 * Signup Validation Schema using Zod
 * Enforces strong passwords, verified emails, and 10-digit Indian phone numbers.
 * Provides on-the-fly sanitization (trimming, lowercasing).
 */
const signupSchema = z.object({
  name: z
    .string({ required_error: 'Name is required.' })
    .trim()
    .min(2, 'Name must be at least 2 characters long.')
    .max(50, 'Name cannot exceed 50 characters.'),
  
  email: z
    .string({ required_error: 'Email is required.' })
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address.'),
  
  password: z
    .string({ required_error: 'Password is required.' })
    .min(8, 'Password must be at least 8 characters long.')
    .refine((val) => /[A-Z]/.test(val), 'Password must contain at least one uppercase letter.')
    .refine((val) => /[0-9]/.test(val), 'Password must contain at least one digit.'),
  
  phone: z
    .string({ required_error: 'Phone number is required.' })
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Phone number must be a valid 10-digit Indian mobile number.')
});

/**
 * Login Validation Schema using Zod
 */
const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required.' })
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address.'),
  
  password: z
    .string({ required_error: 'Password is required.' })
    .min(1, 'Password cannot be empty.')
});

/**
 * Validation schema for promoting/demoting user roles (SuperAdmin only).
 * Deliberately EXCLUDE 'super_admin' from this enum. A super_admin must never
 * be created, promoted, or demoted via an API call; it must only ever be
 * created via the seed script to guarantee infrastructure level isolation.
 */
const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'customer'], {
    invalid_type_error: 'Role must be either admin or customer.'
  })
});

module.exports = {
  signupSchema,
  loginSchema,
  updateUserRoleSchema
};
