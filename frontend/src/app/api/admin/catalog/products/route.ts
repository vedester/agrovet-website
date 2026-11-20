// Directory: frontend/src/app/api/admin/catalog/products/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminProducts } from "@/lib/api/admin-catalog";
import { ApiError } from "@/lib/api/errors";

const productQuerySchema = z.object({
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(120).optional(),
  inStock: z.boolean().optional(),
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
    message: "Unable to load products. Please try again.",
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

  const validation = productQuerySchema.safeParse(body);

  if (!validation.success) {
    return errorResponse("The supplied product filters are invalid.", 400);
  }

  try {
    const products = await getAdminProducts(validation.data);

    return NextResponse.json(products, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const result = getApiError(error);
    return errorResponse(result.message, result.status);
  }
}
