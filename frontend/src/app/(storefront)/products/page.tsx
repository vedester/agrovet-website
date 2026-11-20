import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import ProductFilters from "@/components/catalog/ProductFilters";
import ProductGrid from "@/components/catalog/ProductGrid";
import Breadcrumbs, { type Crumb } from "@/components/ui/Breadcrumbs";
import { getCategories, getProducts } from "@/features/catalog/api";
import { parseSearchParams, type ProductQuery } from "@/features/catalog/query";
import type { Category } from "@/features/catalog/types";
import { withFallback } from "@/lib/api/fallback";

export const metadata: Metadata = {
  title: "Shop Farm Inputs",
  description:
    "Browse agricultural inputs, fertilizers, seeds, animal feeds, veterinary products and farm equipment.",
};

type SearchParams = Record<string, string | string[] | undefined>;

type ProductsPageProps = {
  searchParams: Promise<SearchParams>;
};

function flattenCategories(categories: Category[]): Category[] {
  return categories.flatMap((category) => [category, ...category.children]);
}

function buildPageHref(
  query: ProductQuery,
  page: number,
  preserveCategoryProductsView: boolean,
): string {
  const params = new URLSearchParams();

  if (query.search) params.set("q", query.search);
  if (query.category) params.set("category", query.category);
  if (query.sort) params.set("sort", query.sort);
  if (query.inStock) params.set("instock", "true");
  if (query.featured) params.set("featured", "true");
  if (query.minPrice !== undefined) params.set("min", String(query.minPrice));
  if (query.maxPrice !== undefined) params.set("max", String(query.maxPrice));

  if (preserveCategoryProductsView) {
    params.set("view", "products");
  }

  params.set("page", String(page));

  return `/products?${params.toString()}`;
}

function CatalogueLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-5 py-12 sm:px-6">
      <div className="h-3 w-32 rounded bg-sand" />
      <div className="mt-5 h-10 max-w-md rounded bg-sand" />

      <div className="mt-10 grid gap-6 lg:grid-cols-[250px_1fr]">
        <div className="h-80 rounded-card bg-sand" />

        <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-80 rounded-card bg-sand" />
          ))}
        </div>
      </div>
    </div>
  );
}

function SubcategoryCard({ category }: { category: Category }) {
  const image = category.image || "/images/hero/agrovet-hero.jpg";

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

export default function ProductsPage({ searchParams }: ProductsPageProps) {
  return (
    <Suspense fallback={<CatalogueLoading />}>
      <CatalogueResults searchParams={searchParams} />
    </Suspense>
  );
}

async function CatalogueResults({ searchParams }: ProductsPageProps) {
  const rawParams = await searchParams;
  const query = parseSearchParams(rawParams);

  const categories = await withFallback(getCategories(), [], "catalogue categories");
  const allCategories = flattenCategories(categories);

  const selectedCategory = allCategories.find((category) => category.slug === query.category);

  const selectedParentCategory = selectedCategory
    ? categories.find((category) =>
        category.children.some((child) => child.slug === selectedCategory.slug),
      )
    : undefined;

  const hasSubcategories = Boolean(selectedCategory?.children.length);

  const preserveCategoryProductsView =
    rawParams.view === "products" ||
    (Array.isArray(rawParams.view) && rawParams.view.includes("products"));

  const showSubcategories = hasSubcategories && !preserveCategoryProductsView;

  // Parent categories display their subcategories first.
  // Products are fetched when the customer opens a product listing.
  const products = showSubcategories ? null : await getProducts({ ...query, pageSize: 12 });

  const pageTitle = selectedCategory?.name || "Farm inputs, all in one place.";

  const pageDescription =
    selectedCategory?.description ||
    "Explore quality agricultural supplies for your crops, livestock and everyday farm operations.";

  const displayedCount = showSubcategories
    ? (selectedCategory?.productCount ?? 0)
    : (products?.total ?? 0);

  const breadcrumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Categories", href: "/#categories" },
    ...(selectedParentCategory
      ? [
          {
            label: selectedParentCategory.name,
            href: `/products?category=${encodeURIComponent(selectedParentCategory.slug)}`,
          },
        ]
      : []),
    ...(selectedCategory ? [{ label: selectedCategory.name }] : [{ label: "Products" }]),
  ];

  return (
    <div className="min-h-screen bg-cream">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16">
          <div className="mb-6">
            <Breadcrumbs items={breadcrumbs} />
          </div>

          <p className="text-xs font-bold tracking-[0.2em] text-brand-700 uppercase">
            {selectedCategory ? "Explore our collection" : "The farm supply collection"}
          </p>

          <div className="mt-4 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <h1 className="font-display text-4xl font-semibold tracking-tight text-brand-900 sm:text-5xl">
                {pageTitle}
              </h1>

              <p className="mt-4 max-w-xl text-base leading-7 text-ink-soft">{pageDescription}</p>
            </div>

            <Link
              href="/#categories"
              className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-brand-800 transition-colors hover:text-brand-600"
            >
              Explore categories
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-soft">
            <span>
              <strong className="font-bold text-brand-900">{displayedCount}</strong> products
              available
            </span>

            {query.search && (
              <span>
                Search: <strong className="font-semibold text-brand-800">“{query.search}”</strong>
              </span>
            )}
          </div>
        </div>
      </section>

      {showSubcategories && selectedCategory ? (
        <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-brand-700 uppercase">
                Browse by category
              </p>

              <h2 className="mt-2 font-display text-2xl font-semibold text-brand-900 sm:text-3xl">
                Explore {selectedCategory.name}
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
                Select a category below to explore its available products.
              </p>
            </div>

            {selectedCategory.productCount > 0 && (
              <Link
                href={`/products?category=${encodeURIComponent(selectedCategory.slug)}&view=products`}
                className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-800 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                View all {selectedCategory.name} products
                <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {selectedCategory.children.map((category) => (
              <SubcategoryCard key={category.id} category={category} />
            ))}
          </div>

          {selectedCategory.productCount === 0 && (
            <p className="mt-8 rounded-xl border border-dashed border-line bg-white p-6 text-center text-sm text-ink-soft">
              Products are not currently available in this category.
            </p>
          )}
        </section>
      ) : (
        <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
          <div className="grid items-start gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
            <ProductFilters
              categories={allCategories}
              query={query}
              preserveCategoryProductsView={preserveCategoryProductsView}
            />

            <div className="min-w-0">
              <div className="mb-6 flex flex-col justify-between gap-2 border-b border-line pb-5 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-brand-900">
                    {query.search
                      ? "Search results"
                      : selectedCategory
                        ? `${selectedCategory.name} products`
                        : "Browse products"}
                  </h2>

                  <p className="mt-1 text-sm text-ink-soft">
                    {products
                      ? `Showing ${products.items.length} of ${products.total} products`
                      : "No matching products found"}
                  </p>
                </div>

                <p className="text-xs font-medium tracking-wide text-ink-soft uppercase">
                  Quality farm supplies
                </p>
              </div>

              {products && products.items.length > 0 ? (
                <>
                  <ProductGrid products={products.items} />

                  {products.pageCount > 1 && (
                    <nav
                      aria-label="Catalogue pagination"
                      className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6"
                    >
                      <p className="text-sm text-ink-soft">
                        Page {products.page} of {products.pageCount}
                      </p>

                      <div className="flex items-center gap-2">
                        {products.hasPrevious ? (
                          <Link
                            href={buildPageHref(
                              query,
                              products.page - 1,
                              preserveCategoryProductsView,
                            )}
                            className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-brand-800 transition-colors hover:border-brand-600 hover:bg-brand-50"
                          >
                            Previous
                          </Link>
                        ) : (
                          <span className="cursor-not-allowed rounded-full border border-line px-5 py-2.5 text-sm text-ink-soft opacity-50">
                            Previous
                          </span>
                        )}

                        {products.hasNext ? (
                          <Link
                            href={buildPageHref(
                              query,
                              products.page + 1,
                              preserveCategoryProductsView,
                            )}
                            className="rounded-full bg-brand-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                          >
                            Next
                          </Link>
                        ) : (
                          <span className="cursor-not-allowed rounded-full bg-brand-800 px-5 py-2.5 text-sm text-white opacity-40">
                            Next
                          </span>
                        )}
                      </div>
                    </nav>
                  )}
                </>
              ) : (
                <div className="rounded-card border border-dashed border-line bg-white px-6 py-16 text-center">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-50 text-2xl text-brand-800">
                    ⌕
                  </div>

                  <h3 className="mt-5 font-display text-2xl font-semibold text-brand-900">
                    No products found
                  </h3>

                  <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink-soft">
                    We couldn&apos;t find products matching those filters. Try another search or
                    clear some filters to explore the full catalogue.
                  </p>

                  <Link
                    href="/products"
                    className="mt-7 inline-flex rounded-full bg-brand-800 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                  >
                    Clear all filters
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
