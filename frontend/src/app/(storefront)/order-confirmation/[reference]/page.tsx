import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

type OrderConfirmationPageProps = {
  params: Promise<{
    reference: string;
  }>;
};

function ConfirmationLoading() {
  return (
    <main className="min-h-[65vh] bg-cream px-5 py-16">
      <div className="mx-auto max-w-2xl rounded-card border border-line bg-white p-10 text-center">
        <p className="text-sm text-ink-soft">
          Loading your order confirmation…
        </p>
      </div>
    </main>
  );
}

async function OrderConfirmationContent({
  params,
}: OrderConfirmationPageProps) {
  const { reference } = await params;

  if (!/^AGV-[A-F0-9]{12}$/i.test(reference)) {
    notFound();
  }

  return (
    <main className="min-h-[65vh] bg-cream px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <section className="rounded-card border border-line bg-white px-6 py-10 text-center shadow-soft sm:px-10 sm:py-12">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand-50 text-3xl text-brand-800">
            ✓
          </div>

          <p className="mt-6 text-xs font-bold tracking-[0.16em] text-brand-700 uppercase">
            Order submitted
          </p>

          <h1 className="mt-3 font-display text-3xl font-semibold text-brand-900 sm:text-4xl">
            Thank you for your order
          </h1>

          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-ink-soft">
            Your order has been received. Our team will review product
            availability, confirm your delivery fee and contact you using the
            details you provided.
          </p>

          <div className="mt-8 rounded-xl border border-line bg-sand/50 p-5">
            <p className="text-xs font-bold tracking-wide text-ink-soft uppercase">
              Your order reference
            </p>
            <p className="mt-2 break-all font-mono text-xl font-bold tracking-wide text-brand-900">
              {reference.toUpperCase()}
            </p>
            <p className="mt-2 text-xs leading-5 text-ink-soft">
              Keep this reference for enquiries about your order.
            </p>
          </div>

          <div className="mt-6 space-y-3 text-left">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                Awaiting seller confirmation
              </p>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                Your order is not yet confirmed. The shop will verify the
                requested products and communicate the delivery fee before
                finalising the order.
              </p>
            </div>

            <div className="rounded-xl border border-line p-4">
              <p className="text-sm font-semibold text-brand-900">
                Payment: Cash on Delivery
              </p>
              <p className="mt-1 text-sm leading-6 text-ink-soft">
                No online payment has been collected. Pay when delivery or
                collection arrangements are confirmed by the shop.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/products"
              className="inline-flex min-h-12 items-center justify-center rounded-pill bg-brand-800 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
            >
              Continue shopping
            </Link>

            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-pill border border-line px-6 py-3 text-sm font-bold text-brand-800 transition-colors hover:bg-brand-50"
            >
              Back to home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function OrderConfirmationPage({
  params,
}: OrderConfirmationPageProps) {
  return (
    <Suspense fallback={<ConfirmationLoading />}>
      <OrderConfirmationContent params={params} />
    </Suspense>
  );
}
