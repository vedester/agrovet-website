import "server-only";

import { z } from "zod";

import { getBackendOrigin } from "@/config/backend";
import { withAdminAccessToken } from "@/lib/api/admin-session";
import { ApiError } from "@/lib/api/errors";

const ORDERS_PATH = "/api/v1/admin/orders/";
const TIMEOUT_MS = 8_000;

const decimalSchema = z.string();

export const orderStatusSchema = z.enum([
  "pending_confirmation",
  "confirmed",
  "processing",
  "out_for_delivery",
  "delivered",
  "completed",
  "cancelled",
  "rejected",
]);

export const paymentStatusSchema = z.enum([
  "unpaid",
  "pending",
  "paid",
  "failed",
  "refunded",
]);

export const paymentMethodSchema = z.enum([
  "mpesa",
  "cash_on_delivery",
]);

export const adminOrderListItemSchema = z.object({
  id: z.number(),
  reference: z.string(),
  customer_name: z.string(),
  customer_email: z.string(),
  customer_phone: z.string(),
  status: orderStatusSchema,
  status_label: z.string(),
  payment_method: paymentMethodSchema,
  payment_method_label: z.string(),
  payment_status: paymentStatusSchema,
  payment_status_label: z.string(),
  subtotal: decimalSchema,
  delivery_fee: decimalSchema,
  delivery_fee_confirmed: z.boolean(),
  total_amount: decimalSchema,
  item_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const adminOrderItemSchema = z.object({
  id: z.number(),
  product: z.number().nullable(),
  product_name: z.string(),
  sku: z.string(),
  pack_size: z.string(),
  quantity: z.number(),
  unit_price: decimalSchema,
  line_total: decimalSchema,
  stock_tracked: z.boolean(),
});

export const adminOrderStatusHistorySchema = z.object({
  id: z.number(),
  from_status: z.union([orderStatusSchema, z.literal("")]),
  from_status_label: z.string(),
  to_status: orderStatusSchema,
  to_status_label: z.string(),
  actor_email: z.string().nullable(),
  note: z.string(),
  created_at: z.string(),
});

export const adminOrderDetailSchema = adminOrderListItemSchema.omit({ item_count: true }).extend({
  customer: z.number().nullable(),
  delivery_address: z.string(),
  delivery_instructions: z.string(),
  seller_notes: z.string(),
  cancellation_reason: z.string(),
  confirmed_by: z.number().nullable(),
  confirmed_by_email: z.string().nullable(),
  confirmed_at: z.string().nullable(),
  delivered_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  items: z.array(adminOrderItemSchema),
  status_history: z.array(adminOrderStatusHistorySchema),
});

export const adminOrderPageSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(adminOrderListItemSchema),
});

const transitionResponseSchema = z.object({
  detail: z.string(),
  order: adminOrderDetailSchema,
});

export type AdminOrderStatus = z.infer<typeof orderStatusSchema>;
export type AdminPaymentStatus = z.infer<typeof paymentStatusSchema>;
export type AdminPaymentMethod = z.infer<typeof paymentMethodSchema>;
export type AdminOrderListItem = z.infer<typeof adminOrderListItemSchema>;
export type AdminOrderItem = z.infer<typeof adminOrderItemSchema>;
export type AdminOrderStatusHistory = z.infer<
  typeof adminOrderStatusHistorySchema
>;
export type AdminOrderDetail = z.infer<typeof adminOrderDetailSchema>;
export type AdminOrderPage = z.infer<typeof adminOrderPageSchema>;

export type AdminOrderQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: AdminOrderStatus | "all";
  paymentStatus?: AdminPaymentStatus | "all";
};

export type OrderTransitionInput = {
  to_status: AdminOrderStatus;
  note?: string;
  manual_stock_verified?: boolean;
  delivery_fee?: string;
};

async function requestOrdersBackend<T>(
  path: string,
  accessToken: string,
  schema: z.ZodType<T>,
  params: Record<string, string | number | undefined> = {},
  options: {
    method?: "GET" | "POST";
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
      "The orders service could not be reached.",
      { cause },
    );
  }

  if (!response.ok) {
    throw new ApiError(
      "http",
      path,
      "The orders request was rejected.",
      {
        status: response.status,
        responseBody: await response.text(),
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
      "The orders service returned invalid JSON.",
      { cause },
    );
  }

  const result = schema.safeParse(payload);

  if (!result.success) {
    console.error(
      "Orders response schema validation failed:",
      JSON.stringify(result.error.issues, null, 2),
    );

    throw new ApiError(
      "bad_response",
      path,
      "The orders service returned an unexpected response.",
    );
  }

  return result.data;
}

export async function getAdminOrders(
  query: AdminOrderQuery = {},
): Promise<AdminOrderPage> {
  const path = ORDERS_PATH;

  return withAdminAccessToken(path, (accessToken) =>
    requestOrdersBackend(path, accessToken, adminOrderPageSchema, {
      page: query.page,
      page_size: query.pageSize,
      search: query.search,
      status: query.status === "all" ? undefined : query.status,
      payment_status:
        query.paymentStatus === "all" ? undefined : query.paymentStatus,
    }),
  );
}

export async function getAdminOrder(
  orderId: number,
): Promise<AdminOrderDetail> {
  const path = `${ORDERS_PATH}${orderId}/`;

  return withAdminAccessToken(path, (accessToken) =>
    requestOrdersBackend(path, accessToken, adminOrderDetailSchema),
  );
}

export async function transitionAdminOrder(
  orderId: number,
  input: OrderTransitionInput,
): Promise<{ detail: string; order: AdminOrderDetail }> {
  const path = `${ORDERS_PATH}${orderId}/transition/`;

  return withAdminAccessToken(path, (accessToken) =>
    requestOrdersBackend(path, accessToken, transitionResponseSchema, {}, {
      method: "POST",
      body: input,
    }),
  );
}
