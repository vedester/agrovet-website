"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import type {
  AdminOrderDetail,
  AdminOrderListItem,
  AdminOrderPage,
  AdminOrderStatus,
  AdminPaymentStatus,
} from "@/lib/api/admin-orders";

const PAGE_SIZE = 12;

const ORDER_STATUSES: {
  value: AdminOrderStatus;
  label: string;
}[] = [
  { value: "pending_confirmation", label: "Pending confirmation" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rejected", label: "Rejected" },
];

const PAYMENT_STATUSES: {
  value: AdminPaymentStatus;
  label: string;
}[] = [
  { value: "unpaid", label: "Unpaid" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const TRANSITIONS: Partial<
  Record<AdminOrderStatus, { value: AdminOrderStatus; label: string }[]>
> = {
  pending_confirmation: [
    { value: "confirmed", label: "Confirm order" },
    { value: "rejected", label: "Reject order" },
    { value: "cancelled", label: "Cancel order" },
  ],
  confirmed: [
    { value: "processing", label: "Start processing" },
    { value: "cancelled", label: "Cancel order" },
  ],
  processing: [
    { value: "out_for_delivery", label: "Dispatch order" },
    { value: "cancelled", label: "Cancel order" },
  ],
  out_for_delivery: [
    { value: "delivered", label: "Mark as delivered" },
  ],
  delivered: [
    { value: "completed", label: "Complete order" },
  ],
};

function formatDate(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMoney(value: string): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "KSh —";

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();

    if (
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
    ) {
      return payload.error;
    }

    if (
      typeof payload === "object" &&
      payload !== null &&
      "detail" in payload &&
      typeof payload.detail === "string"
    ) {
      return payload.detail;
    }
  } catch {
    // The response did not contain readable JSON.
  }

  if (response.status === 401) {
    return "Your session has expired. Sign in again to continue.";
  }

  if (response.status === 403) {
    return "You are not authorized to manage orders.";
  }

  if (response.status >= 500) {
    return "The orders service is temporarily unavailable. Please try again.";
  }

  return "The request could not be completed. Check the details and try again.";
}

function StatusBadge({ status }: { status: AdminOrderStatus }) {
  const styles: Record<AdminOrderStatus, string> = {
    pending_confirmation: "bg-amber-50 text-amber-700 ring-amber-600/15",
    confirmed: "bg-blue-50 text-blue-700 ring-blue-600/15",
    processing: "bg-indigo-50 text-indigo-700 ring-indigo-600/15",
    out_for_delivery: "bg-violet-50 text-violet-700 ring-violet-600/15",
    delivered: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    completed: "bg-green-50 text-green-700 ring-green-600/15",
    cancelled: "bg-slate-100 text-slate-600 ring-slate-500/15",
    rejected: "bg-red-50 text-red-700 ring-red-600/15",
  };

  const label =
    ORDER_STATUSES.find((item) => item.value === status)?.label ?? status;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${styles[status]}`}
    >
      {label}
    </span>
  );
}

function PaymentBadge({ status }: { status: AdminPaymentStatus }) {
  const styles: Record<AdminPaymentStatus, string> = {
    unpaid: "bg-amber-50 text-amber-700",
    pending: "bg-blue-50 text-blue-700",
    paid: "bg-emerald-50 text-emerald-700",
    failed: "bg-red-50 text-red-700",
    refunded: "bg-slate-100 text-slate-600",
  };

  const label =
    PAYMENT_STATUSES.find((item) => item.value === status)?.label ?? status;

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[status]}`}
    >
      {label}
    </span>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <svg
          width="23"
          height="23"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <path d="M3 7h18l-1.5 13h-15L3 7Z" />
          <path d="M8 9V6a4 4 0 0 1 8 0v3" />
        </svg>
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function Pagination({
  page,
  count,
  onPageChange,
}: {
  page: number;
  count: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const firstItem = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, count);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500">
        Showing {firstItem}–{lastItem} of {count} orders
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <span className="min-w-20 text-center text-xs font-medium text-slate-600">
          Page {page} of {totalPages}
        </span>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function OrderRow({
  order,
  onOpen,
}: {
  order: AdminOrderListItem;
  onOpen: (order: AdminOrderListItem) => void;
}) {
  return (
    <tr className="group transition hover:bg-slate-50/80">
      <td className="px-5 py-4">
        <button
          type="button"
          onClick={() => onOpen(order)}
          className="text-left"
        >
          <span className="block text-sm font-bold text-slate-900 transition group-hover:text-emerald-700">
            {order.reference}
          </span>
          <span className="mt-1 block text-xs text-slate-500">
            {formatDate(order.created_at)}
          </span>
        </button>
      </td>

      <td className="px-5 py-4">
        <p className="max-w-52 truncate text-sm font-semibold text-slate-800">
          {order.customer_name}
        </p>
        <p className="mt-1 max-w-52 truncate text-xs text-slate-500">
          {order.customer_phone}
        </p>
      </td>

      <td className="px-5 py-4">
        <StatusBadge status={order.status} />
      </td>

      <td className="px-5 py-4">
        <p className="text-sm font-semibold text-slate-800">
          {formatMoney(order.total_amount)}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {order.item_count} {order.item_count === 1 ? "item" : "items"}
        </p>
      </td>

      <td className="px-5 py-4">
        <PaymentBadge status={order.payment_status} />
        <p className="mt-1 text-xs text-slate-500">
          {order.payment_method_label}
        </p>
      </td>

      <td className="px-5 py-4 text-right">
        <button
          type="button"
          onClick={() => onOpen(order)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
        >
          View order
          <span aria-hidden="true">→</span>
        </button>
      </td>
    </tr>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="max-w-[65%] text-right text-xs font-semibold text-slate-800">
        {value || "—"}
      </dd>
    </div>
  );
}

function OrderDetailPanel({
  order,
  loading,
  error,
  onClose,
  onTransition,
  transitionLoading,
}: {
  order: AdminOrderDetail | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onTransition: (status: AdminOrderStatus, note: string, manualStockVerified: boolean, deliveryFee?: string) => void;
  transitionLoading: boolean;
}) {
  const [note, setNote] = useState("");
  const [manualStockVerified, setManualStockVerified] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(order?.delivery_fee ?? "0.00");
  const [actionError, setActionError] = useState("");
  const [selectedTransitionValue, setSelectedTransitionValue] = useState("");

  const availableTransitions = order
    ? TRANSITIONS[order.status] ?? []
    : [];

  const selectedTransition =
    availableTransitions.find(
      (item) => item.value === selectedTransitionValue,
    ) ?? null;

  const manualItems =
    order?.items.filter((item) => !item.stock_tracked) ?? [];

  function handleTransition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!order || !selectedTransition) return;

    if (
      (selectedTransition.value === "rejected" ||
        selectedTransition.value === "cancelled") &&
      !note.trim()
    ) {
      setActionError("Enter a reason before rejecting or cancelling this order.");
      return;
    }

    let confirmedDeliveryFee: string | undefined;

    if (selectedTransition.value === "confirmed") {
      const normalizedFee = deliveryFee.trim();

      if (
        !/^\d+(\.\d{1,2})?$/.test(normalizedFee) ||
        !Number.isFinite(Number(normalizedFee)) ||
        Number(normalizedFee) < 0
      ) {
        setActionError(
          "Enter a valid delivery fee of KSh 0.00 or more, with up to two decimal places.",
        );
        return;
      }

      confirmedDeliveryFee = Number(normalizedFee).toFixed(2);
    }

    if (
      selectedTransition.value === "confirmed" &&
      manualItems.length > 0 &&
      !manualStockVerified
    ) {
      setActionError(
        "Verify the manually managed items before confirming this order.",
      );
      return;
    }

    setActionError("");
    onTransition(
      selectedTransition.value,
      note.trim(),
      manualStockVerified,
      confirmedDeliveryFee,
    );
  }



  return (
    <>
      <button
        type="button"
        aria-label="Close order details"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px]"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Order details"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-7">
          <div>
            <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">
              Order management
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              {order?.reference ?? "Order details"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={transitionLoading}
            aria-label="Close details"
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="m18 6-12 12M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="space-y-4 p-7">
              <div className="h-5 w-40 animate-pulse rounded bg-slate-100" />
              <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          )}

          {!loading && error && (
            <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && order && (
            <div className="space-y-6 p-5 sm:p-7">
              <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Current order status</p>
                    <div className="mt-2">
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Placed on</p>
                    <p className="mt-1 text-xs font-semibold text-slate-800">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-slate-900">
                  Customer and delivery
                </h3>
                <dl className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
                  <DetailRow label="Customer" value={order.customer_name} />
                  <DetailRow label="Phone" value={order.customer_phone} />
                  <DetailRow label="Email" value={order.customer_email} />
                  <DetailRow label="Delivery address" value={order.delivery_address} />
                  <DetailRow
                    label="Instructions"
                    value={order.delivery_instructions}
                  />
                </dl>
              </section>

              <section>
                <h3 className="text-sm font-bold text-slate-900">
                  Ordered items
                </h3>
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                  <div className="divide-y divide-slate-100">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-4 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">
                            {item.product_name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.sku} · {item.pack_size || "Standard pack"} · Qty {item.quantity}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {item.stock_tracked
                              ? "Numerical stock tracked"
                              : "Manual stock verification"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-slate-900">
                            {formatMoney(item.line_total)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatMoney(item.unit_price)} each
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 border-t border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Subtotal</span>
                      <span>{formatMoney(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Delivery fee</span>
                      <span>
                        {order.delivery_fee_confirmed
                          ? formatMoney(order.delivery_fee)
                          : "Awaiting confirmation"}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 text-sm font-bold text-slate-900">
                      <span>
                        {order.delivery_fee_confirmed
                          ? "Order total"
                          : "Provisional total"}
                      </span>
                      <span>{formatMoney(order.total_amount)}</span>
                    </div>
                    {!order.delivery_fee_confirmed && (
                      <p className="pt-1 text-[11px] leading-5 text-slate-500">
                        The final delivery fee and order total will be set by staff before confirmation.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-slate-900">
                  Payment information
                </h3>
                <div className="mt-3 rounded-xl border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Payment method</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {order.payment_method_label}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Payment status</p>
                      <div className="mt-1">
                        <PaymentBadge status={order.payment_status} />
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] leading-5 text-slate-500">
                    Payment status is displayed separately and is not changed by fulfilment actions.
                  </p>
                </div>
              </section>

              {(order.seller_notes || order.cancellation_reason) && (
                <section>
                  <h3 className="text-sm font-bold text-slate-900">
                    Order notes
                  </h3>
                  <div className="mt-3 space-y-3">
                    {order.seller_notes && (
                      <div className="rounded-xl border border-slate-200 p-4">
                        <p className="text-xs font-semibold text-slate-500">
                          Seller notes
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                          {order.seller_notes}
                        </p>
                      </div>
                    )}
                    {order.cancellation_reason && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                        <p className="text-xs font-semibold text-amber-800">
                          Rejection / cancellation reason
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-amber-900">
                          {order.cancellation_reason}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              <section>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Status history
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {order.status_history.length} updates
                  </span>
                </div>

                {order.status_history.length === 0 ? (
                  <p className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">
                    No status changes have been recorded yet.
                  </p>
                ) : (
                  <ol className="mt-3 space-y-0">
                    {order.status_history.map((entry, index) => (
                      <li key={entry.id} className="relative flex gap-3 pb-5">
                        {index !== order.status_history.length - 1 && (
                          <span className="absolute top-6 bottom-0 left-[9px] w-px bg-slate-200" />
                        )}
                        <span className="relative mt-1 size-[19px] shrink-0 rounded-full border-4 border-emerald-100 bg-emerald-500" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-800">
                            {entry.from_status_label} → {entry.to_status_label}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {formatDate(entry.created_at)}
                            {entry.actor_email ? ` · ${entry.actor_email}` : ""}
                          </p>
                          {entry.note && (
                            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                              {entry.note}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              {availableTransitions.length > 0 && (
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                  <h3 className="text-sm font-bold text-slate-900">
                    Update order status
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Choose the next permitted fulfilment step. This action is recorded in the order history.
                  </p>

                  <form onSubmit={handleTransition} className="mt-4 space-y-3">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Next status
                      </span>
                      <select
                        value={selectedTransition?.value ?? ""}
                        onChange={(event) => {
                          setSelectedTransitionValue(event.target.value);
                          setActionError("");
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                      >
                        <option value="">Select an action</option>
                        {availableTransitions.map((transition) => (
                          <option
                            key={transition.value}
                            value={transition.value}
                          >
                            {transition.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    {selectedTransition?.value === "confirmed" && (
                      <section className="space-y-3 rounded-xl border border-emerald-200 bg-white p-3">
                        <div>
                          <label
                            htmlFor="order-delivery-fee"
                            className="block text-xs font-semibold text-slate-800"
                          >
                            Delivery fee (KSh)
                          </label>
                          <p className="mt-1 text-[11px] leading-5 text-slate-500">
                            Enter the delivery charge agreed for this customer&apos;s location.
                          </p>
                        </div>

                        <input
                          id="order-delivery-fee"
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          required
                          value={deliveryFee}
                          onChange={(event) => {
                            setDeliveryFee(event.target.value);
                            setActionError("");
                          }}
                          placeholder="e.g. 250.00"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                        />

                        <div className="space-y-2 rounded-lg bg-emerald-50/70 p-3">
                          <div className="flex justify-between text-xs text-slate-600">
                            <span>Products subtotal</span>
                            <span>{formatMoney(order?.subtotal ?? "0")}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-600">
                            <span>Delivery fee</span>
                            <span>
                              {deliveryFee.trim() !== "" &&
                              Number.isFinite(Number(deliveryFee)) &&
                              Number(deliveryFee) >= 0
                                ? formatMoney(Number(deliveryFee).toFixed(2))
                                : "Enter a valid fee"}
                            </span>
                          </div>
                          <div className="flex justify-between border-t border-emerald-200 pt-2 text-sm font-bold text-emerald-900">
                            <span>Customer total</span>
                            <span>
                              {deliveryFee.trim() !== "" &&
                              Number.isFinite(Number(deliveryFee)) &&
                              Number(deliveryFee) >= 0 &&
                              order
                                ? formatMoney(
                                    (
                                      Number(order.subtotal) +
                                      Number(deliveryFee)
                                    ).toFixed(2),
                                  )
                                : "—"}
                            </span>
                          </div>
                        </div>
                      </section>
                    )}

                    {selectedTransition &&
                      (selectedTransition.value === "rejected" ||
                        selectedTransition.value === "cancelled" ||
                        selectedTransition.value === "confirmed" ||
                        selectedTransition.value === "processing" ||
                        selectedTransition.value === "out_for_delivery") && (
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                            {selectedTransition.value === "rejected" ||
                            selectedTransition.value === "cancelled"
                              ? "Reason (required)"
                              : "Internal note (optional)"}
                          </span>
                          <textarea
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            rows={3}
                            maxLength={2000}
                            required={
                              selectedTransition.value === "rejected" ||
                              selectedTransition.value === "cancelled"
                            }
                            placeholder={
                              selectedTransition.value === "rejected"
                                ? "Explain why this order is being rejected..."
                                : selectedTransition.value === "cancelled"
                                  ? "Explain why this order is being cancelled..."
                                  : "Add an internal fulfilment note..."
                            }
                            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                          />
                        </label>
                      )}

                    {selectedTransition?.value === "confirmed" &&
                      manualItems.length > 0 && (
                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <input
                            type="checkbox"
                            checked={manualStockVerified}
                            onChange={(event) =>
                              setManualStockVerified(event.target.checked)
                            }
                            className="mt-0.5 size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-xs leading-5 text-amber-900">
                            <strong>Manual stock verified.</strong> I have physically checked availability for{" "}
                            {manualItems.map((item) => item.product_name).join(", ")}.
                          </span>
                        </label>
                      )}

                    {selectedTransition && (
                      <div className="rounded-lg bg-white/80 px-3 py-2 text-[11px] leading-5 text-slate-500">
                        {selectedTransition.value === "confirmed"
                          ? "Tracked stock will be reserved. Manual stock must be verified where applicable."
                          : selectedTransition.value === "delivered"
                            ? "Tracked stock will be deducted from physical inventory."
                            : selectedTransition.value === "rejected" ||
                                selectedTransition.value === "cancelled"
                              ? "Any active stock reservations will be released."
                              : "The order status will be updated and recorded in its history."}
                      </div>
                    )}

                    {actionError && (
                      <p role="alert" className="text-xs font-medium text-red-700">
                        {actionError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={!selectedTransition || transitionLoading}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {transitionLoading
                        ? "Updating order..."
                        : selectedTransition?.label ?? "Select an action"}
                    </button>
                  </form>
                </section>
              )}

              {availableTransitions.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">
                    No further fulfilment actions
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    This order is in a final status. Its history and details remain available for reference.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default function OrderManagement() {
  const [orderPage, setOrderPage] = useState<AdminOrderPage | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AdminOrderStatus | "all">("all");
  const [paymentStatus, setPaymentStatus] = useState<
    AdminPaymentStatus | "all"
  >("all");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedOrder, setSelectedOrder] =
    useState<AdminOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const refreshOrders = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setPageError("");

      try {
        const response = await fetch("/api/admin/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
          body: JSON.stringify({
            page,
            pageSize: PAGE_SIZE,
            search: search.trim(),
            status,
            paymentStatus,
          }),
        });

        if (!response.ok) {
          throw new Error(await getErrorMessage(response));
        }

        const payload = (await response.json()) as AdminOrderPage;

        if (active) {
          setOrderPage(payload);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;

        if (active) {
          setPageError(
            error instanceof Error
              ? error.message
              : "Unable to load orders. Please try again.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [page, search, status, paymentStatus, refreshKey]);

  async function openOrder(order: AdminOrderListItem) {
    setSelectedOrder(null);
    setDetailError("");
    setDetailLoading(true);

    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const payload = (await response.json()) as AdminOrderDetail;
      setSelectedOrder(payload);
    } catch (error) {
      setDetailError(
        error instanceof Error
          ? error.message
          : "Unable to load order details.",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleTransition(
    nextStatus: AdminOrderStatus,
    note: string,
    manualStockVerified: boolean,
    deliveryFee?: string,
  ) {
    if (!selectedOrder) return;

    setTransitionLoading(true);
    setDetailError("");

    try {
      const response = await fetch(
        `/api/admin/orders/${selectedOrder.id}/transition`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({
            to_status: nextStatus,
            note,
            manual_stock_verified: manualStockVerified,
            ...(nextStatus === "confirmed" && deliveryFee !== undefined
              ? { delivery_fee: deliveryFee }
              : {}),
          }),
        },
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const payload = (await response.json()) as {
        detail: string;
        order: AdminOrderDetail;
      };

      setSelectedOrder(payload.order);
      setSuccessMessage(payload.detail);
      refreshOrders();
    } catch (error) {
      setDetailError(
        error instanceof Error
          ? error.message
          : "Unable to update this order. Please try again.",
      );
    } finally {
      setTransitionLoading(false);
    }
  }

  const orderCount = orderPage?.count ?? 0;

  const summary = useMemo(() => {
    const results = orderPage?.results ?? [];

    return {
      pending: results.filter(
        (order) => order.status === "pending_confirmation",
      ).length,
      active: results.filter((order) =>
        ["confirmed", "processing", "out_for_delivery"].includes(order.status),
      ).length,
      completed: results.filter((order) => order.status === "completed").length,
    };
  }, [orderPage]);

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-emerald-700 uppercase">
            Sales workspace
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Orders
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Review customer purchases, manage fulfilment and follow each order through to completion.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSuccessMessage("");
            refreshOrders();
          }}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M20 7v5h-5M4 17v-5h5" />
            <path d="M5.6 9a7 7 0 0 1 11.9-2L20 12M4 12l2.5 5a7 7 0 0 0 11.9-2" />
          </svg>
          Refresh orders
        </button>
      </div>

      {successMessage && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            aria-label="Dismiss success message"
            className="font-semibold"
          >
            ×
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">
            Pending on this page
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {summary.pending}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Awaiting seller confirmation
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">
            In fulfilment on this page
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {summary.active}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Confirmed, processing or dispatched
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">
            Total matching orders
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {orderCount}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Based on the current filters
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Order register
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Search and filter customer orders.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:flex">
              <label className="relative block sm:col-span-2 xl:w-72">
                <span className="sr-only">Search orders</span>
                <svg
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search reference, customer or phone..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-3 pl-9 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                />
              </label>

              <label>
                <span className="sr-only">Filter by order status</span>
                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as AdminOrderStatus | "all");
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500 sm:min-w-44"
                >
                  <option value="all">All order statuses</option>
                  {ORDER_STATUSES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="sr-only">Filter by payment status</span>
                <select
                  value={paymentStatus}
                  onChange={(event) => {
                    setPaymentStatus(
                      event.target.value as AdminPaymentStatus | "all",
                    );
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500 sm:min-w-40"
                >
                  <option value="all">All payment statuses</option>
                  {PAYMENT_STATUSES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>

        {pageError && (
          <div className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p>{pageError}</p>
            <button
              type="button"
              onClick={refreshOrders}
              className="mt-2 text-xs font-bold underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50/80">
              <tr className="border-b border-slate-100">
                {[
                  "Order",
                  "Customer",
                  "Order status",
                  "Amount",
                  "Payment",
                  "",
                ].map((heading, index) => (
                  <th
                    key={`${heading}-${index}`}
                    className="px-5 py-3 text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 6 }).map((__, cell) => (
                      <td key={cell} className="px-5 py-5">
                        <div className="h-4 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!loading &&
                !pageError &&
                orderPage?.results.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onOpen={openOrder}
                  />
                ))}
            </tbody>
          </table>
        </div>

        {!loading &&
          !pageError &&
          orderPage?.results.length === 0 && (
            <EmptyState
              title="No orders found"
              description="There are no orders matching these filters. Try a different search or clear one of the filters."
            />
          )}

        {orderPage && !pageError && (
          <Pagination
            page={page}
            count={orderPage.count}
            onPageChange={setPage}
          />
        )}
      </section>

      {(selectedOrder || detailLoading || detailError) && (
        <OrderDetailPanel
          key={
            selectedOrder
              ? `${selectedOrder.id}:${selectedOrder.status}`
              : "order-details-loading"
          }
          order={selectedOrder}
          loading={detailLoading}
          error={detailError}
          onClose={() => {
            if (transitionLoading) return;
            setSelectedOrder(null);
            setDetailError("");
          }}
          onTransition={handleTransition}
          transitionLoading={transitionLoading}
        />
      )}
    </div>
  );
}
