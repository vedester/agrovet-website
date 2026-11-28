import "server-only";

import { z } from "zod";

import { getBackendOrigin } from "@/config/backend";
import { withAdminAccessToken } from "@/lib/api/admin-session";
import { ApiError } from "@/lib/api/errors";

const INVENTORY_PATH = "/api/v1/admin/inventory/";
const TIMEOUT_MS = 8_000;

// -----------------------------------------------------------------------------
// Response schemas
// -----------------------------------------------------------------------------

export const inventoryProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  sku: z.string(),
  brand: z.string(),
  pack_size: z.string(),
  stock_quantity: z.number().nullable(),
  is_in_stock: z.boolean(),
  stock_tracked: z.boolean(),
  reserved_quantity: z.number(),
  available_quantity: z.number().nullable(),
});

export const inventoryProductPageSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(inventoryProductSchema),
});

export const inventoryMovementSchema = z.object({
  id: z.number(),
  product: z.number(),
  product_name: z.string(),
  product_sku: z.string(),
  movement_type: z.string(),
  movement_type_label: z.string(),
  physical_quantity_delta: z.number(),
  reserved_quantity_delta: z.number(),
  physical_quantity_before: z.number(),
  physical_quantity_after: z.number(),
  reserved_quantity_before: z.number(),
  reserved_quantity_after: z.number(),
  reason: z.string(),
  actor_email: z.string().nullable(),
  order: z.number().nullable(),
  order_reference: z.string().nullable(),
  created_at: z.string(),
});

export const inventoryMovementPageSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(inventoryMovementSchema),
});

const inventoryActionSchema = z.object({
  detail: z.string(),
  product_id: z.number(),
  movement_id: z.number(),
});

const inventoryTrackingResponseSchema = z.object({
  detail: z.string(),
  product: inventoryProductSchema,
});

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type InventoryProduct = z.infer<typeof inventoryProductSchema>;
export type InventoryProductPage = z.infer<typeof inventoryProductPageSchema>;
export type InventoryMovement = z.infer<typeof inventoryMovementSchema>;
export type InventoryMovementPage = z.infer<typeof inventoryMovementPageSchema>;

export type InventoryProductQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  stockStatus?: "tracked" | "manual" | "out_of_stock" | "low_stock";
};

export type InventoryMovementQuery = {
  page?: number;
  pageSize?: number;
  product?: number;
  movementType?: string;
};

// -----------------------------------------------------------------------------
// Backend request helper
// -----------------------------------------------------------------------------

async function requestInventoryBackend<T>(
  path: string,
  accessToken: string,
  schema: z.ZodType<T>,
  params: Record<string, string | number | undefined> = {},
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
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body:
        options.body === undefined
          ? undefined
          : JSON.stringify(options.body),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (cause) {
    throw new ApiError(
      "unreachable",
      path,
      "The inventory service could not be reached.",
      { cause },
    );
  }

  if (!response.ok) {
    const responseBody = await response.text();

    throw new ApiError(
      "http",
      path,
      "The inventory request was rejected.",
      {
        status: response.status,
        responseBody,
      },
    );
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch (cause) {
    throw new ApiError(
      "bad_response",
      path,
      "The inventory service returned invalid JSON.",
      { cause },
    );
  }

  const result = schema.safeParse(payload);

  if (!result.success) {
    console.error(
      "Inventory response schema validation failed:",
      JSON.stringify(result.error.issues, null, 2),
    );

    throw new ApiError(
      "bad_response",
      path,
      "The inventory service returned an unexpected response.",
    );
  }

  return result.data;
}

// -----------------------------------------------------------------------------
// Inventory products
// -----------------------------------------------------------------------------

export async function getAdminInventory(
  query: InventoryProductQuery = {},
): Promise<InventoryProductPage> {
  const path = `${INVENTORY_PATH}products/`;

  return withAdminAccessToken(path, (accessToken) =>
    requestInventoryBackend(
      path,
      accessToken,
      inventoryProductPageSchema,
      {
        page: query.page,
        page_size: query.pageSize,
        search: query.search,
        stock_status: query.stockStatus,
      },
    ),
  );
}

export async function restockAdminProduct(
  productId: number,
  input: { quantity: number; reason: string },
) {
  const path = `${INVENTORY_PATH}products/${productId}/restock/`;

  return withAdminAccessToken(path, (accessToken) =>
    requestInventoryBackend(
      path,
      accessToken,
      inventoryActionSchema,
      {},
      {
        method: "POST",
        body: input,
      },
    ),
  );
}

export async function adjustAdminProductStock(
  productId: number,
  input: { quantity_delta: number; reason: string },
) {
  const path = `${INVENTORY_PATH}products/${productId}/adjust/`;

  return withAdminAccessToken(path, (accessToken) =>
    requestInventoryBackend(
      path,
      accessToken,
      inventoryActionSchema,
      {},
      {
        method: "POST",
        body: input,
      },
    ),
  );
}

export async function updateAdminProductStockTracking(
  productId: number,
  stockTracked: boolean,
) {
  const path = `${INVENTORY_PATH}products/${productId}/tracking/`;

  return withAdminAccessToken(path, (accessToken) =>
    requestInventoryBackend(
      path,
      accessToken,
      inventoryTrackingResponseSchema,
      {},
      {
        method: "PATCH",
        body: { stock_tracked: stockTracked },
      },
    ),
  );
}

// -----------------------------------------------------------------------------
// Inventory movement history
// -----------------------------------------------------------------------------

export async function getAdminInventoryMovements(
  query: InventoryMovementQuery = {},
): Promise<InventoryMovementPage> {
  const path = `${INVENTORY_PATH}movements/`;

  return withAdminAccessToken(path, (accessToken) =>
    requestInventoryBackend(
      path,
      accessToken,
      inventoryMovementPageSchema,
      {
        page: query.page,
        page_size: query.pageSize,
        product: query.product,
        movement_type: query.movementType,
      },
    ),
  );
}
