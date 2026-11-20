// Directory: frontend/src/app/products/[slug]/page.tsx

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import ProductGallery from "@/components/catalog/ProductGallery";
import ProductGrid from "@/components/catalog/ProductGrid";
import StockBadge from "@/components/catalog/StockBadge";
import Breadcrumbs, { type Crumb } from "@/components/ui/Breadcrumbs";
import { getProduct, getProducts } from "@/features/catalog/api";
import { getSiteSettings } from "@/features/site/api";
import { FALLBACK_SITE_SETTINGS } from "@/features/site/defaults";
import { productEnquiryMessage, withMessage } from "@/features/whatsapp/link";
import { withFallback } from "@/lib/api/fallback";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return { title: "Product not found" };
  }

  const summary = product.description.replace(/\s+/g, " ").trim().slice(0, 155);

  return {
    title: product.name,
    description:
      summary ||
      `${product.name}${product.packSize ? ` (${product.packSize})` : ""} at ${product.price.label}. Enquire about availability and ordering on WhatsApp.`,
  };
}

export default function ProductPage({ params }: ProductPageProps) {
  // Keep the product lookup inside Suspense for Next.js Cache Components.
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductContent params={params} />
    </Suspense>
  );
}

async function ProductContent({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const settings = await withFallback(getSiteSettings(), FALLBACK_SITE_SETTINGS, "site settings");

  const enquiryUrl = withMessage(settings.whatsappUrl, productEnquiryMessage(product));

  const details = [product.brand, product.packSize].filter(Boolean).join(" · ");

  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: "Categories", href: "/#categories" },
    ...(product.category.parent
      ? [
          {
            label: product.category.parent.name,
            href: `/products?category=${encodeURIComponent(product.category.parent.slug)}`,
          },
        ]
      : []),
    {
      label: product.category.name,
      href: `/products?category=${encodeURIComponent(product.category.slug)}`,
    },
    { label: product.name },
  ];

  return (
    <div className="bg-cream">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs items={crumbs} />

        <div className="mt-6 grid items-start gap-8 lg:grid-cols-2 lg:gap-14">
          <ProductGallery photos={product.photos} productName={product.name} />

          <div>
            <StockBadge inStock={product.inStock} />

            <h1 className="mt-4 font-display text-3xl font-semibold text-brand-900 sm:text-4xl">
              {product.name}
            </h1>

            {details && <p className="mt-2 text-ink-soft">{details}</p>}

            <p className="mt-6 font-display text-4xl font-semibold text-brand-800">
              {product.price.label}
            </p>

            {product.requiresAdvice && (
              <div className="mt-5 rounded-card border border-accent-200 bg-accent-50 p-4 text-sm leading-6 text-accent-700">
                <strong className="font-semibold">Professional guidance recommended.</strong> Please
                consult our team for appropriate usage, dosage and handling information before using
                this product.
              </div>
            )}

            {/* Primary product enquiry action */}
            {enquiryUrl ? (
              <div className="mt-7">
                <a
                  href={enquiryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Enquire about ${product.name} on WhatsApp`}
                  className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-pill bg-brand-800 px-7 py-4 text-center text-sm font-bold text-white shadow-soft transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-500 sm:w-auto"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="size-5 shrink-0"
                  >
                    <path d="M20.52 3.48A11.83 11.83 0 0 0 12.08 0C5.48 0 .11 5.37.11 11.97c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.63a11.94 11.94 0 0 0 5.87 1.54h.01c6.6 0 11.97-5.37 11.97-11.97 0-3.2-1.25-6.21-3.53-8.46ZM12.08 21.9h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.68.97.98-3.59-.23-.37a9.88 9.88 0 0 1-1.51-5.35c0-5.44 4.43-9.87 9.87-9.87a9.8 9.8 0 0 1 6.98 2.89 9.8 9.8 0 0 1 2.89 6.99c0 5.44-4.43 9.87-9.89 9.87Zm5.42-7.39c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.79-1.67-2.09-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.5 1.69.64.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
                  </svg>

                  {product.inStock ? "Enquire on WhatsApp" : "Check availability on WhatsApp"}
                </a>

                <p className="mt-3 max-w-lg text-sm leading-6 text-ink-soft">
                  {product.inStock
                    ? "Chat with our team to confirm current stock, final pricing and fulfilment options."
                    : "Ask our team about restocking or suitable alternatives."}
                </p>
              </div>
            ) : (
              <div className="mt-7 rounded-card border border-line bg-sand/70 p-4">
                <p className="text-sm font-semibold text-brand-900">
                  WhatsApp enquiries unavailable
                </p>
                <p className="mt-1 text-sm leading-6 text-ink-soft">
                  Please contact the shop directly for product availability and pricing information.
                </p>
              </div>
            )}

            {/* Transparent order expectations */}
            <p className="mt-4 text-xs leading-5 text-ink-soft">
              Sending an enquiry does not place or confirm an order. Your order is only accepted
              after our team confirms availability, final pricing and the collection or delivery
              arrangements.
            </p>

            {settings.orderNote && (
              <p className="mt-3 border-l-2 border-line pl-3 text-sm leading-6 text-ink-soft">
                <span className="font-semibold text-brand-800">Shop information: </span>
                {settings.orderNote}
              </p>
            )}

            {/* Product specifications */}
            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-6 text-sm">
              <div>
                <dt className="text-ink-soft">Product code</dt>
                <dd className="mt-1 font-semibold text-brand-900">{product.sku}</dd>
              </div>

              <div>
                <dt className="text-ink-soft">Category</dt>
                <dd className="mt-1 font-semibold text-brand-900">{product.category.name}</dd>
              </div>

              {product.packSize && (
                <div>
                  <dt className="text-ink-soft">Pack size</dt>
                  <dd className="mt-1 font-semibold text-brand-900">{product.packSize}</dd>
                </div>
              )}

              {product.brand && (
                <div>
                  <dt className="text-ink-soft">Brand</dt>
                  <dd className="mt-1 font-semibold text-brand-900">{product.brand}</dd>
                </div>
              )}
            </dl>

            {/* Product description */}
            {product.description && (
              <section className="mt-8 border-t border-line pt-6">
                <h2 className="font-display text-2xl font-semibold text-brand-900">
                  About this product
                </h2>

                <p className="mt-3 max-w-prose leading-7 whitespace-pre-line text-ink-soft">
                  {product.description}
                </p>
              </section>
            )}
          </div>
        </div>

        <Suspense fallback={null}>
          <RelatedProducts
            categorySlug={product.category.slug}
            categoryName={product.category.name}
            currentId={product.id}
          />
        </Suspense>
      </div>
    </div>
  );
}

async function RelatedProducts({
  categorySlug,
  categoryName,
  currentId,
}: {
  categorySlug: string;
  categoryName: string;
  currentId: number;
}) {
  const page = await withFallback(
    getProducts({ category: categorySlug, pageSize: 5 }),
    null,
    "related products",
  );

  const related = page?.items.filter((item) => item.id !== currentId).slice(0, 4) ?? [];

  if (related.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="related-heading" className="mt-16 border-t border-line pt-12">
      <h2 id="related-heading" className="font-display text-3xl font-semibold text-brand-900">
        More from {categoryName}
      </h2>

      <div className="mt-8">
        <ProductGrid products={related} className="grid-cols-2 lg:grid-cols-4" />
      </div>
    </section>
  );
}

function ProductSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-5 py-10 sm:px-6">
      <div className="h-4 w-64 rounded bg-sand" />

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <div className="aspect-square rounded-card bg-sand" />

        <div className="space-y-4">
          <div className="h-6 w-24 rounded bg-sand" />
          <div className="h-10 w-3/4 rounded bg-sand" />
          <div className="h-8 w-40 rounded bg-sand" />
          <div className="h-14 w-full rounded-pill bg-sand sm:w-80" />
        </div>
      </div>
    </div>
  );
}
