import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getCategories, getProduct, getProducts } from "@/features/catalog/api";
import { getSiteSettings } from "@/features/site/api";
import { describeError } from "@/lib/api/fallback";

export const metadata = { title: "API check", robots: { index: false } };

export default function ApiCheckPage() {
  // Development-only page for checking the whole data path end to end.
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-5 py-12">
      <h1 className="text-4xl font-semibold text-brand-900">API check</h1>
      <p className="text-ink-soft">
        Development only. This page reads the backend through the typed API layer.
      </p>
      <Suspense fallback={<p className="text-ink-soft">Loading from the backend...</p>}>
        <ApiReport />
      </Suspense>
    </main>
  );
}

async function ApiReport() {
  try {
    const [site, categories, page, found] = await Promise.all([
      getSiteSettings(),
      getCategories(),
      getProducts({ pageSize: 3 }),
      getProducts({ search: "dap", pageSize: 3 }),
    ]);
    const first = page?.items[0];
    const detail = first ? await getProduct(first.slug) : null;

    const report = {
      site: {
        businessName: site.businessName || "(not set yet)",
        whatsappUrl: site.whatsappUrl || "(not set yet)",
        openingDays: site.openingHours.length,
      },
      categories: categories.map((category) => `${category.name} (${category.productCount})`),
      browse: {
        total: page?.total,
        pageCount: page?.pageCount,
        firstPage: page?.items.map(
          (item) =>
            `${item.name} | ${item.price.label} | ${item.inStock ? "in stock" : "out of stock"}`,
        ),
      },
      liveSearchForDap: found?.items.map((item) => item.name),
      firstProductDetail: detail
        ? {
            name: detail.name,
            category: detail.category.name,
            photos: detail.photos.map((photo) => photo.src),
          }
        : null,
    };

    return (
      <pre className="overflow-x-auto rounded-card bg-white p-5 text-sm shadow-soft ring-1 ring-line">
        {JSON.stringify(report, null, 2)}
      </pre>
    );
  } catch (error) {
    return (
      <p className="rounded-card bg-danger-soft p-4 text-danger">
        Backend problem: {describeError(error)}
      </p>
    );
  }
}
