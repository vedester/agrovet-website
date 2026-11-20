import "server-only";

import { cookies } from "next/headers";

import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
  getAdminAccessCookieOptions,
  getAdminRefreshCookieOptions,
  getExpiredAdminCookieOptions,
} from "@/lib/api/admin-cookies";
import { getAdminUser, refreshAdminTokens } from "@/lib/api/admin-auth";
import { ApiError } from "@/lib/api/errors";

function isAuthenticationFailure(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.kind === "http" &&
    [400, 401, 403].includes(error.status ?? 0)
  );
}

export async function withAdminAccessToken<T>(
  path: string,
  operation: (accessToken: string) => Promise<T>,
): Promise<T> {
  const cookieStore = await cookies();

  const accessToken = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(ADMIN_REFRESH_COOKIE)?.value;

  if (!accessToken) {
    throw new ApiError("http", path, "Your admin session has expired.", {
      status: 401,
    });
  }

  try {
    return await operation(accessToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !refreshToken) {
      throw error;
    }
  }

  let tokens;

  try {
    tokens = await refreshAdminTokens(refreshToken);

    const user = await getAdminUser(tokens.access);

    if (!user.is_staff) {
      throw new ApiError(
        "http",
        "/api/v1/auth/me/",
        "This account is not authorized to access the admin panel.",
        { status: 403 },
      );
    }
  } catch (error) {
    if (isAuthenticationFailure(error)) {
      const expiredOptions = getExpiredAdminCookieOptions();

      cookieStore.set(ADMIN_ACCESS_COOKIE, "", expiredOptions);
      cookieStore.set(ADMIN_REFRESH_COOKIE, "", expiredOptions);

      throw new ApiError("http", path, "Your admin session has expired. Please sign in again.", {
        status: 401,
      });
    }

    throw error;
  }

  cookieStore.set(ADMIN_ACCESS_COOKIE, tokens.access, getAdminAccessCookieOptions());

  cookieStore.set(ADMIN_REFRESH_COOKIE, tokens.refresh, getAdminRefreshCookieOptions());

  return operation(tokens.access);
}
