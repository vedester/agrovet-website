import { NextResponse } from "next/server";

import { getAdminOrder } from "@/lib/api/admin-orders";
import {
  getOrderId,
  getOrdersApiError,
  ordersErrorResponse,
} from "@/lib/api/admin-orders-proxy";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const orderId = await getOrderId(context);

  if (orderId === null) {
    return ordersErrorResponse("Invalid order ID.", 400);
  }

  try {
    const order = await getAdminOrder(orderId);

    return NextResponse.json(order, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const result = getOrdersApiError(error, "load order details");
    return ordersErrorResponse(result.message, result.status);
  }
}
