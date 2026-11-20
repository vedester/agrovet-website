// Directory: frontend/src/app/api/admin/catalog/products/create/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminProduct } from "@/lib/api/admin-catalog";
import { ApiError } from "@/lib/api/errors";

const createProductSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    sku: z
      .string()
      .trim()
      .min(1)
      .max(40)
      .transform((value) => value.toUpperCase()),
    brand: z.string().trim().max(100),
    pack_size: z.string().trim().max(50),
    description: z.string().trim(),
    price: z
      .string()
      .trim()
      .regex(/^\d{1,8}(\.\d{1,2})?$/),
    stock_quantity: z.number().int().nonnegative().nullable(),
    is_in_stock: z.boolean(),
    requires_advice: z.boolean(),
    is_featured: z.boolean(),
    is_active: z.boolean(),
    category: z.number().int().positive(),
  })
  .superRefine((product, context) => {
    if (product.stock_quantity !== null && product.is_in_stock !== product.stock_quantity > 0) {
      context.addIssue({
        code: "custom",
        path: ["is_in_stock"],
        message: "Availability must match the stock quantity.",
      });
    }
  });

function errorResponse(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function getApiError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.kind === "unreachable") {
      return { message: "The catalogue service is unavailable.", status: 503 };
    }

    if (error.kind === "bad_response") {
      return { message: "The catalogue service returned an invalid response.", status: 502 };
    }

    if (error.status === 401) {
      return { message: "Your session has expired. Please sign in again.", status: 401 };
    }

    if (error.status === 403) {
      return { message: "You are not authorized to create products.", status: 403 };
    }

    if (error.status === 400) {
      return {
        message: "The product was rejected. Check the supplied details, including the SKU.",
        status: 400,
      };
    }

    if (error.status === 429) {
      return { message: "Too many requests. Please wait and try again.", status: 429 };
    }
  }

  return { message: "Unable to create the product. Please try again.", status: 500 };
}

export async function POST(request: Request) {
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

  const validation = createProductSchema.safeParse(body);

  if (!validation.success) {
    return errorResponse(
      "Please correct the product details and try again.",
      400,
      validation.error.flatten().fieldErrors,
    );
  }

  try {
    const product = await createAdminProduct(validation.data);

    return NextResponse.json(product, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const result = getApiError(error);
    return errorResponse(result.message, result.status);
  }
}
