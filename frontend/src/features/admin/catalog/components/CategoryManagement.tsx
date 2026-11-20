// Directory: frontend/src/features/admin/catalog/components/CategoryManagement.tsx

"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { AdminCategory } from "@/lib/api/admin-catalog";

type StatusFilter = "all" | "active" | "inactive";

function getCategoryInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return words[0]?.slice(0, 2).toUpperCase() || "??";
}

function getErrorMessage(payload: unknown): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return "Unable to load categories. Please try again.";
}

export default function CategoryManagement() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // State for delete confirmation modal
  const [categoryToDelete, setCategoryToDelete] = useState<AdminCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/admin/catalog/categories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
          cache: "no-store",
        });

        const payload: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(getErrorMessage(payload));
        }

        if (!Array.isArray(payload)) {
          throw new Error("The server returned an invalid category list.");
        }

        if (isMounted) {
          setCategories(payload as AdminCategory[]);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load categories. Please try again.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCategories();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  async function handleDeleteCategory() {
    if (!categoryToDelete || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    setDeleteSuccess(null);

    try {
      const response = await fetch(`/api/admin/catalog/categories/${categoryToDelete.id}`, {
        method: "DELETE",
        cache: "no-store",
      });

      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);

        throw new Error(getErrorMessage(payload));
      }

      setCategories((current) => current.filter((category) => category.id !== categoryToDelete.id));

      setDeleteSuccess(`${categoryToDelete.name} was deleted successfully.`);
      setCategoryToDelete(null);
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Unable to delete this category. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const filteredCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return categories.filter((category) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        category.name.toLowerCase().includes(normalizedSearch) ||
        category.description.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && category.is_active) ||
        (statusFilter === "inactive" && !category.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [categories, search, statusFilter]);

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const activeCount = categories.filter((category) => category.is_active).length;
  const inactiveCount = categories.length - activeCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Catalogue management</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Categories</h1>
          <p className="mt-1 text-sm text-slate-500">
            Organise products into categories and subcategories.
          </p>
        </div>

        <Link
          href="/admin/categories/new"
          className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          Add category
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total categories</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{categories.length}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Active categories</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{activeCount}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Inactive categories</p>
          <p className="mt-2 text-2xl font-semibold text-slate-700">{inactiveCount}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-950">All categories</h2>
            <p className="mt-1 text-sm text-slate-500">
              View category structure and product assignments.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search categories..."
              aria-label="Search categories"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 sm:w-64"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              aria-label="Filter categories by status"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {deleteSuccess && (
          <div
            role="status"
            className="mx-5 mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
          >
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-emerald-800">{deleteSuccess}</p>

              <button
                type="button"
                onClick={() => setDeleteSuccess(null)}
                className="text-sm font-semibold text-emerald-800 hover:text-emerald-950"
                aria-label="Dismiss success message"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
              className="mt-3 text-sm font-semibold text-red-800 underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-4 font-semibold">Category</th>
                <th className="px-5 py-4 font-semibold">Parent category</th>
                <th className="px-5 py-4 text-center font-semibold">Products</th>
                <th className="px-5 py-4 text-center font-semibold">Subcategories</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    Loading categories...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    Categories could not be loaded.
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <p className="font-medium text-slate-700">No categories found</p>
                    <p className="mt-1 text-slate-500">
                      Try changing your search or status filter.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((category) => {
                  const parentCategory = category.parent ? categoryMap.get(category.parent) : null;

                  return (
                    <tr key={category.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {category.image ? (
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                              <Image
                                src={category.image}
                                alt={`${category.name} category`}
                                fill
                                unoptimized
                                sizes="48px"
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-800">
                              {getCategoryInitials(category.name)}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900">{category.name}</div>
                            <div className="mt-1 max-w-sm truncate text-xs text-slate-500">
                              {category.description || "No description provided"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {parentCategory ? (
                          <span>
                            {parentCategory.name}
                            <span className="ml-2 text-xs text-slate-400">Subcategory</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Top-level category</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-center font-medium text-slate-700 tabular-nums">
                        {category.product_count}
                      </td>

                      <td className="px-5 py-4 text-center font-medium text-slate-700 tabular-nums">
                        {category.children_count}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            category.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {category.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-4">
                          <Link
                            href={`/admin/categories/${category.id}/edit`}
                            className="font-semibold text-emerald-700 transition hover:text-emerald-900"
                          >
                            Edit
                          </Link>

                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setCategoryToDelete(category);
                            }}
                            className="font-semibold text-red-600 transition hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
          Showing {filteredCategories.length} of {categories.length} categories
        </div>

        {categoryToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !isDeleting) {
                setCategoryToDelete(null);
                setDeleteError(null);
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-category-title"
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            >
              <h2 id="delete-category-title" className="text-lg font-semibold text-slate-950">
                Delete category?
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                You are about to permanently delete{" "}
                <strong className="text-slate-900">{categoryToDelete.name}</strong>. This action
                cannot be undone.
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Categories containing products or subcategories cannot be deleted. You can
                deactivate them instead.
              </p>

              {deleteError && (
                <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-700">{deleteError}</p>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    setCategoryToDelete(null);
                    setDeleteError(null);
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => void handleDeleteCategory()}
                  className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeleting ? "Deleting..." : "Delete category"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
