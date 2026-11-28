import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminOrders } from "@/lib/api/admin-orders";
import {
  getOrdersApiError,
  isSameOrigin,
  ordersErrorResponse,
  readOrdersJsonBody,
} from "@/lib/api/admin-orders-proxy";

const orderQuerySchema = z.object({
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(100).optional(),
  status: z.enum([
    "all",
    "pending_confirmation",
    "confirmed",
    "processing",
    "out_for_delivery",
    "delivered",
    "completed",
    "cancelled",
    "rejected",
  ]).optional(),
  paymentStatus: z.enum([
    "all",
    "unpaid",
    "pending",
    "paid",
    "failed",
    "refunded",
  ]).optional(),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return ordersErrorResponse("Invalid request origin.", 403);
  }

  const parsed = await readOrdersJsonBody(request);

  if ("response" in parsed) {
    return parsed.response;
  }

  const validation = orderQuerySchema.safeParse(parsed.body);

  if (!validation.success) {
    return ordersErrorResponse(
      "The supplied order filters are invalid.",
      400,
    );
  }

  try {
    const orders = await getAdminOrders(validation.data);

    return NextResponse.json(orders, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const result = getOrdersApiError(error, "load orders");
    return ordersErrorResponse(result.message, result.status);
  }
}
