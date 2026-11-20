// Directory: frontend/src/app/api/admin/catalog/products/[productId]/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteAdminProduct, getAdminProduct, updateAdminProduct } from "@/lib/api/admin-catalog";
import { ApiError } from "@/lib/api/errors";

type RouteContext = {
  params: Promise<{ productId: string }>;
};

const updateProductSchema = z
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
  .partial()
  .superRefine((product, context) => {
    if (Object.keys(product).length === 0) {
      context.addIssue({
        code: "custom",
        message: "At least one product field must be supplied.",
      });
    }

    if (
      product.stock_quantity !== undefined &&
      product.stock_quantity !== null &&
      product.is_in_stock !== undefined &&
      product.is_in_stock !== product.stock_quantity > 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["is_in_stock"],
        message: "Availability must match the stock quantity.",
      });
    }
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

function getApiError(error: unknown) {
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

    if (error.status === 400) {
      return {
        message: "The product details were rejected. Check the supplied values and SKU.",
        status: 400,
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
        message: "You are not authorized to manage this product.",
        status: 403,
      };
    }

    if (error.status === 404) {
      return {
        message: "The requested product could not be found.",
        status: 404,
      };
    }

    if (error.status === 429) {
      return {
        message: "Too many requests. Please wait and try again.",
        status: 429,
      };
    }
  }

  return {
    message: "An unexpected error occurred. Please try again.",
    status: 500,
  };
}

async function getProductId(context: RouteContext): Promise<number | null> {
  const { productId } = await context.params;

  if (!/^[1-9]\d*$/.test(productId)) {
    return null;
  }

  const id = Number(productId);

  return Number.isSafeInteger(id) ? id : null;
}

// Retrieve one product for the edit form.
export async function GET(_request: Request, context: RouteContext) {
  const productId = await getProductId(context);

  if (productId === null) {
    return errorResponse("Invalid product ID.", 400);
  }

  try {
    const product = await getAdminProduct(productId);

    return NextResponse.json(product, {
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

// Update an existing product.
export async function PATCH(request: Request, context: RouteContext) {
  const origin = request.headers.get("origin");

  if (!origin || origin !== new URL(request.url).origin) {
    return errorResponse("Invalid request origin.", 403);
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return errorResponse("Content-Type must be application/json.", 415);
  }

  const productId = await getProductId(context);

  if (productId === null) {
    return errorResponse("Invalid product ID.", 400);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON request body.", 400);
  }

  const validation = updateProductSchema.safeParse(body);

  if (!validation.success) {
    return errorResponse("Please correct the product details and try again.", 400);
  }

  try {
    const product = await updateAdminProduct(productId, validation.data);

    return NextResponse.json(product, {
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

// Delete an existing product.
// Permanently delete an existing product.
export async function DELETE(request: Request, context: RouteContext) {
  const origin = request.headers.get("origin");

  if (!origin || origin !== new URL(request.url).origin) {
    return errorResponse("Invalid request origin.", 403);
  }

  const productId = await getProductId(context);

  if (productId === null) {
    return errorResponse("Invalid product ID.", 400);
  }

  try {
    await deleteAdminProduct(productId);

    return new NextResponse(null, {
      status: 204,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const result = getApiError(error);
    return errorResponse(result.message, result.status);
  }
}
