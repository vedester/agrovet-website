// Directory: frontend/src/lib/api/admin-catalog.ts

import "server-only";

// import { cookies } from "next/headers";
import { z } from "zod";

import { getBackendOrigin } from "@/config/backend";

import { withAdminAccessToken } from "@/lib/api/admin-session";

import { ApiError } from "@/lib/api/errors";

const ADMIN_PRODUCTS_PATH = "/api/v1/admin/catalog/products/";
const ADMIN_CATEGORIES_PATH = "/api/v1/admin/catalog/categories/";
const TIMEOUT_MS = 8_000;
const IMAGE_UPLOAD_TIMEOUT_MS = 30_000;

export const adminProductImageSchema = z.object({
  id: z.number(),
  image: z.string(),
  alt_text: z.string(),
  position: z.number(),
  created_at: z.string(),
});

export const adminProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  sku: z.string(),
  brand: z.string(),
  pack_size: z.string(),
  description: z.string(),
  price: z.string(),
  stock_quantity: z.number().nullable(),
  is_in_stock: z.boolean(),
  requires_advice: z.boolean(),
  is_featured: z.boolean(),
  is_active: z.boolean(),
  category: z.number(),
  category_name: z.string(),
  images: z.array(adminProductImageSchema),
  created_at: z.string(),
  updated_at: z.string(),
});

const adminProductPageSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(adminProductSchema),
});

export const adminCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  parent: z.number().nullable(),
  description: z.string(),
  image: z.string().nullable(),
  sort_order: z.number(),
  is_active: z.boolean(),
  product_count: z.number(),
  children_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

const adminCategoriesSchema = z.array(adminCategorySchema);

export type AdminProduct = z.infer<typeof adminProductSchema>;
export type AdminProductPage = z.infer<typeof adminProductPageSchema>;
export type AdminCategory = z.infer<typeof adminCategorySchema>;
export type AdminProductImage = z.infer<typeof adminProductImageSchema>;

export type AdminProductQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  inStock?: boolean;
  isActive?: boolean;
};

// category
export type AdminCategoryQuery = {
  isActive?: boolean;
};

export type CreateAdminCategoryInput = {
  name: string;
  parent?: number | null;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
};

export type UpdateAdminCategoryInput = Partial<CreateAdminCategoryInput>;

export async function createAdminCategoryWithFormData(formData: FormData): Promise<AdminCategory> {
  return withAdminAccessToken(ADMIN_CATEGORIES_PATH, (accessToken) =>
    requestBackendMultipart(
      ADMIN_CATEGORIES_PATH,
      accessToken,
      formData,
      adminCategorySchema,
      "POST",
    ),
  );
}

export async function updateAdminCategoryWithFormData(
  categoryId: number,
  formData: FormData,
): Promise<AdminCategory> {
  const path = `${ADMIN_CATEGORIES_PATH}${categoryId}/`;

  return withAdminAccessToken(path, (accessToken) =>
    requestBackendMultipart(path, accessToken, formData, adminCategorySchema, "PATCH"),
  );
}

export type CreateAdminProductInput = {
  name: string;
  sku: string;
  brand: string;
  pack_size: string;
  description: string;
  price: string;
  requires_advice: boolean;
  is_featured: boolean;
  is_active: boolean;
  category: number;
};

export type UpdateAdminProductInput = Partial<CreateAdminProductInput>;


async function requestBackend<T>(
  path: string,
  accessToken: string,
  schema: z.ZodType<T>,
  params: Record<string, string | number | boolean | undefined> = {},
  options: {
    method?: "GET" | "POST" | "PATCH";
    body?: unknown;
  } = {},
): Promise<T> {
  const url = new URL(path, getBackendOrigin());

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  let response: Response;

  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (cause) {
    throw new ApiError("unreachable", path, "The catalogue service could not be reached.", {
      cause,
    });
  }
  if (!response.ok) {
    const responseBody = await response.text();

    throw new ApiError("http", path, "The catalogue request was rejected.", {
      status: response.status,
      responseBody,
    });
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch (cause) {
    throw new ApiError("bad_response", path, "The catalogue service returned invalid JSON.", {
      cause,
    });
  }

  const result = schema.safeParse(payload);

  if (!result.success) {
    console.error(
      "Catalogue response schema validation failed:",
      JSON.stringify(result.error.issues, null, 2),
    );

    throw new ApiError(
      "bad_response",
      path,
      "The catalogue service returned an unexpected response.",
    );
  }

  return result.data;
}

async function requestBackendNoContent(path: string, accessToken: string): Promise<void> {
  const url = new URL(path, getBackendOrigin());

  let response: Response;

  try {
    response = await fetch(url, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (cause) {
    throw new ApiError("unreachable", path, "The catalogue service could not be reached.", {
      cause,
    });
  }

  if (!response.ok) {
    throw new ApiError("http", path, "The product deletion was rejected.", {
      status: response.status,
    });
  }

  if (response.status !== 204) {
    throw new ApiError(
      "bad_response",
      path,
      "The catalogue service returned an unexpected deletion response.",
    );
  }
}

async function requestBackendMultipart<T>(
  path: string,
  accessToken: string,
  formData: FormData,
  schema: z.ZodType<T>,
  method: "POST" | "PATCH" = "POST",
): Promise<T> {
  const url = new URL(path, getBackendOrigin());

  let response: Response;

  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
      cache: "no-store",
      signal: AbortSignal.timeout(IMAGE_UPLOAD_TIMEOUT_MS),
    });
  } catch (cause) {
    throw new ApiError("unreachable", path, "The catalogue upload service could not be reached.", {
      cause,
    });
  }

  if (!response.ok) {
    const responseBody = await response.text();

    throw new ApiError("http", path, "The catalogue upload request was rejected.", {
      status: response.status,
      responseBody,
    });
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch (cause) {
    throw new ApiError("bad_response", path, "The catalogue service returned invalid JSON.", {
      cause,
    });
  }

  const result = schema.safeParse(payload);

  if (!result.success) {
    console.error(
      "Multipart response schema validation failed:",
      JSON.stringify(result.error.issues, null, 2),
    );

    throw new ApiError(
      "bad_response",
      path,
      "The catalogue service returned an unexpected response.",
    );
  }

  return result.data;
}


export async function getAdminProducts(query: AdminProductQuery = {}): Promise<AdminProductPage> {
  return withAdminAccessToken(ADMIN_PRODUCTS_PATH, (accessToken) =>
    requestBackend(ADMIN_PRODUCTS_PATH, accessToken, adminProductPageSchema, {
      page: query.page,
      page_size: query.pageSize,
      search: query.search,
      category: query.category,
      in_stock: query.inStock,
      is_active: query.isActive,
    }),
  );
}

export async function getAdminCategories(query: AdminCategoryQuery = {}): Promise<AdminCategory[]> {
  return withAdminAccessToken(ADMIN_CATEGORIES_PATH, (accessToken) =>
    requestBackend(ADMIN_CATEGORIES_PATH, accessToken, adminCategoriesSchema, {
      is_active: query.isActive,
    }),
  );
}

export async function createAdminCategory(input: CreateAdminCategoryInput): Promise<AdminCategory> {
  return withAdminAccessToken(ADMIN_CATEGORIES_PATH, (accessToken) =>
    requestBackend(
      ADMIN_CATEGORIES_PATH,
      accessToken,
      adminCategorySchema,
      {},
      {
        method: "POST",
        body: input,
      },
    ),
  );
}

export async function getAdminCategory(categoryId: number): Promise<AdminCategory> {
  const path = `${ADMIN_CATEGORIES_PATH}${categoryId}/`;

  return withAdminAccessToken(path, (accessToken) =>
    requestBackend(path, accessToken, adminCategorySchema),
  );
}
// This function updates an existing category with the provided input data. It uses the PATCH method to send the update request to the backend API. The function returns the updated category data if the request is successful.
export async function updateAdminCategory(
  categoryId: number,
  input: UpdateAdminCategoryInput,
): Promise<AdminCategory> {
  const path = `${ADMIN_CATEGORIES_PATH}${categoryId}/`;

  return withAdminAccessToken(path, (accessToken) =>
    requestBackend(
      path,
      accessToken,
      adminCategorySchema,
      {},
      {
        method: "PATCH",
        body: input,
      },
    ),
  );
}

export async function createAdminProduct(input: CreateAdminProductInput): Promise<AdminProduct> {
  return withAdminAccessToken(ADMIN_PRODUCTS_PATH, (accessToken) =>
    requestBackend(
      ADMIN_PRODUCTS_PATH,
      accessToken,
      adminProductSchema,
      {},
      {
        method: "POST",
        body: input,
      },
    ),
  );
}

export async function getAdminProduct(productId: number): Promise<AdminProduct> {
  const path = `${ADMIN_PRODUCTS_PATH}${productId}/`;

  return withAdminAccessToken(path, (accessToken) =>
    requestBackend(path, accessToken, adminProductSchema),
  );
}

export async function updateAdminProduct(
  productId: number,
  input: UpdateAdminProductInput,
): Promise<AdminProduct> {
  const path = `${ADMIN_PRODUCTS_PATH}${productId}/`;

  return withAdminAccessToken(path, (accessToken) =>
    requestBackend(
      path,
      accessToken,
      adminProductSchema,
      {},
      {
        method: "PATCH",
        body: input,
      },
    ),
  );
}

export async function deleteAdminProduct(productId: number): Promise<void> {
  const path = `${ADMIN_PRODUCTS_PATH}${productId}/`;

  return withAdminAccessToken(path, (accessToken) => requestBackendNoContent(path, accessToken));
}

export async function deleteAdminCategory(categoryId: number): Promise<void> {
  const path = `${ADMIN_CATEGORIES_PATH}${categoryId}/`;

  return withAdminAccessToken(path, (accessToken) => requestBackendNoContent(path, accessToken));
}

export async function uploadAdminProductImage(
  productId: number,
  formData: FormData,
): Promise<AdminProductImage> {
  const path = `${ADMIN_PRODUCTS_PATH}${productId}/images/`;

  return withAdminAccessToken(path, (accessToken) =>
    requestBackendMultipart(path, accessToken, formData, adminProductImageSchema),
  );
}
