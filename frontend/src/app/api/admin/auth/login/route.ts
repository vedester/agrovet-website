

// Directory: frontend/src/app/api/admin/auth/login/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
  getAdminAccessCookieOptions,
  getAdminRefreshCookieOptions,
} from "@/lib/api/admin-cookies";
import { loginAdmin } from "@/lib/api/admin-auth";
import { ApiError } from "@/lib/api/errors";

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

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

function getLoginError(error: unknown): {
  message: string;
  status: number;
} {
  if (error instanceof ApiError) {
    if (error.kind === "unreachable") {
      return {
        message: "The authentication service is temporarily unavailable.",
        status: 503,
      };
    }

    if (error.kind === "bad_response") {
      return {
        message: "The authentication service returned an invalid response.",
        status: 502,
      };
    }

    if (error.status === 401) {
      return {
        message: "Invalid email or password.",
        status: 401,
      };
    }

    if (error.status === 403) {
      return {
        message: "This account is not authorized to access the admin panel.",
        status: 403,
      };
    }

    if (error.status === 429) {
      return {
        message: "Too many login attempts. Please try again later.",
        status: 429,
      };
    }
  }

  return {
    message: "Unable to sign in. Please try again.",
    status: 500,
  };
}

export async function POST(request: Request) {
  // Reject cross-origin requests to protect the login endpoint.
  const origin = request.headers.get("origin");

  if (!origin || origin !== new URL(request.url).origin) {
    return errorResponse("Invalid request origin.", 403);
  }

  // Accept JSON only.
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return errorResponse("Content-Type must be application/json.", 415);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON request body.", 400);
  }

  const validation = loginSchema.safeParse(body);

  if (!validation.success) {
    return errorResponse("Please provide a valid email and password.", 400);
  }

  try {
    const { tokens, user } = await loginAdmin(
      validation.data.email,
      validation.data.password,
    );

    const response = NextResponse.json(
      {
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

    return response;
  } catch (error) {
    const result = getLoginError(error);
    return errorResponse(result.message, result.status);
  }
}
