import { cacheLife } from "next/cache";

import { normalizeQuery, type NormalizedQuery, type ProductQuery } from "./query";
import { fetchCategories, fetchProduct, fetchProducts } from "./service";
import type { Category, ProductDetail, ProductPage } from "./types";

// Caching rules (see the "catalogue" profile in next.config.ts):
// - browsing is cached;
// - searching is never cached: search terms are unbounded and must be fresh;
// - "not found" (null) is cached, outages are thrown and never cached.

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("catalogue");

  return fetchCategories();
}

export async function getProduct(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheLife("catalogue");

  return fetchProduct(slug);
}

/** Returns null when the requested page does not exist. */
export async function getProducts(query: ProductQuery = {}): Promise<ProductPage | null> {
  const normalized = normalizeQuery(query);
  return normalized.search ? fetchProducts(normalized) : getBrowsePage(normalized);
}

async function getBrowsePage(query: NormalizedQuery): Promise<ProductPage | null> {
  "use cache";
  cacheLife("catalogue");

  return fetchProducts(query);
}
