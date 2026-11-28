import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";

export function inventoryErrorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export function getInventoryApiError(error: unknown, action: string) {
  if (error instanceof ApiError) {
    if (error.kind === "unreachable") {
      return {
        message: "The inventory service is temporarily unavailable. Please try again.",
        status: 503,
      };
    }

    if (error.kind === "bad_response") {
      return {
        message: "The inventory service returned an invalid response.",
        status: 502,
      };
    }

    if (error.status === 400) {
      return {
        message: `The inventory service rejected this ${action}. Check the supplied values and try again.`,
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
        message: "You are not authorized to manage inventory.",
        status: 403,
      };
    }

    if (error.status === 404) {
      return {
        message: "The requested inventory resource could not be found.",
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
    message: `Unable to ${action}. Please try again.`,
    status: 500,
  };
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");

  return Boolean(origin && origin === new URL(request.url).origin);
}

export async function readJsonBody(
  request: Request,
): Promise<{ body: unknown } | { response: NextResponse }> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return {
      response: inventoryErrorResponse(
        "Content-Type must be application/json.",
        415,
      ),
    };
  }

  try {
    return { body: await request.json() };
  } catch {
    return {
      response: inventoryErrorResponse("Invalid JSON request body.", 400),
    };
  }
}

export async function getInventoryProductId(
  context: { params: Promise<{ productId: string }> },
): Promise<number | null> {
  const { productId } = await context.params;

  if (!/^[1-9]\d*$/.test(productId)) {
    return null;
  }

  const id = Number(productId);

  return Number.isSafeInteger(id) ? id : null;
}
