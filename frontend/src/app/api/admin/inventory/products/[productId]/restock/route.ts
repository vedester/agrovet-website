import { NextResponse } from "next/server";
import { z } from "zod";

import { restockAdminProduct } from "@/lib/api/admin-inventory";
import {
  getInventoryApiError,
  getInventoryProductId,
  inventoryErrorResponse,
  isSameOrigin,
  readJsonBody,
} from "@/lib/api/admin-inventory-proxy";

type RouteContext = {
  params: Promise<{ productId: string }>;
};

const restockSchema = z.object({
  quantity: z.number().int().positive(),
  reason: z.string().trim().min(1).max(255),
});

export async function POST(request: Request, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return inventoryErrorResponse("Invalid request origin.", 403);
  }

  const productId = await getInventoryProductId(context);

  if (productId === null) {
    return inventoryErrorResponse("Invalid product ID.", 400);
  }

  const parsed = await readJsonBody(request);

  if ("response" in parsed) {
    return parsed.response;
  }

  const validation = restockSchema.safeParse(parsed.body);

  if (!validation.success) {
    return inventoryErrorResponse(
      "Enter a valid positive quantity and a reason for the restock.",
      400,
    );
  }

  try {
    const result = await restockAdminProduct(productId, validation.data);

    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const result = getInventoryApiError(error, "record the restock");
    return inventoryErrorResponse(result.message, result.status);
  }
}
