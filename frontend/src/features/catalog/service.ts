// Uncached backend reads. src/features/catalog/api.ts wraps these with caching.
import { ApiError } from "@/lib/api/errors";
import { backendGet } from "@/lib/api/server";

import { mapCategories, mapProductDetail, mapProductPage } from "./mappers";
import { SLUG_PATTERN, toBackendParams, type NormalizedQuery } from "./query";
import { categoryTreeSchema, productDetailSchema, productPageSchema } from "./schemas";
import type { Category, ProductDetail, ProductPage } from "./types";

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.kind === "not_found";
}

export async function fetchCategories(): Promise<Category[]> {
  return mapCategories(await backendGet("/catalog/categories/", categoryTreeSchema));
}

/** Returns null when the requested page does not exist (for example page 99). */
export async function fetchProducts(query: NormalizedQuery): Promise<ProductPage | null> {
  try {
    const wire = await backendGet("/catalog/products/", productPageSchema, toBackendParams(query));
    return mapProductPage(wire, query);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/** Returns null for an unknown or hidden product. Outages are thrown, not hidden. */
export async function fetchProduct(slug: string): Promise<ProductDetail | null> {
  if (!SLUG_PATTERN.test(slug)) return null;
  try {
    return mapProductDetail(await backendGet(`/catalog/products/${slug}/`, productDetailSchema));
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}
