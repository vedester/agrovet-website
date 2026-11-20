// Directory: frontend/src/components/catalog/ProductCard.tsx

import Image from "next/image";
import Link from "next/link";

import type { ProductSummary } from "@/features/catalog/types";

import PhotoPlaceholder from "./PhotoPlaceholder";
import StockBadge from "./StockBadge";

export default function ProductCard({ product }: { product: ProductSummary }) {
  const details = [product.brand, product.packSize].filter(Boolean).join(" · ");

  return (
    <article className="group relative flex h-full w-full flex-col overflow-hidden rounded-card bg-white shadow-soft ring-1 ring-line transition duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-50">
        {product.cover ? (
          <Image
            src={product.cover.src}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <PhotoPlaceholder />
        )}

        <StockBadge inStock={product.inStock} className="absolute top-3 left-3" />

        {product.featured && (
          <span className="absolute top-3 right-3 rounded-pill bg-white px-3 py-1 text-xs font-bold text-brand-800 shadow-soft">
            Featured
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="text-[11px] font-bold tracking-[0.13em] text-brand-700 uppercase">
          {product.category.name}
        </p>

        <h3 className="mt-2 line-clamp-2 min-h-12 font-display text-lg leading-snug font-semibold text-brand-900">
          <Link
            href={`/products/${product.slug}`}
            className="transition-colors group-hover:text-brand-700 after:absolute after:inset-0"
          >
            {product.name}
          </Link>
        </h3>

        {details && <p className="mt-1 text-sm text-ink-soft">{details}</p>}

        <div className="mt-auto pt-4">
          <p className="text-lg font-bold tracking-tight text-brand-900">{product.price.label}</p>

          {product.requiresAdvice && (
            <p className="mt-2 rounded-xl bg-accent-50 px-3 py-2 text-xs leading-5 text-accent-700">
              Ask our team for advice before use.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
