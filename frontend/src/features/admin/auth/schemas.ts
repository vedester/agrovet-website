

// Directory: frontend/src/features/admin/auth/schemas.ts

import { z } from "zod";

/**
 * Validation rules for administrator sign-in.
 *
 * Email is trimmed before validation.
 * Password is deliberately not trimmed because whitespace
 * may legitimately be part of a password.
 */
export const adminLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .email("Enter a valid email address.")
    .max(254, "Email address is too long."),

  password: z
    .string()
    .min(1, "Enter your password.")
    .max(128, "Password is too long."),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
