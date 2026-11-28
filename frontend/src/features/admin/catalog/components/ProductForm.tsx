
"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";

type CategoryOption = {
  id: number;
  name: string;
  parent: number | null;
   sort_order: number;
};

type CategoryGroup = {
  parent: CategoryOption;
  children: CategoryOption[];
};

function buildCategoryGroups(
  categories: CategoryOption[],
): CategoryGroup[] {
  const sorted = [...categories].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      a.name.localeCompare(b.name),
  );

  const parents = sorted.filter((item) => item.parent === null);
  const parentIds = new Set(parents.map((item) => item.id));

  const groups: CategoryGroup[] = parents.map((parent) => ({
    parent,
    children: sorted.filter((item) => item.parent === parent.id),
  }));

  // Keep any unexpected orphaned categories visible rather than hiding them.
  const orphanedCategories = sorted
    .filter(
      (item) => item.parent !== null && !parentIds.has(item.parent),
    )
    .map((item) => ({
      parent: item,
      children: [],
    }));

  return [...groups, ...orphanedCategories];
}

type ProductFormProps = {
  productId?: number;
};

type EditableProduct = {
  id: number;
  name: string;
  sku: string;
  brand: string;
  pack_size: string;
  category: number;
  price: string;
  description: string;
  requires_advice: boolean;
  is_featured: boolean;
  is_active: boolean;
  images: { id: number; image: string; alt_text: string; position: number }[];
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

const labelClass = "mb-2 block text-sm font-semibold text-slate-700";

export default function ProductForm({ productId }: ProductFormProps) {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryError, setCategoryError] = useState("");
  const [productLoading, setProductLoading] = useState(Boolean(productId));
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [brand, setBrand] = useState("");
  const [packSize, setPackSize] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  // Image state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const imagePreviewUrlRef = useRef<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [isImageDragging, setIsImageDragging] = useState(false);

  const [requiresAdvice, setRequiresAdvice] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [active, setActive] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [createdProductId, setCreatedProductId] = useState<number | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");
  const [imageUploaded, setImageUploaded] = useState(false);
  const [isReadyForNextProduct, setIsReadyForNextProduct] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      try {
        const response = await fetch("/api/admin/catalog/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productId ? {} : { isActive: true }),
          cache: "no-store",
          signal: controller.signal,
        });

        const data: unknown = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof data === "object" && data !== null && "error" in data
              ? String(data.error)
              : "Unable to load categories.",
          );
        }

        if (!Array.isArray(data)) {
          throw new Error("The category service returned an invalid response.");
        }

        setCategories(data as CategoryOption[]);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;

        setCategoryError(
          err instanceof Error ? err.message : "Unable to load categories.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setCategoriesLoading(false);
        }
      }
    }

    void loadCategories();

    return () => controller.abort();
  }, [productId]);

  useEffect(() => {
    if (!productId) {
      return;
    }

    const controller = new AbortController();

    async function loadProduct() {
      try {
        const response = await fetch(`/api/admin/catalog/products/${productId}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        const data: unknown = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof data === "object" && data !== null && "error" in data
              ? String(data.error)
              : "Unable to load the product.",
          );
        }

        if (
          typeof data !== "object" ||
          data === null ||
          !("id" in data) ||
          !("name" in data) ||
          typeof data.name !== "string" ||
          !("category" in data) ||
          typeof data.category !== "number"
        ) {
          throw new Error("The product service returned invalid product data.");
        }

        const product = data as EditableProduct;

        setName(product.name);
        setSku(product.sku);
        setBrand(product.brand);
        setPackSize(product.pack_size);
        setCategory(String(product.category));
        setPrice(product.price);
        setDescription(product.description);

        setRequiresAdvice(product.requires_advice);
        setFeatured(product.is_featured);
        setActive(product.is_active);

        setCurrentImage(product.images?.[0]?.image ?? null);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;

        setError(
          err instanceof Error ? err.message : "Unable to load the product.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setProductLoading(false);
        }
      }
    }

    void loadProduct();

    return () => controller.abort();
  }, [productId]);

  // Release the image preview URL when the component unmounts.
  useEffect(() => {
    return () => {
      if (imagePreviewUrlRef.current) {
        URL.revokeObjectURL(imagePreviewUrlRef.current);
      }
    };
  }, []);

  function updateSelectedImage(file: File | null) {
    if (imagePreviewUrlRef.current) {
      URL.revokeObjectURL(imagePreviewUrlRef.current);
      imagePreviewUrlRef.current = null;
    }

    const previewUrl = file ? URL.createObjectURL(file) : null;

    imagePreviewUrlRef.current = previewUrl;
    setSelectedImage(file);
    setImagePreview(previewUrl ?? "");
  }

  function resetProductForm() {
    // Clear basic information.
    setName("");
    setSku("");
    setBrand("");
    setPackSize("");
    setCategory("");
    setPrice("");
    setDescription("");

    // Restore storefront defaults.
    setRequiresAdvice(false);
    setFeatured(false);
    setActive(true);

    // Clear image selection and preview.
    updateSelectedImage(null);

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }

    setCurrentImage(null);
    setImageError("");
    setIsImageDragging(false);

    // Clear upload state.
    setCreatedProductId(null);
    setImageUploadError("");
    setImageUploaded(false);

    // Clear previous errors.
    setError("");

    // Mark the form as ready for another product.
    setIsReadyForNextProduct(true);
  }

  function processImageFile(file?: File, input?: HTMLInputElement | null) {
    setImageError("");

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSize = 10 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      updateSelectedImage(null);

      if (input) input.value = "";

      setImageError(
        "This file format is not supported. Choose a JPEG, PNG or WebP image.",
      );
      return;
    }

    if (file.size > maxSize) {
      updateSelectedImage(null);

      if (input) input.value = "";

      setImageError("This image is larger than 10 MB. Choose a smaller image.");
      return;
    }

    updateSelectedImage(file);
  }

  function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    processImageFile(event.target.files?.[0], event.target);
  }

  function handleImageDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsImageDragging(false);
    processImageFile(event.dataTransfer.files?.[0]);
  }

  async function uploadSelectedImage(
    productId: number,
    file: File,
  ): Promise<boolean> {
    setImageUploading(true);
    setImageUploadError("");
    setImageUploaded(false);

    try {
      const formData = new FormData();

      formData.append("image", file);
      formData.append("alt_text", `${name.trim()} product image`);
      formData.append("position", "0");

      const response = await fetch(
        `/api/admin/catalog/products/${productId}/images`,
        {
          method: "POST",
          body: formData,
          cache: "no-store",
        },
      );

      let data: unknown = null;

      try {
        data = await response.json();
      } catch {
        // The response may not contain JSON.
      }

      if (!response.ok) {
        throw new Error(
          typeof data === "object" && data !== null && "error" in data
            ? String(data.error)
            : "The product was saved, but its image could not be uploaded. Please try again.",
        );
      }

      setImageUploaded(true);
      return true;
    } catch (err) {
      setImageUploadError(
        err instanceof Error
          ? err.message
          : "The product was saved, but the image upload failed. Please try again.",
      );

      return false;
    } finally {
      setImageUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setImageUploadError("");
    setImageUploaded(false);
    setIsReadyForNextProduct(false);

    if (!category) {
      setError("Please select a product category.");
      return;
    }

    if (!/^\d{1,8}(\.\d{1,2})?$/.test(price.trim())) {
      setError("Enter a valid price with no more than two decimal places.");
      return;
    }

    const payload = {
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      brand: brand.trim(),
      pack_size: packSize.trim(),
      description: description.trim(),
      price: price.trim(),
      requires_advice: requiresAdvice,
      is_featured: featured,
      is_active: active,
      category: Number(category),
    };

    setSubmitting(true);

    try {
      const editing = Boolean(productId);

      const response = await fetch(
        editing
          ? `/api/admin/catalog/products/${productId}`
          : "/api/admin/catalog/products/create",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          cache: "no-store",
        },
      );

      const data: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data === "object" && data !== null && "error" in data
            ? String(data.error)
            : editing
              ? "Unable to update the product."
              : "Unable to create the product.",
        );
      }

      if (
        typeof data !== "object" ||
        data === null ||
        !("id" in data) ||
        typeof data.id !== "number" ||
        !Number.isInteger(data.id) ||
        data.id <= 0
      ) {
        throw new Error(
          editing
            ? "The product was updated, but the server returned an invalid product ID."
            : "The product was created, but the server returned an invalid product ID.",
        );
      }

      const savedProductId = data.id;

      setCreatedProductId(savedProductId);

      setSuccess(
        editing
          ? `Product "${payload.name}" was updated successfully.`
          : `Product "${payload.name}" was created successfully.`,
      );

      // Upload the image before clearing the form.
      if (selectedImage) {
        const imageUploadSucceeded = await uploadSelectedImage(
          savedProductId,
          selectedImage,
        );

        // Keep the form intact if the image upload fails.
        // The user can retry without creating the product again.
        if (!imageUploadSucceeded) {
          return;
        }
      }

      // Only reset the Add Product form after the full operation succeeds.
      if (!editing) {
        resetProductForm();

        setSuccess(
          `Product "${payload.name}" was created successfully. The form is ready for another product.`,
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while saving the product.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/admin/products"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-emerald-700"
          >
            <span aria-hidden="true">←</span>
            Back to products
          </Link>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {productId ? "Edit product" : "Add a product"}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {productId
              ? "Update the product information in your agrovet catalogue."
              : "Create a product record for your agrovet catalogue."}
          </p>
        </div>

        <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          Product management
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-semibold text-emerald-800">{success}</p>

            <p className="mt-1 text-sm text-emerald-700">
              {isReadyForNextProduct
                ? "You can now enter the details of your next product."
                : "The product is now saved in your catalogue."}
            </p>

            {selectedImage && (
              <div className="mt-3">
                {imageUploading && (
                  <p className="text-sm text-emerald-700">
                    Uploading product image...
                  </p>
                )}

                {imageUploaded && (
                  <p className="text-sm font-medium text-emerald-700">
                    Product image uploaded successfully.
                  </p>
                )}

                {imageUploadError && (
                  <div className="space-y-2">
                    <p role="alert" className="text-sm text-red-700">
                      {imageUploadError}
                    </p>

                    <button
                      type="button"
                      onClick={async () => {
                        if (createdProductId && selectedImage) {
                          const uploaded = await uploadSelectedImage(
                            createdProductId,
                            selectedImage,
                          );

                          if (uploaded && !productId) {
                            const savedName = name.trim();

                            resetProductForm();

                            setSuccess(
                              `Product "${savedName}" was created successfully. The form is ready for another product.`,
                            );
                          }
                        }
                      }}
                      disabled={imageUploading}
                      className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {imageUploading
                        ? "Retrying upload..."
                        : "Retry image upload"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <Link
            href="/admin/products"
            className="w-fit rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            View products
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-7">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              Basic information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Identify the product and organize it in your catalogue.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="product-name" className={labelClass}>
                Product name <span className="text-red-500">*</span>
              </label>

              <input
                id="product-name"
                className={inputClass}
                placeholder="e.g. DAP Fertilizer"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={200}
                required
              />
            </div>

            <div>
              <label htmlFor="product-sku" className={labelClass}>
                SKU <span className="text-red-500">*</span>
              </label>

              <input
                id="product-sku"
                className={inputClass}
                placeholder="e.g. FERT-DAP-001"
                value={sku}
                onChange={(event) => setSku(event.target.value.toUpperCase())}
                maxLength={40}
                required
              />

              <p className="mt-1.5 text-xs text-slate-400">
                Unique product identification code.
              </p>
            </div>

            <div>
              <label htmlFor="product-category" className={labelClass}>
                Category <span className="text-red-500">*</span>
              </label>

              <select
                id="product-category"
                className={inputClass}
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                disabled={categoriesLoading || categories.length === 0}
                required
              >
                <option value="">
                {categoriesLoading ? "Loading categories..." : "Select category"}
              </option>

              {buildCategoryGroups(categories).map(({ parent, children }) => (
                <optgroup key={parent.id} label={parent.name}>
                  <option value={parent.id}>
                    All {parent.name}
                  </option>

                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </optgroup>
              ))}

              </select>

              {categoryError && (
                <p className="mt-2 text-xs text-red-600">{categoryError}</p>
              )}

              {!categoriesLoading &&
                categories.length === 0 &&
                !categoryError && (
                  <p className="mt-2 text-xs text-amber-700">
                    No active categories are available.
                  </p>
                )}
            </div>

            <div>
              <label htmlFor="product-brand" className={labelClass}>
                Brand
              </label>

              <input
                id="product-brand"
                className={inputClass}
                placeholder="e.g. Yara"
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                maxLength={100}
              />
            </div>

            <div>
              <label htmlFor="product-pack-size" className={labelClass}>
                Pack size
              </label>

              <input
                id="product-pack-size"
                className={inputClass}
                placeholder="e.g. 50 kg, 1 litre"
                value={packSize}
                onChange={(event) => setPackSize(event.target.value)}
                maxLength={50}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="product-description" className={labelClass}>
                Product description
              </label>

              <textarea
                id="product-description"
                className={`${inputClass} min-h-32 resize-y`}
                placeholder="Describe the product, its uses and important details..."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Product image</h2>

            <p className="mt-1 text-sm text-slate-500">
              Add a clear product photograph to help customers identify the item.
            </p>
          </div>

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsImageDragging(true);
            }}
            onDragLeave={() => setIsImageDragging(false)}
            onDrop={handleImageDrop}
            className={`flex flex-col gap-5 rounded-xl border-2 border-dashed p-4 transition-colors sm:flex-row sm:items-start ${
              isImageDragging
                ? "border-emerald-500 bg-emerald-50"
                : "border-slate-200 bg-slate-50/50"
            }`}
          >
            <div className="flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
              {imagePreview || currentImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreview || currentImage || ""}
                  alt={
                    imagePreview
                      ? "Selected product preview"
                      : "Current product image"
                  }
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="px-4 text-center">
                  <span
                    className="text-3xl text-slate-300"
                    aria-hidden="true"
                  >
                    +
                  </span>

                  <p className="mt-2 text-xs text-slate-500">
                    Image preview
                  </p>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <label htmlFor="product-image" className={labelClass}>
                Choose product image
              </label>

              <input
                ref={imageInputRef}
                id="product-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageSelection}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-100"
              />

              <p className="mt-2 text-sm font-medium text-emerald-700">
                Drag and drop an image here, or use the file picker above.
              </p>

              <p className="mt-2 text-xs text-slate-400">
                JPEG, PNG or WebP. Maximum file size: 10 MB.
              </p>

              {selectedImage && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <p className="text-sm font-medium text-slate-700">
                    {selectedImage.name}
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      updateSelectedImage(null);
                      setImageError("");

                      if (imageInputRef.current) {
                        imageInputRef.current.value = "";
                      }
                    }}
                    className="text-sm font-semibold text-red-600 transition hover:text-red-700"
                  >
                    Remove image
                  </button>
                </div>
              )}

              {imageError && (
                <p role="alert" className="mt-3 text-sm text-red-600">
                  {imageError}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Pricing</h2>
            <p className="mt-1 text-sm text-slate-500">
              Set the product&apos;s selling price.
            </p>
          </div>

          <div>
            <label htmlFor="product-price" className={labelClass}>
              Selling price (KES) <span className="text-red-500">*</span>
            </label>
            <div className="flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10">
              <span className="flex items-center border-r border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-500">
                KES
              </span>
              <input
                id="product-price"
                className="w-full min-w-0 px-4 py-3 text-sm text-slate-900 outline-none"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                required
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              Storefront settings
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Control how customers see and interact with this product.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                label: "Published on storefront",
                description:
                  "Customers can discover this product in the catalogue.",
                checked: active,
                change: setActive,
              },
              {
                label: "Featured product",
                description:
                  "Mark this product for featured product sections.",
                checked: featured,
                change: setFeatured,
              },
              {
                label: "Requires professional advice",
                description:
                  "Indicate that customers should consult before use.",
                checked: requiresAdvice,
                change: setRequiresAdvice,
              },
            ].map((setting) => (
              <label
                key={setting.label}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/30"
              >
                <input
                  type="checkbox"
                  checked={setting.checked}
                  onChange={(event) =>
                    setting.change(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 accent-emerald-600"
                />

                <span>
                  <span className="block text-sm font-semibold text-slate-800">
                    {setting.label}
                  </span>

                  <span className="mt-1 block text-xs text-slate-500">
                    {setting.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
          <Link
            href="/admin/products"
            className="rounded-xl border border-slate-200 px-6 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={
              submitting ||
              imageUploading ||
              productLoading ||
              categoriesLoading ||
              categories.length === 0 ||
              (Boolean(success) &&
                (Boolean(productId) || !isReadyForNextProduct))
            }
            className="rounded-xl bg-emerald-700 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting || imageUploading
              ? productId
                ? "Saving changes..."
                : imageUploading
                  ? "Uploading image..."
                  : "Creating product..."
              : productId
                ? "Save changes"
                : isReadyForNextProduct
                  ? "Create next product"
                  : "Create product"}
          </button>
        </div>
      </form>
    </div>
  );
}
