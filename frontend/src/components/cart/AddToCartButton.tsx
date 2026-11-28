"use client";

import { useState } from "react";

import { useCart } from "@/features/cart/cart-context";
import type {
  ProductDetail,
  ProductSummary,
} from "@/features/catalog/types";

type Product = ProductSummary | ProductDetail;

export default function AddToCartButton({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      packSize: product.packSize,
      unitPriceCents: product.price.cents,
      priceLabel: product.price.label,
      image:
        "cover" in product
          ? product.cover?.src ?? null
          : product.photos[0]?.src ?? null,
    });

    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={!product.inStock}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-pill bg-brand-800 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent-500 ${className}`}
    >
      <span aria-hidden="true">{added ? "✓" : "+"}</span>
      {added
        ? "Added to cart"
        : product.inStock
          ? "Add to cart"
          : "Out of stock"}
    </button>
  );
}
