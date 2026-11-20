// Directory: frontend/src/app/api/admin/catalog/categories/[categoryId]/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getAdminCategory,
  deleteAdminCategory,
  updateAdminCategory,
  updateAdminCategoryWithFormData,
} from "@/lib/api/admin-catalog";
import { ApiError } from "@/lib/api/errors";

type RouteContext = {
  params: Promise<{ categoryId: string }>;
};

const updateCategoryFieldsSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    parent: z.number().int().positive().nullable(),
    description: z.string().trim().max(5000),
    sort_order: z.number().int().nonnegative(),
    is_active: z.boolean(),
  })
  .partial();

const updateCategorySchema = updateCategoryFieldsSchema.refine(
  (category) => Object.keys(category).length > 0,
  {
    message: "At least one category field must be supplied.",
  },
);

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
        message: "The category update was rejected. Check the supplied details.",
        status: 400,
      };
    }

    if (error.status === 401) {
      return { message: "Your session has expired. Please sign in again.", status: 401 };
    }

    if (error.status === 403) {
      return { message: "You are not authorized to manage this category.", status: 403 };
    }

    if (error.status === 404) {
      return { message: "The requested category could not be found.", status: 404 };
    }

    if (error.status === 429) {
      return { message: "Too many requests. Please wait and try again.", status: 429 };
    }
    if (error.status === 409) {
      return {
        message:
          "This category cannot be deleted because it still has products or subcategories. Move or remove those dependencies first, or deactivate the category instead.",
        status: 409,
      };
    }
  }

  return { message: "An unexpected error occurred. Please try again.", status: 500 };
}

async function getCategoryId(context: RouteContext): Promise<number | null> {
  const { categoryId } = await context.params;

  if (!/^[1-9]\d*$/.test(categoryId)) {
    return null;
  }

  const id = Number(categoryId);

  return Number.isSafeInteger(id) ? id : null;
}

export async function GET(_request: Request, context: RouteContext) {
  const categoryId = await getCategoryId(context);

  if (categoryId === null) {
    return errorResponse("Invalid category ID.", 400);
  }

  try {
    const category = await getAdminCategory(categoryId);

    return NextResponse.json(category, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const result = getApiError(error);
    return errorResponse(result.message, result.status);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const origin = request.headers.get("origin");

  if (!origin || origin !== new URL(request.url).origin) {
    return errorResponse("Invalid request origin.", 403);
  }

  const categoryId = await getCategoryId(context);

  if (categoryId === null) {
    return errorResponse("Invalid category ID.", 400);
  }

  const contentType = request.headers.get("content-type") ?? "";

  try {
    let category;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      const parentValue = getFormString(formData, "parent");
      const sortOrderValue = getFormString(formData, "sort_order");
      const isActiveValue = getFormString(formData, "is_active");

      const validation = updateCategoryFieldsSchema.safeParse({
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

      if (Object.keys(validation.data).length === 0 && !image) {
        return errorResponse("At least one category field or image must be supplied.", 400);
      }

      const validatedFormData = new FormData();

      if (validation.data.name !== undefined) {
        validatedFormData.set("name", validation.data.name);
      }

      if (validation.data.parent !== undefined) {
        validatedFormData.set(
          "parent",
          validation.data.parent === null ? "" : String(validation.data.parent),
        );
      }

      if (validation.data.description !== undefined) {
        validatedFormData.set("description", validation.data.description);
      }

      if (validation.data.sort_order !== undefined) {
        validatedFormData.set("sort_order", String(validation.data.sort_order));
      }

      if (validation.data.is_active !== undefined) {
        validatedFormData.set("is_active", String(validation.data.is_active));
      }

      if (image instanceof File) {
        validatedFormData.set("image", image, image.name);
      }

      category = await updateAdminCategoryWithFormData(categoryId, validatedFormData);
    } else if (contentType.includes("application/json")) {
      let body: unknown;

      try {
        body = await request.json();
      } catch {
        return errorResponse("Invalid JSON request body.", 400);
      }

      const validation = updateCategorySchema.safeParse(body);

      if (!validation.success) {
        return errorResponse("Please correct the category details and try again.", 400);
      }

      category = await updateAdminCategory(categoryId, validation.data);
    } else {
      return errorResponse("Content-Type must be application/json or multipart/form-data.", 415);
    }

    return NextResponse.json(category, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const result = getApiError(error);
    return errorResponse(result.message, result.status);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const origin = request.headers.get("origin");

  if (!origin || origin !== new URL(request.url).origin) {
    return errorResponse("Invalid request origin.", 403);
  }

  const categoryId = await getCategoryId(context);

  if (categoryId === null) {
    return errorResponse("Invalid category ID.", 400);
  }

  try {
    await deleteAdminCategory(categoryId);

    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const result = getApiError(error);
    return errorResponse(result.message, result.status);
  }
}
