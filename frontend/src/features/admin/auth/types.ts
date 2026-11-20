
// Directory: frontend/src/features/admin/auth/types.ts

/**
 * Public profile information for an authenticated administrator.
 *
 * These fields correspond to the response from Django's /auth/me/ endpoint.
 * JWT values are deliberately excluded.
 */
export type AdminUser = {
  id: string | number;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
};

/**
 * Successful response from POST /api/admin/auth/session.
 */
export type AdminSessionResponse = {
  authenticated: true;
  user: AdminUser;
};

/**
 * Standard error response from the admin authentication routes.
 */
export type AdminAuthErrorResponse = {
  error: string;
};

/**
 * Response from the login endpoint.
 */
export type AdminLoginResponse = {
  user: AdminUser;
};
