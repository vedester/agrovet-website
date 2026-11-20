// Directory: frontend/src/components/home/CategorySection.tsx

import Image from "next/image";
import Link from "next/link";

import { getCategories } from "@/features/catalog/api";
import type { Category } from "@/features/catalog/types";
import { withFallback } from "@/lib/api/fallback";

const CATEGORY_IMAGES = {
  seeds: "/images/categories/seeds.jpg",
  fertilizers: "/images/categories/fertilizers.jpg",
  animalHealth: "/images/categories/animal-health.jpg",
  default: "/images/hero/agrovet-hero.jpg",
};

function getCategoryImage(category: Category): string {
  if (category.image) {
    return category.image;
  }

  const slug = category.slug.toLowerCase();

  if (/seed|crop|plant/.test(slug)) {
    return CATEGORY_IMAGES.seeds;
  }

  if (/fertil|soil|manure|compost/.test(slug)) {
    return CATEGORY_IMAGES.fertilizers;
  }

  if (/animal|vet|livestock|poultry|dairy|cattle/.test(slug)) {
    return CATEGORY_IMAGES.animalHealth;
  }

  return CATEGORY_IMAGES.default;
}

function CategoryCard({ category }: { category: Category }) {
  const image = getCategoryImage(category);

  return (
    <Link
      href={`/products?category=${encodeURIComponent(category.slug)}`}
      className="group block overflow-hidden rounded-2xl border border-line bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative aspect-[5/4] overflow-hidden bg-brand-50">
        <Image
          src={image}
          alt={category.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="flex items-center justify-between gap-3 p-5">
        <div className="min-w-0">
          <h3 className="truncate font-display text-xl font-semibold text-brand-900">
            {category.name}
          </h3>

          <p className="mt-1 text-sm text-ink-soft">
            {category.productCount > 0 ? `${category.productCount} products` : "Explore category"}
          </p>
        </div>

        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-800 transition-colors group-hover:bg-brand-800 group-hover:text-white"
        >
          →
        </span>
      </div>
    </Link>
  );
}

export default async function CategorySection() {
  const categories = await withFallback(getCategories(), [], "catalogue categories");

  if (categories.length === 0) {
    return null;
  }

  return (
    <section id="categories" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-sm font-bold tracking-[0.18em] text-brand-700 uppercase">
              Explore our range
            </p>

            <h2 className="mt-3 font-display text-3xl font-semibold text-brand-900 sm:text-4xl">
              Everything your farm needs.
            </h2>

            <p className="mt-4 max-w-xl leading-7 text-ink-soft">
              Browse our agricultural product categories and find the right supplies for your farm,
              crops and livestock.
            </p>
          </div>

          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-800 transition-colors hover:text-brand-600"
          >
            View all products
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </div>
    </section>
  );
}
