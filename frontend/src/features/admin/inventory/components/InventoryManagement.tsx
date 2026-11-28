"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

import type {
  InventoryMovement,
  InventoryMovementPage,
  InventoryProduct,
  InventoryProductPage,
} from "@/lib/api/admin-inventory";

type StockStatus =
  | "all"
  | "tracked"
  | "manual"
  | "out_of_stock"
  | "low_stock";

type InventoryTab = "stock" | "movements";
type StockAction = "restock" | "adjust";

const PRODUCT_PAGE_SIZE = 12;
const MOVEMENT_PAGE_SIZE = 10;

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDelta(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
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
    return "You are not authorized to manage inventory.";
  }

  if (response.status >= 500) {
    return "The inventory service is temporarily unavailable. Please try again.";
  }

  return "The request could not be completed. Please check your entries and try again.";
}

function StatusBadge({ product }: { product: InventoryProduct }) {
  if (!product.stock_tracked) {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
        Manual
      </span>
    );
  }

  if (product.available_quantity === 0) {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
        Out of stock
      </span>
    );
  }

  if (
    product.available_quantity !== null &&
    product.available_quantity <= 5
  ) {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        Low stock
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      In stock
    </span>
  );
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
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
          <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z" />
          <path d="M3.5 7.8 12 12l8.5-4.2M12 12v9" />
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
  pageSize,
  count,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  count: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const firstItem = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, count);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500">
        Showing {firstItem}–{lastItem} of {count}
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

export default function InventoryManagement() {
  const [productPage, setProductPage] = useState<InventoryProductPage | null>(
    null,
  );
  const [movementPageData, setMovementPageData] =
    useState<InventoryMovementPage | null>(null);

  const [search, setSearch] = useState("");
  const [stockStatus, setStockStatus] = useState<StockStatus>("all");
  const [productPageNumber, setProductPageNumber] = useState(1);
  const [movementPageNumber, setMovementPageNumber] = useState(1);
  const [activeTab, setActiveTab] = useState<InventoryTab>("stock");

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [pageError, setPageError] = useState("");
  const [movementError, setMovementError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [selectedProduct, setSelectedProduct] =
    useState<InventoryProduct | null>(null);
  const [stockAction, setStockAction] = useState<StockAction>("restock");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [savingAction, setSavingAction] = useState(false);
  const [actionError, setActionError] = useState("");
  const [trackingProductId, setTrackingProductId] = useState<number | null>(
    null,
  );

  const [refreshKey, setRefreshKey] = useState(0);

  const refreshInventory = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  // ---------------------------------------------------------------------------
  // Product inventory
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const timer = window.setTimeout(async () => {
      setLoadingProducts(true);
      setPageError("");

      try {
        const response = await fetch("/api/admin/inventory/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
          body: JSON.stringify({
            page: productPageNumber,
            pageSize: PRODUCT_PAGE_SIZE,
            search: search.trim(),
            ...(stockStatus !== "all" ? { stockStatus } : {}),
          }),
        });

        if (!response.ok) {
          throw new Error(await getErrorMessage(response));
        }

        const payload = (await response.json()) as InventoryProductPage;

        if (active) {
          setProductPage(payload);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        if (active) {
          setPageError(
            error instanceof Error
              ? error.message
              : "Unable to load inventory. Please try again.",
          );
        }
      } finally {
        if (active) {
          setLoadingProducts(false);
        }
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [productPageNumber, search, stockStatus, refreshKey]);

  // ---------------------------------------------------------------------------
  // Movement history
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (activeTab !== "movements") {
      return;
    }

    const controller = new AbortController();
    let active = true;

    async function loadMovements() {
      setLoadingMovements(true);
      setMovementError("");

      try {
        const response = await fetch("/api/admin/inventory/movements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
          body: JSON.stringify({
            page: movementPageNumber,
            pageSize: MOVEMENT_PAGE_SIZE,
          }),
        });

        if (!response.ok) {
          throw new Error(await getErrorMessage(response));
        }

        const payload = (await response.json()) as InventoryMovementPage;

        if (active) {
          setMovementPageData(payload);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        if (active) {
          setMovementError(
            error instanceof Error
              ? error.message
              : "Unable to load movement history.",
          );
        }
      } finally {
        if (active) {
          setLoadingMovements(false);
        }
      }
    }

    void loadMovements();

    return () => {
      active = false;
      controller.abort();
    };
  }, [activeTab, movementPageNumber, refreshKey]);

  // ---------------------------------------------------------------------------
  // Restock and adjustment actions
  // ---------------------------------------------------------------------------

  function openStockAction(
    product: InventoryProduct,
    action: StockAction,
  ) {
    setSelectedProduct(product);
    setStockAction(action);
    setQuantity("");
    setReason("");
    setActionError("");
    setSuccessMessage("");
  }

  function closeStockAction() {
    if (savingAction) return;

    setSelectedProduct(null);
    setQuantity("");
    setReason("");
    setActionError("");
  }

  async function submitStockAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProduct) return;

    const parsedQuantity = Number(quantity);

    if (
      !Number.isSafeInteger(parsedQuantity) ||
      (stockAction === "restock" && parsedQuantity <= 0) ||
      (stockAction === "adjust" && parsedQuantity === 0)
    ) {
      setActionError(
        stockAction === "restock"
          ? "Enter a whole number greater than zero."
          : "Enter a non-zero whole number. Use a negative number to remove units.",
      );
      return;
    }

    if (!reason.trim()) {
      setActionError("Provide a reason for this stock movement.");
      return;
    }

    setSavingAction(true);
    setActionError("");

    try {
      const response = await fetch(
        `/api/admin/inventory/products/${selectedProduct.id}/${stockAction}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify(
            stockAction === "restock"
              ? { quantity: parsedQuantity, reason: reason.trim() }
              : { quantity_delta: parsedQuantity, reason: reason.trim() },
          ),
        },
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setSuccessMessage(
        stockAction === "restock"
          ? `Successfully recorded ${parsedQuantity} units received for ${selectedProduct.name}.`
          : `Successfully recorded a stock adjustment of ${formatDelta(parsedQuantity)} units for ${selectedProduct.name}.`,
      );

      setSelectedProduct(null);
      setQuantity("");
      setReason("");
      setProductPageNumber(1);
      setMovementPageNumber(1);
      refreshInventory();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to save the stock movement. Please try again.",
      );
    } finally {
      setSavingAction(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Stock tracking
  // ---------------------------------------------------------------------------

  async function toggleStockTracking(product: InventoryProduct) {
    const nextValue = !product.stock_tracked;

    const confirmation = nextValue
      ? `Enable stock tracking for "${product.name}"? Its opening stock quantity will be zero. You will need to record the units currently available using Restock.`
      : `Disable stock tracking for "${product.name}"? This is only allowed when its physical stock and active reservations are both zero.`;

    if (!window.confirm(confirmation)) {
      return;
    }

    setTrackingProductId(product.id);
    setPageError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `/api/admin/inventory/products/${product.id}/tracking`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({ stock_tracked: nextValue }),
        },
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setSuccessMessage(
        nextValue
          ? `Stock tracking enabled for ${product.name}. Record its opening stock using Restock.`
          : `Stock tracking disabled for ${product.name}.`,
      );

      refreshInventory();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to update stock tracking. Please try again.",
      );
    } finally {
      setTrackingProductId(null);
    }
  }

  const products = productPage?.results ?? [];
  const movements = movementPageData?.results ?? [];

  const trackedOnPage = products.filter(
    (product) => product.stock_tracked,
  ).length;

  const lowStockOnPage = products.filter(
    (product) =>
      product.stock_tracked &&
      product.available_quantity !== null &&
      product.available_quantity > 0 &&
      product.available_quantity <= 5,
  ).length;

  const outOfStockOnPage = products.filter(
    (product) =>
      product.stock_tracked && product.available_quantity === 0,
  ).length;

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-emerald-700 uppercase">
            <span className="size-2 rounded-full bg-emerald-500" />
            Store operations
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Inventory management
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Monitor product quantities, record incoming stock, make adjustments,
            and review your inventory movement history.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshInventory}
          disabled={loadingProducts || loadingMovements}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50 sm:self-auto"
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
            <path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Feedback */}
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
            className="font-bold text-emerald-700 hover:text-emerald-950"
          >
            ×
          </button>
        </div>
      )}

      {pageError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <span>{pageError}</span>
          <button
            type="button"
            onClick={() => setPageError("")}
            aria-label="Dismiss error message"
            className="font-bold text-red-700 hover:text-red-950"
          >
            ×
          </button>
        </div>
      )}

      {/* Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Products in catalogue"
          value={productPage?.count ?? "—"}
          description="Total products returned by the inventory service"
        />
        <MetricCard
          label="Tracked on this page"
          value={trackedOnPage}
          description="Products with automatic stock tracking"
        />
        <MetricCard
          label="Low stock on this page"
          value={lowStockOnPage}
          description="Tracked products with 1–5 available units"
        />
        <MetricCard
          label="Out of stock on this page"
          value={outOfStockOnPage}
          description="Tracked products with no available units"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("stock")}
          className={`border-b-2 px-1 pb-3 text-sm font-semibold transition ${
            activeTab === "stock"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Stock overview
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("movements")}
          className={`border-b-2 px-1 pb-3 text-sm font-semibold transition ${
            activeTab === "movements"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Movement history
        </button>
      </div>

      {/* Stock overview */}
      {activeTab === "stock" && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Product stock levels
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Physical stock, reserved quantities, and customer-available units.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <svg
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                  width="17"
                  height="17"
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
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setProductPageNumber(1);
                  }}
                  placeholder="Search name, SKU or brand"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-3 pl-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 sm:w-64"
                />
              </div>

              <select
                value={stockStatus}
                onChange={(event) => {
                  setStockStatus(event.target.value as StockStatus);
                  setProductPageNumber(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
              >
                <option value="all">All stock statuses</option>
                <option value="tracked">Tracked inventory</option>
                <option value="manual">Manual availability</option>
                <option value="low_stock">Low stock</option>
                <option value="out_of_stock">Out of stock</option>
              </select>
            </div>
          </div>

          {loadingProducts && !productPage ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              Loading inventory…
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              title="No inventory products found"
              description={
                search || stockStatus !== "all"
                  ? "Try changing your search or stock-status filter."
                  : "Products will appear here when they are available in your catalogue."
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    <tr>
                      <th className="px-5 py-3.5">Product</th>
                      <th className="px-4 py-3.5">Physical stock</th>
                      <th className="px-4 py-3.5">Reserved</th>
                      <th className="px-4 py-3.5">Available</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {products.map((product) => (
                      <tr
                        key={product.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {product.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {product.sku || "No SKU"}
                            {product.brand ? ` · ${product.brand}` : ""}
                            {product.pack_size ? ` · ${product.pack_size}` : ""}
                          </p>
                        </td>

                        <td className="px-4 py-4 font-semibold tabular-nums text-slate-800">
                          {product.stock_tracked
                            ? product.stock_quantity
                            : "—"}
                        </td>

                        <td className="px-4 py-4 tabular-nums text-slate-600">
                          {product.stock_tracked
                            ? product.reserved_quantity
                            : "—"}
                        </td>

                        <td className="px-4 py-4">
                          {product.stock_tracked ? (
                            <span className="font-semibold tabular-nums text-slate-900">
                              {product.available_quantity}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">
                              Confirm manually
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge product={product} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {product.stock_tracked && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    openStockAction(product, "restock")
                                  }
                                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                                >
                                  Restock
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openStockAction(product, "adjust")
                                  }
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                                >
                                  Adjust
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() => void toggleStockTracking(product)}
                              disabled={trackingProductId === product.id}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-50"
                            >
                              {trackingProductId === product.id
                                ? "Updating…"
                                : product.stock_tracked
                                  ? "Disable tracking"
                                  : "Enable tracking"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={productPageNumber}
                pageSize={PRODUCT_PAGE_SIZE}
                count={productPage?.count ?? 0}
                onPageChange={setProductPageNumber}
              />
            </>
          )}
        </section>
      )}

      {/* Movement history */}
      {activeTab === "movements" && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-semibold text-slate-900">
              Inventory movement history
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              An audit trail of restocks, adjustments, reservations, releases,
              and stock consumption.
            </p>
          </div>

          {movementError && (
            <div
              role="alert"
              className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {movementError}
            </div>
          )}

          {loadingMovements && !movementPageData ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              Loading movement history…
            </div>
          ) : movements.length === 0 ? (
            <EmptyState
              title="No stock movements yet"
              description="Recorded restocks, adjustments, and order-related stock movements will appear here."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    <tr>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-4 py-3.5">Product</th>
                      <th className="px-4 py-3.5">Movement</th>
                      <th className="px-4 py-3.5">Physical change</th>
                      <th className="px-4 py-3.5">Before → after</th>
                      <th className="px-4 py-3.5">Reason</th>
                      <th className="px-5 py-3.5">Recorded by</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {movements.map((movement: InventoryMovement) => (
                      <tr key={movement.id} className="hover:bg-slate-50/70">
                        <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                          {formatDate(movement.created_at)}
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">
                            {movement.product_name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {movement.product_sku || "No SKU"}
                          </p>
                          {movement.order_reference && (
                            <p className="mt-1 text-xs text-emerald-700">
                              Order {movement.order_reference}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4 text-slate-700">
                          {movement.movement_type_label}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`font-semibold tabular-nums ${
                              movement.physical_quantity_delta > 0
                                ? "text-emerald-700"
                                : movement.physical_quantity_delta < 0
                                  ? "text-red-700"
                                  : "text-slate-500"
                            }`}
                          >
                            {formatDelta(movement.physical_quantity_delta)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-xs tabular-nums text-slate-600">
                          {movement.physical_quantity_before} →{" "}
                          <span className="font-semibold text-slate-900">
                            {movement.physical_quantity_after}
                          </span>
                        </td>

                        <td className="max-w-64 px-4 py-4 text-xs leading-5 text-slate-600">
                          {movement.reason || "—"}
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-500">
                          {movement.actor_email || "System"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={movementPageNumber}
                pageSize={MOVEMENT_PAGE_SIZE}
                count={movementPageData?.count ?? 0}
                onPageChange={setMovementPageNumber}
              />
            </>
          )}
        </section>
      )}

      {/* Restock / adjustment dialog */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeStockAction();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="stock-action-title"
            className="my-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.14em] text-emerald-700 uppercase">
                  Inventory operation
                </p>
                <h2
                  id="stock-action-title"
                  className="mt-2 text-xl font-bold text-slate-950"
                >
                  {stockAction === "restock"
                    ? "Record restock"
                    : "Adjust stock"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedProduct.name}
                </p>
              </div>

              <button
                type="button"
                onClick={closeStockAction}
                disabled={savingAction}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
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

            <div className="mt-5 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-4">
              <div>
                <p className="text-xs text-slate-500">Physical</p>
                <p className="mt-1 font-bold tabular-nums text-slate-900">
                  {selectedProduct.stock_quantity}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Reserved</p>
                <p className="mt-1 font-bold tabular-nums text-slate-900">
                  {selectedProduct.reserved_quantity}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Available</p>
                <p className="mt-1 font-bold tabular-nums text-slate-900">
                  {selectedProduct.available_quantity}
                </p>
              </div>
            </div>

            <form onSubmit={submitStockAction} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="stock-quantity"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  {stockAction === "restock"
                    ? "Units received"
                    : "Quantity adjustment"}
                </label>

                <input
                  id="stock-quantity"
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min={stockAction === "restock" ? 1 : undefined}
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder={
                    stockAction === "restock"
                      ? "Enter units received"
                      : "e.g. -3 or 5"
                  }
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                />

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {stockAction === "restock"
                    ? "Enter the number of new units added to the shop."
                    : "Use a positive number to add units or a negative number to remove units. Reserved units cannot be removed."}
                </p>
              </div>

              <div>
                <label
                  htmlFor="stock-reason"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Reason for this movement
                </label>

              <textarea
                id="stock-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                maxLength={255}
                required
                placeholder={
                  stockAction === "restock"
                    ? "e.g. New supplier delivery received"
                    : "e.g. Damaged units removed after stock count"
                }
                className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
              />
              <p className="mt-1 text-right text-xs text-slate-500">
                {reason.length}/255 characters
              </p>
              </div>

              {actionError && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                >
                  {actionError}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeStockAction}
                  disabled={savingAction}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingAction}
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {savingAction
                    ? "Saving…"
                    : stockAction === "restock"
                      ? "Record restock"
                      : "Record adjustment"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
