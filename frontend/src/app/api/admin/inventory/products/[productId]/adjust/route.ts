import { NextResponse } from "next/server";
import { z } from "zod";

import { adjustAdminProductStock } from "@/lib/api/admin-inventory";
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

const adjustmentSchema = z.object({
  quantity_delta: z.number().int().refine((value) => value !== 0, {
    message: "Adjustment quantity cannot be zero.",
  }),
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

  const validation = adjustmentSchema.safeParse(parsed.body);

  if (!validation.success) {
    return inventoryErrorResponse(
      "Enter a non-zero adjustment quantity and a reason.",
      400,
    );
  }

  try {
    const result = await adjustAdminProductStock(productId, validation.data);

    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const result = getInventoryApiError(error, "adjust stock");
    return inventoryErrorResponse(result.message, result.status);
  }
}
