// Directory: frontend/src/components/catalog/ProductGrid.tsx

import type { ProductSummary } from "@/features/catalog/types";

import ProductCard from "./ProductCard";

type ProductGridProps = {
  products: ProductSummary[];
  className?: string;
};

export default function ProductGrid({
  products,
  className = "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4",
}: ProductGridProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <div className={`grid gap-4 sm:gap-5 ${className}`}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
