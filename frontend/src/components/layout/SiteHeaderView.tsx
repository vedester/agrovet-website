"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import WhatsAppIcon from "@/components/icons/WhatsAppIcon";

type SiteHeaderViewProps = {
  businessName: string;
  whatsappUrl: string;
};

const navigation = [
  { label: "Home", href: "/" },
  { label: "Shop All", href: "/products" },
  { label: "Categories", href: "/#categories" },
];

export default function SiteHeaderView({ businessName, whatsappUrl }: SiteHeaderViewProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hasSelectedCategory = searchParams.has("category");

  useEffect(() => {
    if (!menuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    if (href === "/products") {
      return pathname.startsWith("/products") && !hasSelectedCategory;
    }

    if (href === "/#categories") {
      return pathname.startsWith("/products") && hasSelectedCategory;
    }

    return false;
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-cream/95 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-5 sm:px-6">
        {/* Brand */}
        <Link
          href="/"
          onClick={closeMenu}
          className="flex min-w-0 items-center gap-3"
          aria-label={`${businessName} home`}
        >
          <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-800 text-xl text-white"
          >
            ✳
          </span>

          <span className="truncate font-display text-lg font-semibold tracking-tight text-brand-900 sm:text-xl">
            {businessName}
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
          {navigation.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "text-brand-800 after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:rounded-full after:bg-accent-500"
                    : "text-ink-soft hover:text-brand-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop WhatsApp CTA */}
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden shrink-0 items-center justify-center gap-2 rounded-pill bg-brand-800 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-500 md:inline-flex"
          >
            <WhatsAppIcon className="size-5" />
            WhatsApp Us
          </a>
        )}

        {/* Mobile menu button */}
        <button
          ref={menuButtonRef}
          type="button"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line text-2xl text-brand-900 transition-colors hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 md:hidden"
        >
          <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
        </button>
      </div>

      {/* Mobile navigation */}
      {menuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="border-t border-line bg-cream px-5 py-5 sm:px-6 md:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {navigation.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={closeMenu}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-brand-50 text-brand-800"
                      : "text-ink-soft hover:bg-brand-50 hover:text-brand-800"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center justify-center gap-2 rounded-pill bg-brand-800 px-5 py-3.5 text-center text-sm font-bold text-white transition-colors hover:bg-brand-700"
              >
                <WhatsAppIcon className="size-5" />
                WhatsApp Us
              </a>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
