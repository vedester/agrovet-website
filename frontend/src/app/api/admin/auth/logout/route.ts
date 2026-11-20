

// Directory: frontend/src/app/api/admin/auth/logout/route.ts

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
  getExpiredAdminCookieOptions,
} from "@/lib/api/admin-cookies";
import {
  logoutAdmin,
  refreshAdminTokens,
} from "@/lib/api/admin-auth";
import { ApiError } from "@/lib/api/errors";

function clearAuthenticationCookies(response: NextResponse) {
  const options = getExpiredAdminCookieOptions();

  response.cookies.set(ADMIN_ACCESS_COOKIE, "", options);
  response.cookies.set(ADMIN_REFRESH_COOKIE, "", options);
}

function isAuthenticationFailure(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.kind === "http" &&
    [400, 401, 403].includes(error.status ?? 0)
  );
}

export async function POST(request: Request) {
  // Logout changes authentication state, so require a same-origin request.
  const origin = request.headers.get("origin");

  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  const cookieStore = await cookies();

  const accessToken = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(ADMIN_REFRESH_COOKIE)?.value;

  // Prepare the response first. Local logout must still work if Django
  // is temporarily unavailable.
  const response = new NextResponse(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store",
    },
  });

  try {
    if (refreshToken) {
      let tokens = {
        access: accessToken ?? "",
        refresh: refreshToken,
      };

      try {
        // Django requires a valid access token for its logout endpoint.
        if (!tokens.access) {
          tokens = await refreshAdminTokens(refreshToken);
        }

        await logoutAdmin(tokens.access, tokens.refresh);
      } catch (error) {
        // If the access token expired, rotate the refresh token and retry.
        if (isAuthenticationFailure(error)) {
          const refreshedTokens = await refreshAdminTokens(refreshToken);

          await logoutAdmin(
            refreshedTokens.access,
            refreshedTokens.refresh,
          );
        }
      }
    }
  } catch {
    // Even if Django cannot be reached, remove the browser's credentials.
    // The server-side refresh token may remain valid until it expires.
  }

  clearAuthenticationCookies(response);

  return response;
}
