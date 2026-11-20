// Directory: frontend/src/components/catalog/ProductFilters.tsx

import Link from "next/link";

import type { ProductQuery } from "@/features/catalog/query";
import type { Category } from "@/features/catalog/types";

type ProductFiltersProps = {
  categories: Category[];
  query: ProductQuery;
  preserveCategoryProductsView?: boolean;
};

export default function ProductFilters({
  categories,
  query,
  preserveCategoryProductsView = false,
}: ProductFiltersProps) {
  return (
    <aside className="rounded-card border border-line bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-brand-900">Refine products</h2>

        <Link
          href="/products"
          className="text-xs font-semibold text-brand-700 hover:text-brand-900"
        >
          Clear all
        </Link>
      </div>

      <form action="/products" method="GET" className="mt-6 space-y-7">
        {preserveCategoryProductsView && <input type="hidden" name="view" value="products" />}
        <div>
          <label
            htmlFor="catalogue-search"
            className="mb-2 block text-sm font-semibold text-brand-900"
          >
            Search products
          </label>

          <input
            id="catalogue-search"
            type="search"
            name="q"
            defaultValue={query.search ?? ""}
            placeholder="e.g. DAP fertilizer"
            maxLength={100}
            className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm text-ink transition outline-none focus:border-brand-600 focus:bg-white"
          />
        </div>

        <div>
          <label
            htmlFor="catalogue-category"
            className="mb-2 block text-sm font-semibold text-brand-900"
          >
            Product category
          </label>

          <select
            id="catalogue-category"
            name="category"
            defaultValue={query.category ?? ""}
            className="w-full rounded-xl border border-line bg-white px-3 py-3 text-sm text-ink transition outline-none focus:border-brand-600"
          >
            <option value="">All categories</option>

            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="catalogue-sort"
            className="mb-2 block text-sm font-semibold text-brand-900"
          >
            Sort products
          </label>

          <select
            id="catalogue-sort"
            name="sort"
            defaultValue={query.sort ?? "name"}
            className="w-full rounded-xl border border-line bg-white px-3 py-3 text-sm text-ink transition outline-none focus:border-brand-600"
          >
            <option value="name">Name: A to Z</option>
            <option value="price-low">Price: Low to high</option>
            <option value="price-high">Price: High to low</option>
            <option value="newest">Newest first</option>
          </select>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-brand-900">Price range</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="catalogue-min" className="mb-1.5 block text-xs text-ink-soft">
                Minimum (KES)
              </label>

              <input
                id="catalogue-min"
                type="number"
                name="min"
                min="0"
                step="1"
                defaultValue={query.minPrice ?? ""}
                placeholder="0"
                className="w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label htmlFor="catalogue-max" className="mb-1.5 block text-xs text-ink-soft">
                Maximum (KES)
              </label>

              <input
                id="catalogue-max"
                type="number"
                name="max"
                min="0"
                step="1"
                defaultValue={query.maxPrice ?? ""}
                placeholder="10000"
                className="w-full rounded-xl border border-line bg-white px-3 py-3 text-sm outline-none focus:border-brand-600"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-line pt-5">
          <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
            <input
              type="checkbox"
              name="instock"
              value="true"
              defaultChecked={query.inStock === true}
              className="size-4 accent-brand-800"
            />
            In-stock products
          </label>

          <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
            <input
              type="checkbox"
              name="featured"
              value="true"
              defaultChecked={query.featured === true}
              className="size-4 accent-brand-800"
            />
            Featured products
          </label>
        </div>

        <button
          type="submit"
          className="w-full rounded-full bg-brand-800 px-5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
        >
          Apply filters
        </button>
      </form>

      <div className="mt-6 border-t border-line pt-5">
        <p className="text-xs leading-6 text-ink-soft">
          Need help choosing the right farm input? Contact our team for product guidance and
          availability.
        </p>
      </div>
    </aside>
  );
}
