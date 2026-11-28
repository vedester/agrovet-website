import { NextResponse } from "next/server";
import { z } from "zod";

import { transitionAdminOrder } from "@/lib/api/admin-orders";
import {
  getOrderId,
  getOrdersApiError,
  isSameOrigin,
  ordersErrorResponse,
  readOrdersJsonBody,
} from "@/lib/api/admin-orders-proxy";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

const transitionSchema = z.object({
  to_status: z.enum([
    "pending_confirmation",
    "confirmed",
    "processing",
    "out_for_delivery",
    "delivered",
    "completed",
    "cancelled",
    "rejected",
  ]),
  note: z.string().trim().max(2000).optional(),
  manual_stock_verified: z.boolean().optional(),
  delivery_fee: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid delivery fee.")
    .optional(),
});

export async function POST(request: Request, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return ordersErrorResponse("Invalid request origin.", 403);
  }

  const orderId = await getOrderId(context);

  if (orderId === null) {
    return ordersErrorResponse("Invalid order ID.", 400);
  }

  const parsed = await readOrdersJsonBody(request);

  if ("response" in parsed) {
    return parsed.response;
  }

  const validation = transitionSchema.safeParse(parsed.body);

  if (!validation.success) {
    return ordersErrorResponse(
      "The supplied order transition is invalid.",
      400,
    );
  }

  try {
    const result = await transitionAdminOrder(orderId, validation.data);

    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const result = getOrdersApiError(error, "status update");
    return ordersErrorResponse(result.message, result.status);
  }
}
