"use client";

import Image from "next/image";
import Link from "next/link";

import { useCart } from "@/features/cart/cart-context";
import { formatKes } from "@/lib/money";

export default function CartPage() {
  const {
    items,
    subtotalCents,
    hydrated,
    updateQuantity,
    removeItem,
  } = useCart();

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-16 text-ink-soft">
        Loading your cart…
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] bg-cream">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-bold tracking-[0.16em] text-brand-700 uppercase">
          Your selection
        </p>

        <h1 className="mt-2 font-display text-3xl font-semibold text-brand-900 sm:text-4xl">
          Shopping cart
        </h1>

        {items.length === 0 ? (
          <div className="mt-8 rounded-card border border-line bg-white p-8 text-center shadow-soft sm:p-12">
            <p className="font-display text-2xl font-semibold text-brand-900">
              Your cart is empty
            </p>

            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Browse the catalogue and add products you would like to order.
            </p>

            <Link
              href="/products"
              className="mt-6 inline-flex min-h-12 items-center rounded-pill bg-brand-800 px-6 py-3 text-sm font-bold text-white hover:bg-brand-700"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_320px]">
            <section aria-label="Cart items" className="space-y-4">
              {items.map((item) => (
                <article
                  key={item.productId}
                  className="flex gap-4 rounded-card border border-line bg-white p-4 shadow-soft sm:p-5"
                >
                  <Link
                    href={`/products/${item.slug}`}
                    className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-brand-50 sm:size-28"
                  >
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt=""
                        fill
                        sizes="112px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-3xl text-brand-300">
                        ✳
                      </span>
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${item.slug}`}
                      className="font-semibold text-brand-900 hover:text-brand-700"
                    >
                      {item.name}
                    </Link>

                    {(item.sku || item.packSize) && (
                      <p className="mt-1 text-xs text-ink-soft">
                        {[item.sku, item.packSize].filter(Boolean).join(" · ")}
                      </p>
                    )}

                    <p className="mt-2 text-sm font-bold text-brand-800">
                      {item.priceLabel}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
                        Qty
                        <input
                          aria-label={`Quantity for ${item.name}`}
                          type="number"
                          min={1}
                          max={10000}
                          value={item.quantity}
                          onChange={(event) =>
                            updateQuantity(
                              item.productId,
                              Number(event.target.value),
                            )
                          }
                          className="w-20 rounded-lg border border-line px-2 py-1.5 text-sm text-brand-900 outline-none focus:border-brand-500"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="text-xs font-semibold text-red-700 underline-offset-2 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <p className="hidden shrink-0 text-sm font-bold text-brand-900 sm:block">
                    {formatKes(item.unitPriceCents * item.quantity)}
                  </p>
                </article>
              ))}

              <Link
                href="/products"
                className="inline-flex py-2 text-sm font-semibold text-brand-800 hover:underline"
              >
                ← Continue shopping
              </Link>
            </section>

            <aside className="rounded-card border border-line bg-white p-5 shadow-soft sm:p-6">
              <h2 className="font-display text-xl font-semibold text-brand-900">
                Order summary
              </h2>

              <div className="mt-5 flex justify-between gap-4 border-b border-line pb-4 text-sm">
                <span className="text-ink-soft">Provisional subtotal</span>
                <strong className="text-brand-900">
                  {formatKes(subtotalCents)}
                </strong>
              </div>

              <div className="mt-4 flex justify-between gap-4 text-sm">
                <span className="text-ink-soft">Delivery fee</span>
                <span className="font-semibold text-brand-900">
                  To be confirmed
                </span>
              </div>

              <p className="mt-4 text-xs leading-5 text-ink-soft">
                Product availability, final prices and delivery fee will be
                confirmed by the seller after you submit your order.
              </p>

              <Link
                href="/checkout"
                className="mt-6 flex min-h-12 w-full items-center justify-center rounded-pill bg-brand-800 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
              >
                Continue to checkout
              </Link>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
