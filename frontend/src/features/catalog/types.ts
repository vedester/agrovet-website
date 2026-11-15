import type { Money } from "@/lib/money";

export type CategoryBrief = { name: string; slug: string };
export type Photo = { id: number; src: string; alt: string };

type ProductBase = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  packSize: string;
  price: Money;
  inStock: boolean;
  requiresAdvice: boolean;
  featured: boolean;
};

/** A product card in lists. */
export type ProductSummary = ProductBase & {
  category: CategoryBrief;
  cover: Photo | null;
};

/** A full product page. */
export type ProductDetail = ProductBase & {
  description: string;
  category: CategoryBrief & { parent: CategoryBrief | null };
  photos: Photo[];
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  productCount: number;
  children: Category[];
};

export type ProductPage = {
  items: ProductSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  hasNext: boolean;
  hasPrevious: boolean;
};
