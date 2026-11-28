

// Directory: frontend/src/app/(storefront)/layout.tsx

import { Suspense } from "react";

import SiteFooter from "@/components/layout/SiteFooter";
import SiteHeader from "@/components/layout/SiteHeader";
import { CartProvider } from "@/features/cart/cart-context";

export default function StorefrontLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CartProvider>
      <div className="flex min-h-dvh flex-col">
        <Suspense
        fallback={
          <header
            aria-label="Loading site header"
            className="h-20 border-b border-line bg-cream"
          />
        }
      >
        <SiteHeader />
      </Suspense>

      <main className="flex-1">{children}</main>

      <Suspense
        fallback={
          <footer
            aria-label="Loading site footer"
            className="min-h-64 bg-brand-900"
          />
        }
      >
        <SiteFooter />
        </Suspense>
      </div>
    </CartProvider>
  );
}
