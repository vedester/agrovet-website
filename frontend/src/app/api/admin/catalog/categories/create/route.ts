// Directory: frontend/src/app/api/admin/catalog/categories/create/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminCategory, createAdminCategoryWithFormData } from "@/lib/api/admin-catalog";
import { ApiError } from "@/lib/api/errors";

const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  parent: z.number().int().positive().nullable().optional(),
  description: z.string().trim().max(5000).optional(),
  sort_order: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional(),
});

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getFormString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);

  return typeof value === "string" ? value : undefined;
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function getApiError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.kind === "unreachable") {
      return { message: "The catalogue service is unavailable.", status: 503 };
    }

    if (error.kind === "bad_response") {
      return { message: "The catalogue service returned an invalid response.", status: 502 };
    }

    if (error.status === 400) {
      return {
        message: "The category was rejected. Check its name and parent category.",
        status: 400,
      };
    }

    if (error.status === 401) {
      return { message: "Your session has expired. Please sign in again.", status: 401 };
    }

    if (error.status === 403) {
      return { message: "You are not authorized to create categories.", status: 403 };
    }

    if (error.status === 429) {
      return { message: "Too many requests. Please wait and try again.", status: 429 };
    }
  }

  return { message: "Unable to create the category. Please try again.", status: 500 };
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin || origin !== new URL(request.url).origin) {
    return errorResponse("Invalid request origin.", 403);
  }

  const contentType = request.headers.get("content-type") ?? "";

  try {
    let category;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      const parentValue = getFormString(formData, "parent");
      const sortOrderValue = getFormString(formData, "sort_order");
      const isActiveValue = getFormString(formData, "is_active");

      const validation = createCategorySchema.safeParse({
        name: getFormString(formData, "name"),
        parent:
          parentValue === undefined ? undefined : parentValue === "" ? null : Number(parentValue),
        description: getFormString(formData, "description"),
        sort_order:
          sortOrderValue === undefined || sortOrderValue === ""
            ? undefined
            : Number(sortOrderValue),
        is_active:
          isActiveValue === undefined
            ? undefined
            : isActiveValue === "true"
              ? true
              : isActiveValue === "false"
                ? false
                : null,
      });

      if (!validation.success) {
        return errorResponse("Please correct the category details and try again.", 400);
      }

      const image = formData.get("image");

      if (image !== null && !(image instanceof File)) {
        return errorResponse("Invalid category image.", 400);
      }

      if (image instanceof File) {
        if (image.size === 0) {
          return errorResponse("The selected image is empty.", 400);
        }

        if (image.size > MAX_IMAGE_SIZE) {
          return errorResponse("The category image must not exceed 10 MB.", 413);
        }

        if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
          return errorResponse("Only JPEG, PNG, and WebP images are supported.", 415);
        }
      }

      const validatedFormData = new FormData();

      validatedFormData.set("name", validation.data.name);
      validatedFormData.set(
        "parent",
        validation.data.parent === null || validation.data.parent === undefined
          ? ""
          : String(validation.data.parent),
      );
      validatedFormData.set("description", validation.data.description ?? "");
      validatedFormData.set("sort_order", String(validation.data.sort_order ?? 0));
      validatedFormData.set("is_active", String(validation.data.is_active ?? true));

      if (image instanceof File) {
        validatedFormData.set("image", image, image.name);
      }

      category = await createAdminCategoryWithFormData(validatedFormData);
    } else if (contentType.includes("application/json")) {
      let body: unknown;

      try {
        body = await request.json();
      } catch {
        return errorResponse("Invalid JSON request body.", 400);
      }

      const validation = createCategorySchema.safeParse(body);

      if (!validation.success) {
        return errorResponse("Please correct the category details and try again.", 400);
      }

      category = await createAdminCategory(validation.data);
    } else {
      return errorResponse("Content-Type must be application/json or multipart/form-data.", 415);
    }

    return NextResponse.json(category, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) {
      console.error("Django category validation response:", error.responseBody);
    }

    const result = getApiError(error);
    return errorResponse(result.message, result.status);
  }
}
