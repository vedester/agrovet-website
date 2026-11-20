import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
      <p className="text-sm font-bold tracking-[0.18em] text-brand-700 uppercase">Page not found</p>

      <h1 className="mt-3 font-display text-4xl font-semibold text-brand-900">
        We could not find that page.
      </h1>

      <p className="mt-4 max-w-md leading-7 text-ink-soft">
        The product or page may have been moved or removed. Try a search, or browse everything we
        stock.
      </p>

      <form action="/products" method="GET" className="mt-8 flex w-full max-w-md gap-2">
        <label htmlFor="not-found-search" className="sr-only">
          Search products
        </label>
        <input
          id="not-found-search"
          type="search"
          name="q"
          placeholder="Search products, for example DAP"
          className="min-w-0 flex-1 rounded-pill border border-line bg-white px-5 py-3 text-sm outline-none focus:border-brand-600"
        />
        <button
          type="submit"
          className="rounded-pill bg-brand-800 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Search
        </button>
      </form>

      <Link href="/products" className="mt-6 font-semibold text-brand-800 hover:text-brand-600">
        Browse all products
      </Link>
    </div>
  );
}
