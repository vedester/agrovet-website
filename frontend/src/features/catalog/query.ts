import type { QueryParams } from "@/lib/api/server";

export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 100;
export const MAX_SEARCH_LENGTH = 100;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const SORTS = ["name", "price-low", "price-high", "newest"] as const;
export type Sort = (typeof SORTS)[number];

const BACKEND_ORDERING: Record<Sort, string> = {
  name: "name",
  "price-low": "price",
  "price-high": "-price",
  newest: "-created_at",
};

export type ProductQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  sort?: Sort;
  inStock?: boolean;
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
};

export type NormalizedQuery = ProductQuery & { page: number; pageSize: number };

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toNumber(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isTrue(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

function isSort(value: string | undefined): value is Sort {
  return SORTS.some((sort) => sort === value);
}

function clampInt(value: number | undefined, min: number, max: number, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function isMoney(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/** Reads the page URL (?q=dap&sort=price-low...) into a query. Invalid values are ignored. */
export function parseSearchParams(raw: RawParams): ProductQuery {
  const query: ProductQuery = {};

  const page = toNumber(first(raw.page));
  if (page !== undefined) query.page = page;

  const search = first(raw.q);
  if (search) query.search = search;

  const category = first(raw.category);
  if (category) query.category = category;

  const sort = first(raw.sort);
  if (isSort(sort)) query.sort = sort;

  if (isTrue(first(raw.instock))) query.inStock = true;
  if (isTrue(first(raw.featured))) query.featured = true;

  const min = toNumber(first(raw.min));
  if (min !== undefined) query.minPrice = min;
  const max = toNumber(first(raw.max));
  if (max !== undefined) query.maxPrice = max;

  return query;
}

/** Cleans and bounds a query. The result never contains undefined values. */
export function normalizeQuery(query: ProductQuery): NormalizedQuery {
  const normalized: NormalizedQuery = {
    page: clampInt(query.page, 1, 10_000, 1),
    pageSize: clampInt(query.pageSize, 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE),
  };

  const search = (query.search ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SEARCH_LENGTH)
    .trim();
  if (search) normalized.search = search;

  if (query.category && SLUG_PATTERN.test(query.category)) normalized.category = query.category;
  if (isSort(query.sort)) normalized.sort = query.sort;
  if (query.inStock !== undefined) normalized.inStock = query.inStock;
  if (query.featured !== undefined) normalized.featured = query.featured;
  if (isMoney(query.minPrice)) normalized.minPrice = query.minPrice;
  if (isMoney(query.maxPrice)) normalized.maxPrice = query.maxPrice;

  return normalized;
}

/** Translates a query into the backend's parameter names. */
export function toBackendParams(query: NormalizedQuery): QueryParams {
  return {
    page: query.page,
    page_size: query.pageSize,
    search: query.search,
    category: query.category,
    ordering: query.sort ? BACKEND_ORDERING[query.sort] : undefined,
    in_stock: query.inStock,
    featured: query.featured,
    min_price: query.minPrice,
    max_price: query.maxPrice,
  };
}

export const MAX_CACHED_PAGE = 20;

/**
 * Whether a query is worth keeping in the server cache. Free-form values (search
 * text, price ranges) and deep pages create endless one-off entries that push
 * useful ones out, so those are always fetched fresh.
 */
export function isCacheableQuery(query: NormalizedQuery): boolean {
  return (
    query.search === undefined &&
    query.minPrice === undefined &&
    query.maxPrice === undefined &&
    query.page <= MAX_CACHED_PAGE
  );
}
