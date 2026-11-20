// Directory: frontend/src/app/api/admin/catalog/categories/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminCategories } from "@/lib/api/admin-catalog";
import { ApiError } from "@/lib/api/errors";

const categoryQuerySchema = z.object({
  isActive: z.boolean().optional(),
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

function getApiError(error: unknown): {
  message: string;
  status: number;
} {
  if (error instanceof ApiError) {
    if (error.kind === "unreachable") {
      return {
        message: "The catalogue service is temporarily unavailable.",
        status: 503,
      };
    }

    if (error.kind === "bad_response") {
      return {
        message: "The catalogue service returned an invalid response.",
        status: 502,
      };
    }

    if (error.status === 401) {
      return {
        message: "Your session has expired. Please sign in again.",
        status: 401,
      };
    }

    if (error.status === 403) {
      return {
        message: "You are not authorized to manage this catalogue.",
        status: 403,
      };
    }

    if (error.status === 429) {
      return {
        message: "Too many requests. Please wait and try again.",
        status: 429,
      };
    }

    if (error.status === 404) {
      return {
        message: "The requested catalogue resource was not found.",
        status: 404,
      };
    }
  }

  return {
    message: "Unable to load categories. Please try again.",
    status: 500,
  };
}

export async function POST(request: Request) {
  // This endpoint can refresh rotating authentication tokens.
  // Only accept requests originating from this application.
  const origin = request.headers.get("origin");

  if (!origin || origin !== new URL(request.url).origin) {
    return errorResponse("Invalid request origin.", 403);
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return errorResponse("Content-Type must be application/json.", 415);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON request body.", 400);
  }

  const validation = categoryQuerySchema.safeParse(body);

  if (!validation.success) {
    return errorResponse("The supplied category filters are invalid.", 400);
  }

  try {
    const categories = await getAdminCategories(validation.data);

    return NextResponse.json(categories, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
 } catch (error) {
  if (error instanceof ApiError && error.status === 400) {
    console.error("Django category validation response:", error.responseBody);
  }

  const result = getApiError(error);
  return errorResponse(result.message, result.status);
}
}
