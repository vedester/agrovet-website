import { NextResponse } from "next/server";
import { z } from "zod";

import { getBackendOrigin } from "@/config/backend";

const orderSchema = z.object({
  customer_name: z.string().trim().min(1).max(200),
  customer_email: z.string().trim().max(254).email().or(z.literal("")).optional(),
  customer_phone: z.string().trim().min(1).max(30),
  delivery_address: z.string().trim().min(1).max(2000),
  delivery_instructions: z.string().max(2000).optional(),
  payment_method: z.literal("cash_on_delivery"),
  items: z.array(
    z.object({
      product_id: z.number().int().positive(),
      quantity: z.number().int().min(1).max(10000),
    }).strict(),
  ).min(1).max(100),
}).strict();

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { detail: message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
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

  const parsed = orderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        detail: "Please check the order details and try again.",
        errors: parsed.error.flatten().fieldErrors,
      },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  try {
    const backendUrl = new URL("/api/v1/orders/", getBackendOrigin());

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });

    const responseText = await response.text();

    let payload: unknown;

    try {
      payload = JSON.parse(responseText);
    } catch {
      return errorResponse(
        "The order service returned an invalid response. Please try again.",
        502,
      );
    }

    return NextResponse.json(payload, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return errorResponse(
      "We could not reach the order service. Please try again shortly.",
      503,
    );
  }
}
