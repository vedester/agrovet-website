// Directory: frontend/src/components/home/FeaturedProducts.tsx

import Image from "next/image";
import Link from "next/link";

import { getProducts } from "@/features/catalog/api";
import { withFallback } from "@/lib/api/fallback";

export default async function FeaturedProducts() {
  const products = await withFallback(
    getProducts({ featured: true, pageSize: 4, page: 1 }),
    null,
    "featured products",
  );

  if (!products || products.items.length === 0) {
    return null;
  }

  return (
    <section id="products" className="bg-cream py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section heading */}
        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-sm font-bold tracking-[0.18em] text-brand-700 uppercase">
              Handpicked for your farm
            </p>

            <h2 className="mt-3 font-display text-3xl font-semibold text-brand-900 sm:text-4xl">
              Featured products.
            </h2>

            <p className="mt-4 max-w-xl leading-7 text-ink-soft">
              Explore selected products from our agricultural range, chosen to support your farming
              needs.
            </p>
          </div>

          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-800 transition-colors hover:text-brand-600"
          >
            Browse all products
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.items.map((product) => (
            <article
              key={product.id}
              className="group overflow-hidden rounded-2xl border border-line bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
            >
              <Link
                href={`/products/${product.slug}`}
                className="block"
                aria-label={`View ${product.name}`}
              >
                <div className="relative aspect-square overflow-hidden bg-brand-50">
                  <Image
                    src={product.cover?.src || "/images/products/product-placeholder.jpg"}
                    alt={product.cover?.alt || product.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  <span
                    className={`absolute top-4 left-4 rounded-full px-3 py-1 text-xs font-semibold ${
                      product.inStock
                        ? "bg-brand-50 text-brand-800"
                        : "bg-accent-50 text-accent-700"
                    }`}
                  >
                    {product.inStock ? "In stock" : "Availability on enquiry"}
                  </span>
                </div>

                <div className="p-5">
                  <p className="text-xs font-semibold tracking-wider text-ink-soft uppercase">
                    {product.category.name}
                  </p>

                  <h3 className="mt-2 line-clamp-2 min-h-14 font-display text-xl font-semibold text-brand-900">
                    {product.name}
                  </h3>

                  {product.brand && (
                    <p className="mt-2 text-sm text-ink-soft">Brand: {product.brand}</p>
                  )}

                  {product.packSize && (
                    <p className="mt-1 text-sm text-ink-soft">Pack size: {product.packSize}</p>
                  )}

                  <div className="mt-5 border-t border-line pt-4">
                    <p className="text-lg font-bold text-brand-800">{product.price.label}</p>

                    <p className="mt-2 text-sm font-semibold text-brand-700">
                      View product <span aria-hidden="true">→</span>
                    </p>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
