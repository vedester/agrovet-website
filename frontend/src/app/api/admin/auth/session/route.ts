
// Directory: frontend/src/app/api/admin/auth/session/route.ts

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
  getAdminAccessCookieOptions,
  getAdminRefreshCookieOptions,
  getExpiredAdminCookieOptions,
} from "@/lib/api/admin-cookies";
import {
  getAdminUser,
  refreshAdminTokens,
  type AdminUser,
} from "@/lib/api/admin-auth";
import { ApiError } from "@/lib/api/errors";

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function isAuthenticationFailure(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.kind === "http" &&
    [400, 401, 403].includes(error.status ?? 0)
  );
}

function getServiceError(error: unknown): {
  message: string;
  status: number;
} {
  if (error instanceof ApiError && error.kind === "unreachable") {
    return {
      message: "The authentication service is temporarily unavailable.",
      status: 503,
    };
  }

  if (error instanceof ApiError && error.kind === "bad_response") {
    return {
      message: "The authentication service returned an invalid response.",
      status: 502,
    };
  }

  if (error instanceof ApiError && error.status === 429) {
    return {
      message: "Too many authentication requests. Please try again later.",
      status: 429,
    };
  }

  return {
    message: "Unable to validate your session.",
    status: 502,
  };
}

function clearAuthenticationCookies(response: NextResponse) {
  const options = getExpiredAdminCookieOptions();

  response.cookies.set(ADMIN_ACCESS_COOKIE, "", options);
  response.cookies.set(ADMIN_REFRESH_COOKIE, "", options);
}

function setAuthenticationCookies(
  response: NextResponse,
  tokens: { access: string; refresh: string },
) {
  response.cookies.set(
    ADMIN_ACCESS_COOKIE,
    tokens.access,
    getAdminAccessCookieOptions(),
  );

  response.cookies.set(
    ADMIN_REFRESH_COOKIE,
    tokens.refresh,
    getAdminRefreshCookieOptions(),
  );
}

function sessionResponse(user: AdminUser) {
  return NextResponse.json(
    {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        is_staff: user.is_staff,
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: Request) {
  // Session validation can rotate refresh tokens, so require same-origin POSTs.
  const origin = request.headers.get("origin");

  if (!origin || origin !== new URL(request.url).origin) {
    return errorResponse("Invalid request origin.", 403);
  }

  const cookieStore = await cookies();

  const accessToken = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(ADMIN_REFRESH_COOKIE)?.value;

  if (!accessToken && !refreshToken) {
    return errorResponse("Your session has expired. Please sign in again.", 401);
  }

  let user: AdminUser | undefined;

  // First, try the existing access token.
  if (accessToken) {
    try {
      user = await getAdminUser(accessToken);
    } catch (error) {
      // A non-authentication failure must not destroy a potentially valid session.
      if (!isAuthenticationFailure(error)) {
        const result = getServiceError(error);
        return errorResponse(result.message, result.status);
      }

      // A forbidden account must not regain access through token refresh.
      if (error instanceof ApiError && error.status === 403) {
        const response = errorResponse(
          "This account is not authorized to access the admin panel.",
          403,
        );
        clearAuthenticationCookies(response);
        return response;
      }
    }
  }

  // The access token is valid. No refresh is necessary.
  if (user) {
    return sessionResponse(user);
  }

  // The access token is missing or expired. Try the refresh token.
  if (!refreshToken) {
    const response = errorResponse(
      "Your session has expired. Please sign in again.",
      401,
    );
    clearAuthenticationCookies(response);
    return response;
  }

  try {
    const tokens = await refreshAdminTokens(refreshToken);

    // Confirm the refreshed access token still belongs to an authorized staff user.
    user = await getAdminUser(tokens.access);

    if (!user.is_staff) {
      const response = errorResponse(
        "This account is not authorized to access the admin panel.",
        403,
      );
      clearAuthenticationCookies(response);
      return response;
    }

    const response = sessionResponse(user);
    setAuthenticationCookies(response, tokens);

    return response;
  } catch (error) {
    if (isAuthenticationFailure(error)) {
      const response = errorResponse(
        "Your session has expired. Please sign in again.",
        401,
      );
      clearAuthenticationCookies(response);
      return response;
    }

    const result = getServiceError(error);
    return errorResponse(result.message, result.status);
  }
}
