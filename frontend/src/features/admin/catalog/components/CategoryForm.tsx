// Directory: frontend/src/features/admin/catalog/components/CategoryForm.tsx

"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import type { AdminCategory } from "@/lib/api/admin-catalog";

type CategoryFormProps = {
  categoryId?: number;
};

type CategoryValues = {
  name: string;
  parent: string;
  description: string;
  sort_order: string;
  is_active: boolean;
};

const initialValues: CategoryValues = {
  name: "",
  parent: "",
  description: "",
  sort_order: "0",
  is_active: true,
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function getErrorMessage(payload: unknown): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return "The request could not be completed. Please try again.";
}

export default function CategoryForm({ categoryId }: CategoryFormProps) {
  const router = useRouter();

  const [values, setValues] = useState<CategoryValues>(initialValues);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(categoryId));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCategory, setSuccessCategory] = useState<string | null>(null);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!imagePreview?.startsWith("blob:")) {
      return;
    }

    return () => {
      URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  useEffect(() => {
    let isMounted = true;

    async function loadFormData() {
      try {
        const categoriesResponse = await fetch("/api/admin/catalog/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
          cache: "no-store",
        });

        const categoriesPayload: unknown = await categoriesResponse.json().catch(() => null);

        if (!categoriesResponse.ok || !Array.isArray(categoriesPayload)) {
          throw new Error(getErrorMessage(categoriesPayload));
        }

        const loadedCategories = categoriesPayload as AdminCategory[];

        let loadedValues = initialValues;
        let loadedImage: string | null = null;

        if (categoryId !== undefined) {
          const categoryResponse = await fetch(`/api/admin/catalog/categories/${categoryId}`, {
            cache: "no-store",
          });

          const categoryPayload: unknown = await categoryResponse.json().catch(() => null);

          if (!categoryResponse.ok) {
            throw new Error(getErrorMessage(categoryPayload));
          }

          const category = categoryPayload as AdminCategory;
          loadedImage = category.image;

          loadedValues = {
            name: category.name,
            parent: category.parent === null ? "" : String(category.parent),
            description: category.description,
            sort_order: String(category.sort_order),
            is_active: category.is_active,
          };
        }

        if (isMounted) {
          setCategories(loadedCategories);
          setValues(loadedValues);
          setCurrentImage(loadedImage);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error ? loadError.message : "Unable to load category details.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadFormData();

    return () => {
      isMounted = false;
    };
  }, [categoryId]);

  function updateField<K extends keyof CategoryValues>(field: K, value: CategoryValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, and WebP images are supported.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("The category image must not exceed 10 MB.");
      event.target.value = "";
      return;
    }

    setError(null);
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessCategory(null);

    const name = values.name.trim();

    if (name.length < 2) {
      setError("Category name must contain at least 2 characters.");
      return;
    }

    const sortOrder = Number(values.sort_order);

    if (!Number.isSafeInteger(sortOrder) || sortOrder < 0) {
      setError("Display order must be a non-negative whole number.");
      return;
    }

    const formData = new FormData();

    formData.set("name", name);
    formData.set("parent", values.parent);
    formData.set("description", values.description.trim());
    formData.set("sort_order", String(sortOrder));
    formData.set("is_active", String(values.is_active));

    if (selectedImage) {
      formData.set("image", selectedImage);
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        categoryId === undefined
          ? "/api/admin/catalog/categories/create"
          : `/api/admin/catalog/categories/${categoryId}`,
        {
          method: categoryId === undefined ? "POST" : "PATCH",
          body: formData,
        },
      );

      const responsePayload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(responsePayload));
      }

      if (categoryId === undefined) {
        const savedCategory = responsePayload as AdminCategory;

        setSuccessCategory(savedCategory.name);
        setValues(initialValues);
        setSelectedImage(null);
        setCurrentImage(null);
        setImagePreview(null);

        if (imageInputRef.current) {
          imageInputRef.current.value = "";
        }
      } else {
        router.push("/admin/categories");
        router.refresh();
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the category. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const parentCategories = categories.filter(
    (category) => category.parent === null && category.id !== categoryId,
  );

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
        Loading category details...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Catalogue management</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
          {categoryId === undefined ? "Create category" : "Edit category"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Define how products are organised in your store.
        </p>
      </div>

      {successCategory && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <span className="text-xl font-bold">✓</span>
            </div>

            <div>
              <h2 className="font-semibold text-emerald-900">Category created successfully</h2>

              <p className="mt-1 text-sm text-emerald-800">
                <span className="font-semibold">{successCategory}</span> has been added to your
                catalogue.
              </p>
            </div>
          </div>

          <Link
            href="/admin/categories"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            View categories
            <span className="ml-2" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"
      >
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="category-name" className="text-sm font-semibold text-slate-800">
            Category name <span className="text-red-600">*</span>
          </label>
          <input
            id="category-name"
            type="text"
            required
            minLength={2}
            maxLength={100}
            value={values.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="e.g. Veterinary Drugs"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="category-parent" className="text-sm font-semibold text-slate-800">
            Parent category
          </label>
          <select
            id="category-parent"
            value={values.parent}
            onChange={(event) => updateField("parent", event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="">No parent — top-level category</option>
            {parentCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            Select a parent to create a subcategory. Only top-level categories can be parents.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="category-description" className="text-sm font-semibold text-slate-800">
            Description
          </label>
          <textarea
            id="category-description"
            rows={4}
            maxLength={5000}
            value={values.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Describe the products that belong in this category..."
            className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div className="space-y-3">
          <label htmlFor="category-image" className="text-sm font-semibold text-slate-800">
            Category image
          </label>

          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
            {imagePreview || currentImage ? (
              <div className="space-y-3">
                <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-xl bg-white">
                  <Image
                    src={imagePreview || currentImage!}
                    alt="Category image preview"
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 384px"
                  />
                </div>

                <p className="text-xs text-slate-500">
                  {selectedImage ? "New image selected." : "Current category image."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <span className="text-xl">↑</span>
                </div>

                <p className="text-sm font-medium text-slate-700">No category image selected</p>

                <p className="mt-1 text-xs text-slate-500">
                  Upload a JPEG, PNG or WebP image (maximum 10 MB).
                </p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label
                htmlFor="category-image"
                className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                {selectedImage || currentImage ? "Choose another image" : "Choose image"}
              </label>

              <input
                ref={imageInputRef}
                id="category-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="sr-only"
              />

              {selectedImage && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview(null);

                    if (imageInputRef.current) {
                      imageInputRef.current.value = "";
                    }
                  }}
                  className="text-sm font-medium text-red-600 transition hover:text-red-700"
                >
                  Remove selection
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Selecting a new image replaces the existing category image when you save.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="category-sort-order" className="text-sm font-semibold text-slate-800">
              Display order
            </label>
            <input
              id="category-sort-order"
              type="number"
              min={0}
              step={1}
              required
              value={values.sort_order}
              onChange={(event) => updateField("sort_order", event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
            <p className="text-xs text-slate-500">Lower numbers appear earlier in the catalogue.</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="category-status" className="text-sm font-semibold text-slate-800">
              Visibility
            </label>
            <select
              id="category-status"
              value={values.is_active ? "active" : "inactive"}
              onChange={(event) => updateField("is_active", event.target.value === "active")}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <p className="text-xs text-slate-500">
              Inactive categories can be managed here without appearing in the active catalogue.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <Link
            href="/admin/categories"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : categoryId === undefined ? "Create category" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
