import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminInventory } from "@/lib/api/admin-inventory";
import {
  getInventoryApiError,
  inventoryErrorResponse,
  isSameOrigin,
  readJsonBody,
} from "@/lib/api/admin-inventory-proxy";

const inventoryQuerySchema = z.object({
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(100).optional(),
  stockStatus: z
    .enum(["tracked", "manual", "out_of_stock", "low_stock"])
    .optional(),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return inventoryErrorResponse("Invalid request origin.", 403);
  }

  const parsed = await readJsonBody(request);

  if ("response" in parsed) {
    return parsed.response;
  }

  const validation = inventoryQuerySchema.safeParse(parsed.body);

  if (!validation.success) {
    return inventoryErrorResponse(
      "The supplied inventory filters are invalid.",
      400,
    );
  }

  try {
    const inventory = await getAdminInventory(validation.data);

    return NextResponse.json(inventory, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const result = getInventoryApiError(error, "load inventory");
    return inventoryErrorResponse(result.message, result.status);
  }
}
