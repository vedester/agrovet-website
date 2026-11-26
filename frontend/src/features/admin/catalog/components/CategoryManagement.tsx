
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

function compareCategories(a: AdminCategory, b: AdminCategory): number {
  return a.sort_order - b.sort_order || a.name.localeCompare(b.name);
}

export default function CategoryManagement() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [categoryToDelete, setCategoryToDelete] =
    useState<AdminCategory | null>(null);
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
      const response = await fetch(
        `/api/admin/catalog/categories/${categoryToDelete.id}`,
        {
          method: "DELETE",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        throw new Error(getErrorMessage(payload));
      }

      setCategories((current) =>
        current.filter((category) => category.id !== categoryToDelete.id),
      );

      setDeleteSuccess(`${categoryToDelete.name} was deleted successfully.`);
      setCategoryToDelete(null);
    } catch (deleteRequestError) {
      setDeleteError(
        deleteRequestError instanceof Error
          ? deleteRequestError.message
          : "Unable to delete this category. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const categoryTree = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const matchesSearch = (category: AdminCategory) =>
      normalizedSearch.length === 0 ||
      category.name.toLowerCase().includes(normalizedSearch) ||
      category.description.toLowerCase().includes(normalizedSearch);

    const matchesStatus = (category: AdminCategory) =>
      statusFilter === "all" ||
      (statusFilter === "active" && category.is_active) ||
      (statusFilter === "inactive" && !category.is_active);

    const sortedCategories = [...categories].sort(compareCategories);

    const parents = sortedCategories.filter(
      (category) => category.parent === null,
    );

    const childrenByParent = new Map<number, AdminCategory[]>();

    for (const category of sortedCategories) {
      if (category.parent === null) {
        continue;
      }

      const existingChildren = childrenByParent.get(category.parent) ?? [];

      existingChildren.push(category);
      childrenByParent.set(category.parent, existingChildren);
    }

    const visibleTree: {
      parent: AdminCategory;
      children: AdminCategory[];
    }[] = [];

    for (const parent of parents) {
      const children = childrenByParent.get(parent.id) ?? [];

      const matchingChildren = children.filter(
        (child) => matchesSearch(child) && matchesStatus(child),
      );

      const parentMatches = matchesSearch(parent) && matchesStatus(parent);

      if (!parentMatches && matchingChildren.length === 0) {
        continue;
      }

      visibleTree.push({
        parent,
        children: matchingChildren,
      });
    }

    const visibleCount = visibleTree.reduce(
      (total, group) => total + 1 + group.children.length,
      0,
    );

    return {
      groups: visibleTree,
      visibleCount,
    };
  }, [categories, search, statusFilter]);

  const activeCount = categories.filter(
    (category) => category.is_active,
  ).length;

  const inactiveCount = categories.length - activeCount;

  const topLevelCount = categories.filter(
    (category) => category.parent === null,
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Catalogue management
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            Categories
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Organise products into parent categories and subcategories.
          </p>
        </div>

        <Link
          href="/admin/categories/new"
          className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          Add category
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total categories</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {categories.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Parent categories</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {topLevelCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Active categories</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">
            {activeCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Inactive categories</p>
          <p className="mt-2 text-2xl font-semibold text-slate-700">
            {inactiveCount}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-950">
              Category structure
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Parent categories and their subcategories are grouped together.
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
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
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
              <p className="text-sm font-medium text-emerald-800">
                {deleteSuccess}
              </p>

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
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-4 font-semibold">Category</th>
                <th className="px-5 py-4 text-center font-semibold">
                  Products
                </th>
                <th className="px-5 py-4 text-center font-semibold">
                  Subcategories
                </th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    Loading categories...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    Categories could not be loaded.
                  </td>
                </tr>
              ) : categoryTree.visibleCount === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <p className="font-medium text-slate-700">
                      No categories found
                    </p>

                    <p className="mt-1 text-slate-500">
                      Try changing your search or status filter.
                    </p>
                  </td>
                </tr>
              ) : (
                categoryTree.groups.map(({ parent, children }) => (
                  <>
                    <tr
                      key={`parent-${parent.id}`}
                      className="bg-white transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {parent.image ? (
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                              <Image
                                src={parent.image}
                                alt={`${parent.name} category`}
                                fill
                                unoptimized
                                sizes="48px"
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-800">
                              {getCategoryInitials(parent.name)}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-slate-900">
                                {parent.name}
                              </span>

                              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-800 uppercase">
                                Parent
                              </span>
                            </div>

                            <div className="mt-1 max-w-sm truncate text-xs text-slate-500">
                              {parent.description ||
                                "No description provided"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center font-medium text-slate-700 tabular-nums">
                        {parent.product_count}
                      </td>

                      <td className="px-5 py-4 text-center font-medium text-slate-700 tabular-nums">
                        {parent.children_count}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            parent.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {parent.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-4">
                          <Link
                            href={`/admin/categories/${parent.id}/edit`}
                            className="font-semibold text-emerald-700 transition hover:text-emerald-900"
                          >
                            Edit
                          </Link>

                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setCategoryToDelete(parent);
                            }}
                            className="font-semibold text-red-600 transition hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>

                    {children.map((child) => (
                      <tr
                        key={`child-${child.id}`}
                        className="bg-slate-50/60 transition hover:bg-slate-100"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3 pl-5 sm:pl-9">
                            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                              <span
                                aria-hidden="true"
                                className="absolute bottom-1/2 left-1/2 top-0 w-px bg-slate-300"
                              />

                              <span
                                aria-hidden="true"
                                className="absolute bottom-1/2 left-1/2 h-px w-4 bg-slate-300"
                              />

                              <div className="relative z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600">
                                {getCategoryInitials(child.name)}
                              </div>
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-slate-800">
                                  {child.name}
                                </span>

                                <span className="rounded-md bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-600 uppercase">
                                  Subcategory
                                </span>
                              </div>

                              <div className="mt-1 max-w-sm truncate text-xs text-slate-500">
                                {child.description ||
                                  "No description provided"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3 text-center font-medium text-slate-700 tabular-nums">
                          {child.product_count}
                        </td>

                        <td className="px-5 py-3 text-center text-slate-400">
                          —
                        </td>

                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              child.is_active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {child.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-4">
                            <Link
                              href={`/admin/categories/${child.id}/edit`}
                              className="font-semibold text-emerald-700 transition hover:text-emerald-900"
                            >
                              Edit
                            </Link>

                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError(null);
                                setCategoryToDelete(child);
                              }}
                              className="font-semibold text-red-600 transition hover:text-red-800"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
          Showing {categoryTree.visibleCount} of {categories.length} categories
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
              <h2
                id="delete-category-title"
                className="text-lg font-semibold text-slate-950"
              >
                Delete category?
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                You are about to permanently delete{" "}
                <strong className="text-slate-900">
                  {categoryToDelete.name}
                </strong>
                . This action cannot be undone.
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Categories containing products or subcategories cannot be
                deleted. You can deactivate them instead.
              </p>

              {deleteError && (
                <div
                  role="alert"
                  className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3"
                >
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
