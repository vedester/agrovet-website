import { toMediaPath } from "@/lib/api/media";
import { toMoney } from "@/lib/money";

import type {
  CategoryNodeWire,
  CategoryTreeWire,
  ImageWire,
  ProductDetailWire,
  ProductPageWire,
  ProductSummaryWire,
} from "./schemas";
import type { Category, Photo, ProductDetail, ProductPage, ProductSummary } from "./types";

function mapPhoto(wire: ImageWire, fallbackAlt: string): Photo | null {
  const src = toMediaPath(wire.image);
  return src ? { id: wire.id, src, alt: wire.alt_text || fallbackAlt } : null;
}

function isPhoto(photo: Photo | null): photo is Photo {
  return photo !== null;
}

export function mapProductSummary(wire: ProductSummaryWire): ProductSummary {
  return {
    id: wire.id,
    name: wire.name,
    slug: wire.slug,
    sku: wire.sku,
    brand: wire.brand,
    packSize: wire.pack_size,
    price: toMoney(wire.price),
    inStock: wire.is_in_stock,
    requiresAdvice: wire.requires_advice,
    featured: wire.is_featured,
    category: wire.category,
    cover: wire.cover_image ? mapPhoto(wire.cover_image, wire.name) : null,
  };
}

export function mapProductDetail(wire: ProductDetailWire): ProductDetail {
  return {
    id: wire.id,
    name: wire.name,
    slug: wire.slug,
    sku: wire.sku,
    brand: wire.brand,
    packSize: wire.pack_size,
    price: toMoney(wire.price),
    inStock: wire.is_in_stock,
    requiresAdvice: wire.requires_advice,
    featured: wire.is_featured,
    description: wire.description,
    category: wire.category,
    photos: wire.images.map((image) => mapPhoto(image, wire.name)).filter(isPhoto),
  };
}

function mapCategoryNode(node: CategoryNodeWire, children: Category[]): Category {
  return {
    id: node.id,
    name: node.name,
    slug: node.slug,
    description: node.description,
    image: node.image ? toMediaPath(node.image) : null,
    productCount: node.product_count,
    children,
  };
}

export function mapCategories(wire: CategoryTreeWire): Category[] {
  return wire.map((node) =>
    mapCategoryNode(
      node,
      node.children.map((child) => mapCategoryNode(child, [])),
    ),
  );
}

export function mapProductPage(
  wire: ProductPageWire,
  paging: { page: number; pageSize: number },
): ProductPage {
  const pageCount = Math.max(1, Math.ceil(wire.count / paging.pageSize));
  return {
    items: wire.results.map(mapProductSummary),
    total: wire.count,
    page: paging.page,
    pageSize: paging.pageSize,
    pageCount,
    hasNext: paging.page < pageCount,
    hasPrevious: paging.page > 1,
  };
}
