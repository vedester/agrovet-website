// Directory: frontend/src/features/admin/catalog/components/ProductManagement.tsx

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";

import type { AdminCategory, AdminProduct, AdminProductPage } from "@/lib/api/admin-catalog";

const PAGE_SIZE = 12;

type StockFilter = "all" | "in" | "out";
type VisibilityFilter = "all" | "active" | "inactive";

function formatPrice(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(amount);
}

function ProductAvatar({ product }: { product: AdminProduct }) {
  const initials = product.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  const image = product.images[0]?.image;

  if (image) {
    return (
      <Image
        src={image}
        alt=""
        width={48}
        height={48}
        unoptimized
        className="h-12 w-12 rounded-xl object-cover"
      />
    );
  }

  return (
    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-sm font-bold text-emerald-700">
      {initials || "P"}
    </div>
  );
}

function StatusBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      <span className={`size-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />
      {label}
    </span>
  );
}

function EmptyState({ searching }: { searching: boolean }) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
        {searching ? "⌕" : "▤"}
      </div>

      <h3 className="mt-4 text-base font-bold text-slate-900">
        {searching ? "No matching products" : "No products yet"}
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
        {searching
          ? "Try changing your search or filters to find the products you need."
          : "Products added to your catalogue will appear here."}
      </p>
    </div>
  );
}

export default function ProductManagement() {
  const [products, setProducts] = useState<AdminProductPage | null>(null);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState<StockFilter>("all");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [pendingDeletion, setPendingDeletion] = useState<AdminProduct | null>(null);
  const [mutatingProductId, setMutatingProductId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      try {
        const response = await fetch("/api/admin/catalog/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
          body: JSON.stringify({ isActive: true }),
        });

        if (!response.ok) {
          throw new Error("Unable to load product categories.");
        }

        const data: AdminCategory[] = await response.json();
        setCategories(data);
      } catch (cause) {
        if (cause instanceof Error && cause.name !== "AbortError") {
          setError(cause.message);
        }
      }
    }

    void loadCategories();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/admin/catalog/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
          body: JSON.stringify({
            page,
            pageSize: PAGE_SIZE,
            search: search.trim() || undefined,
            category: category || undefined,
            inStock: stock === "all" ? undefined : stock === "in",
            isActive: visibility === "all" ? undefined : visibility === "active",
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load products.");
        }

        setProducts(data as AdminProductPage);
      } catch (cause) {
        if (cause instanceof Error && cause.name !== "AbortError") {
          setError(cause.message);
          setProducts(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [page, search, category, stock, visibility, refreshKey]);

  const totalPages = Math.max(1, Math.ceil((products?.count ?? 0) / PAGE_SIZE));

  function resetFilters() {
    setSearch("");
    setCategory("");
    setStock("all");
    setVisibility("all");
    setPage(1);
  }

  const hasFilters =
    search.trim() !== "" || category !== "" || stock !== "all" || visibility !== "all";

  async function handleVisibilityToggle(product: AdminProduct) {
    setMutatingProductId(product.id);
    setActionError("");
    setActionSuccess("");

    try {
      const response = await fetch(`/api/admin/catalog/products/${product.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          is_active: !product.is_active,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Unable to update product visibility.");
      }

      setActionSuccess(
        product.is_active
          ? `"${product.name}" has been deactivated.`
          : `"${product.name}" has been published.`,
      );

      setRefreshKey((current) => current + 1);
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Unable to update product visibility.",
      );
    } finally {
      setMutatingProductId(null);
    }
  }

  async function handleDeleteProduct() {
    if (!pendingDeletion) {
      return;
    }

    const product = pendingDeletion;

    setMutatingProductId(product.id);
    setActionError("");
    setActionSuccess("");

    try {
      const response = await fetch(`/api/admin/catalog/products/${product.id}`, {
        method: "DELETE",
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Unable to delete this product.");
      }

      setPendingDeletion(null);
      setActionSuccess(`"${product.name}" was permanently deleted.`);

      // If this was the only product on the current page, move back one page.
      if (products?.results.length === 1 && page > 1) {
        setPage((current) => Math.max(1, current - 1));
      }

      setRefreshKey((current) => current + 1);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to delete this product.");
    } finally {
      setMutatingProductId(null);
    }
  }
  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase">
            Catalogue management
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Products</h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Manage product information, pricing, availability and storefront visibility.
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        >
          <span className="text-lg leading-none">+</span>
          Add product
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Total products</p>
          <p className="mt-2 text-2xl font-bold text-slate-950 tabular-nums">
            {loading && !products ? "—" : (products?.count ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Matching your current filters</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Categories available</p>
          <p className="mt-2 text-2xl font-bold text-slate-950 tabular-nums">{categories.length}</p>
          <p className="mt-1 text-xs text-slate-400">Active catalogue categories</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Current page</p>
          <p className="mt-2 text-2xl font-bold text-slate-950 tabular-nums">
            {products ? `${page} / ${totalPages}` : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-400">{PAGE_SIZE} products per page</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h3 className="text-base font-bold text-slate-900">Product catalogue</h3>
              <p className="mt-1 text-sm text-slate-500">Search and organise your inventory.</p>
            </div>

            {products && (
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {products.count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
                  {"–"}
                  {Math.min(page * PAGE_SIZE, products.count)}
                </span>{" "}
                of <span className="font-semibold text-slate-900">{products.count}</span>
              </p>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="relative sm:col-span-2 xl:col-span-1">
              <span className="sr-only">Search products</span>
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-lg text-slate-400">
                ⌕
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search name, SKU or brand..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-10 text-sm text-slate-800 transition outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/10"
              />
            </label>

            <label>
              <span className="sr-only">Filter by category</span>
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setPage(1);
                }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/10"
              >
                <option value="">All categories</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="sr-only">Filter by stock availability</span>
              <select
                value={stock}
                onChange={(event) => {
                  setStock(event.target.value as StockFilter);
                  setPage(1);
                }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/10"
              >
                <option value="all">All stock statuses</option>
                <option value="in">In stock</option>
                <option value="out">Out of stock</option>
              </select>
            </label>

            <label>
              <span className="sr-only">Filter by visibility</span>
              <select
                value={visibility}
                onChange={(event) => {
                  setVisibility(event.target.value as VisibilityFilter);
                  setPage(1);
                }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/10"
              >
                <option value="all">All visibility</option>
                <option value="active">Published</option>
                <option value="inactive">Hidden</option>
              </select>
            </label>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 text-xs font-semibold text-emerald-700 transition hover:text-emerald-800"
            >
              Clear all filters
            </button>
          )}
        </div>

        {actionSuccess && (
          <div
            role="status"
            className="mx-5 mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {actionSuccess}
          </div>
        )}

        {actionError && (
          <div
            role="alert"
            className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {actionError}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
            <button
              type="button"
              onClick={() => setPage((current) => current)}
              className="ml-2 font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-6 py-4 text-xs font-bold tracking-wide text-slate-500 uppercase">
                  Product
                </th>
                <th className="px-4 py-4 text-xs font-bold tracking-wide text-slate-500 uppercase">
                  Category
                </th>
                <th className="px-4 py-4 text-xs font-bold tracking-wide text-slate-500 uppercase">
                  Price
                </th>
                <th className="px-4 py-4 text-xs font-bold tracking-wide text-slate-500 uppercase">
                  Availability
                </th>
                <th className="px-4 py-4 text-xs font-bold tracking-wide text-slate-500 uppercase">
                  Visibility
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold tracking-wide text-slate-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <span className="inline-flex items-center gap-3 text-sm text-slate-500">
                      <span className="size-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                      Loading catalogue...
                    </span>
                  </td>
                </tr>
              )}

              {!loading && products?.results.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState searching={hasFilters} />
                  </td>
                </tr>
              )}

              {!loading &&
                products?.results.map((product) => (
                  <tr key={product.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <ProductAvatar product={product} />
                        <div className="min-w-0">
                          <p className="max-w-[260px] truncate text-sm font-semibold text-slate-900">
                            {product.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            SKU: {product.sku}
                            {product.brand ? ` · ${product.brand}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-600">{product.category_name}</td>

                    <td className="px-4 py-4 text-sm font-semibold text-slate-800 tabular-nums">
                      {formatPrice(product.price)}
                    </td>

                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <StatusBadge
                          active={product.is_in_stock}
                          label={product.is_in_stock ? "In stock" : "Out of stock"}
                        />
                        <p className="text-xs text-slate-400">
                          {product.stock_quantity === null
                            ? "Manual availability"
                            : `${product.stock_quantity} units`}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <StatusBadge
                        active={product.is_active}
                        label={product.is_active ? "Published" : "Hidden"}
                      />
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          Edit
                        </Link>

                        <button
                          type="button"
                          disabled={mutatingProductId !== null}
                          onClick={() => void handleVisibilityToggle(product)}
                          className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {mutatingProductId === product.id
                            ? "Working..."
                            : product.is_active
                              ? "Deactivate"
                              : "Publish"}
                        </button>

                        <button
                          type="button"
                          disabled={mutatingProductId !== null}
                          onClick={() => {
                            setActionError("");
                            setActionSuccess("");
                            setPendingDeletion(product);
                          }}
                          className="inline-flex items-center rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col justify-between gap-4 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={!products?.next || loading}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {pendingDeletion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && mutatingProductId === null) {
              setPendingDeletion(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-product-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex size-12 items-center justify-center rounded-xl bg-red-50 text-xl text-red-600">
              !
            </div>

            <h3 id="delete-product-title" className="mt-4 text-lg font-bold text-slate-950">
              Permanently delete product?
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              You are about to permanently delete{" "}
              <span className="font-semibold text-slate-900">{pendingDeletion.name}</span>. This
              action cannot be undone.
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              If you only want to hide this product from the storefront, use Deactivate instead.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={mutatingProductId !== null}
                onClick={() => setPendingDeletion(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={mutatingProductId !== null}
                onClick={() => void handleDeleteProduct()}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutatingProductId === pendingDeletion.id ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
