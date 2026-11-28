"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useCart } from "@/features/cart/cart-context";
import { formatKes } from "@/lib/money";

type OrderResponse = {
  detail: string;
  order: {
    reference: string;
    status: string;
    status_label: string;
    subtotal: string;
    delivery_fee_confirmed: boolean;
  };
};

function getErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "We could not submit your order. Please try again.";
  }

  const data = payload as {
    detail?: unknown;
    errors?: Record<string, unknown>;
  };

  if (typeof data.detail === "string") {
    return data.detail;
  }

  if (data.errors) {
    const firstError = Object.values(data.errors).flat()[0];

    if (typeof firstError === "string") {
      return firstError;
    }
  }

  return "Please check your details and try again.";
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotalCents, hydrated, clearCart } = useCart();

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting || items.length === 0) return;

    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/shop/orders", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim(),
          customer_phone: customerPhone.trim(),
          delivery_address: deliveryAddress.trim(),
          delivery_instructions: deliveryInstructions.trim(),
          payment_method: "cash_on_delivery",
          items: items.map((item) => ({
            product_id: item.productId,
            quantity: item.quantity,
          })),
        }),
      });

      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(payload));
      }

      if (
        !payload ||
        typeof payload !== "object" ||
        !("order" in payload) ||
        typeof payload.order !== "object" ||
        payload.order === null ||
        !("reference" in payload.order) ||
        typeof payload.order.reference !== "string"
      ) {
        throw new Error(
          "The order response was incomplete. Please contact the shop before trying again.",
        );
      }

      const result = payload as OrderResponse;

      clearCart();
      router.push(
        `/order-confirmation/${encodeURIComponent(result.order.reference)}`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Something went wrong. Please try again.",
      );
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-16 text-ink-soft">
        Loading checkout…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] bg-cream">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h1 className="font-display text-3xl font-semibold text-brand-900">
            Your cart is empty
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink-soft">
            Add products to your cart before proceeding to checkout.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex min-h-12 items-center rounded-pill bg-brand-800 px-6 py-3 text-sm font-bold text-white hover:bg-brand-700"
          >
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] bg-cream">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-bold tracking-[0.16em] text-brand-700 uppercase">
          Secure order submission
        </p>

        <h1 className="mt-2 font-display text-3xl font-semibold text-brand-900 sm:text-4xl">
          Checkout
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">
          Provide your contact and delivery details. Our team will review your
          order, confirm product availability and calculate the delivery fee
          before finalising it.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_360px]"
        >
          <div className="space-y-6">
            <section className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-7">
              <h2 className="font-display text-xl font-semibold text-brand-900">
                Contact information
              </h2>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-sm font-semibold text-brand-900">
                    Full name *
                  </span>
                  <input
                    required
                    maxLength={200}
                    autoComplete="name"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    className="mt-2 min-h-12 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-brand-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    placeholder="Your full name"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-brand-900">
                    Phone number *
                  </span>
                  <input
                    required
                    type="tel"
                    maxLength={30}
                    autoComplete="tel"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    className="mt-2 min-h-12 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-brand-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    placeholder="e.g. 07XX XXX XXX"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-brand-900">
                    Email address
                  </span>
                  <input
                    type="email"
                    maxLength={254}
                    autoComplete="email"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    className="mt-2 min-h-12 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-brand-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    placeholder="you@example.com"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-7">
              <h2 className="font-display text-xl font-semibold text-brand-900">
                Delivery details
              </h2>

              <div className="mt-5 space-y-5">
                <label className="block">
                  <span className="text-sm font-semibold text-brand-900">
                    Delivery location / address *
                  </span>
                  <textarea
                    required
                    maxLength={2000}
                    rows={3}
                    autoComplete="street-address"
                    value={deliveryAddress}
                    onChange={(event) =>
                      setDeliveryAddress(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-brand-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    placeholder="County, town, estate, road, building or a nearby landmark"
                  />
                  <span className="mt-2 block text-xs leading-5 text-ink-soft">
                    Include enough detail for the seller to estimate the
                    delivery fee and arrange fulfilment.
                  </span>
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-brand-900">
                    Additional delivery instructions
                  </span>
                  <textarea
                    maxLength={2000}
                    rows={3}
                    value={deliveryInstructions}
                    onChange={(event) =>
                      setDeliveryInstructions(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-brand-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    placeholder="Optional directions or preferred delivery arrangements"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-7">
              <h2 className="font-display text-xl font-semibold text-brand-900">
                Payment method
              </h2>

              <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
                <p className="font-semibold text-brand-900">
                  Cash on Delivery
                </p>
                <p className="mt-1 text-sm leading-6 text-ink-soft">
                  Payment is made when your order is delivered or collected,
                  according to the arrangement confirmed by the shop.
                </p>
              </div>

              <p className="mt-3 text-xs leading-5 text-ink-soft">
                M-Pesa payments are not yet available through online checkout.
              </p>
            </section>
          </div>

          <aside className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-6 lg:sticky lg:top-6">
            <h2 className="font-display text-xl font-semibold text-brand-900">
              Order summary
            </h2>

            <div className="mt-5 space-y-4">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center gap-3"
                >
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-brand-50">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-xl text-brand-300">
                        ✳
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-brand-900">
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">
                      Qty {item.quantity}
                    </p>
                  </div>

                  <p className="shrink-0 text-sm font-semibold text-brand-900">
                    {formatKes(item.unitPriceCents * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-3 border-t border-line pt-5 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-ink-soft">Provisional subtotal</span>
                <strong className="text-brand-900">
                  {formatKes(subtotalCents)}
                </strong>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-ink-soft">Delivery fee</span>
                <strong className="text-brand-900">To be confirmed</strong>
              </div>
            </div>

            <p className="mt-4 rounded-xl bg-sand/70 p-3 text-xs leading-5 text-ink-soft">
              This is not the final payable total. The seller will confirm
              product availability, final pricing and the delivery fee before
              accepting the order.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 flex min-h-13 w-full items-center justify-center rounded-pill bg-brand-800 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting order…" : "Submit order"}
            </button>

            <Link
              href="/cart"
              className="mt-4 block text-center text-sm font-semibold text-brand-800 hover:underline"
            >
              Return to cart
            </Link>
          </aside>
        </form>
      </div>
    </div>
  );
}
