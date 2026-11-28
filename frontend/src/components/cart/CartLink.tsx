"use client";

import Link from "next/link";

import { useCart } from "@/features/cart/cart-context";

export default function CartLink({
  onClick,
}: {
  onClick?: () => void;
}) {
  const { itemCount, hydrated } = useCart();

  return (
    <Link
      href="/cart"
      onClick={onClick}
      aria-label={`Shopping cart, ${hydrated ? itemCount : 0} items`}
      className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-pill border border-brand-200 px-4 py-2 text-sm font-bold text-brand-900 transition-colors hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
    >
      <span aria-hidden="true">🛒</span>
      Cart
      <span className="flex min-w-6 items-center justify-center rounded-full bg-accent-500 px-1.5 py-0.5 text-xs font-extrabold text-brand-950">
        {hydrated ? itemCount : 0}
      </span>
    </Link>
  );
}
