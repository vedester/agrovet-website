import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminInventoryMovements } from "@/lib/api/admin-inventory";
import {
  getInventoryApiError,
  inventoryErrorResponse,
  isSameOrigin,
  readJsonBody,
} from "@/lib/api/admin-inventory-proxy";

const movementQuerySchema = z.object({
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  product: z.number().int().positive().optional(),
  movementType: z.string().trim().max(50).optional(),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return inventoryErrorResponse("Invalid request origin.", 403);
  }

  const parsed = await readJsonBody(request);

  if ("response" in parsed) {
    return parsed.response;
  }

  const validation = movementQuerySchema.safeParse(parsed.body);

  if (!validation.success) {
    return inventoryErrorResponse("The supplied movement filters are invalid.", 400);
  }

  try {
    const movements = await getAdminInventoryMovements(validation.data);

    return NextResponse.json(movements, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const result = getInventoryApiError(error, "load stock movements");
    return inventoryErrorResponse(result.message, result.status);
  }
}
