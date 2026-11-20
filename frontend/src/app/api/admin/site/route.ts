import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { getAdminSiteSettings, updateAdminSiteSettings } from "@/lib/api/admin-site";
import { ApiError } from "@/lib/api/errors";
import { siteSettingsSchema } from "@/features/site/schemas";

const updateSettingsSchema = siteSettingsSchema.omit({ whatsapp_url: true }).partial().strict();

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function getApiError(error: unknown): {
  message: string;
  status: number;
} {
  if (error instanceof ApiError) {
    if (error.kind === "unreachable") {
      return {
        message: "The website settings service is temporarily unavailable.",
        status: 503,
      };
    }

    if (error.kind === "bad_response") {
      return {
        message: "The website settings service returned an invalid response.",
        status: 502,
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
        message: "You are not authorized to manage website settings.",
        status: 403,
      };
    }

    if (error.status === 429) {
      return {
        message: "Too many requests. Please wait and try again.",
        status: 429,
      };
    }

    if (error.status === 400) {
      return {
        message: "Some website settings are invalid. Please review your entries.",
        status: 400,
      };
    }
  }

  return {
    message: "Unable to process website settings. Please try again.",
    status: 500,
  };
}

export async function GET() {
  try {
    const settings = await getAdminSiteSettings();

    return NextResponse.json(settings, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const result = getApiError(error);
    return errorResponse(result.message, result.status);
  }
}

export async function PATCH(request: Request) {
  // Only accept updates originating from this application.
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

  const validation = updateSettingsSchema.safeParse(body);

  if (!validation.success) {
    return errorResponse("The supplied website settings are invalid.", 400);
  }

  try {
    const settings = await updateAdminSiteSettings(validation.data);

    // Expire the cached public settings after a successful update.
    revalidateTag("site-settings", { expire: 0 });

    return NextResponse.json(settings, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) {
      console.error("Django website settings validation response:", error.responseBody);
    }

    const result = getApiError(error);
    return errorResponse(result.message, result.status);
  }
}
