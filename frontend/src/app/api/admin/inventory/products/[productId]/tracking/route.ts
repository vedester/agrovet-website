import { NextResponse } from "next/server";
import { z } from "zod";

import { updateAdminProductStockTracking } from "@/lib/api/admin-inventory";
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

const trackingSchema = z.object({
  stock_tracked: z.boolean(),
});

export async function PATCH(request: Request, context: RouteContext) {
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

  const validation = trackingSchema.safeParse(parsed.body);

  if (!validation.success) {
    return inventoryErrorResponse("A valid stock tracking setting is required.", 400);
  }

  try {
    const result = await updateAdminProductStockTracking(
      productId,
      validation.data.stock_tracked,
    );

    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const result = getInventoryApiError(error, "update stock tracking");
    return inventoryErrorResponse(result.message, result.status);
  }
}
