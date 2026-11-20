// Directory: frontend/src/components/home/HomeHero.tsx

import Image from "next/image";
import Link from "next/link";

import { FALLBACK_SITE_SETTINGS } from "@/features/site/defaults";
import { getSiteSettings } from "@/features/site/api";
import { withFallback } from "@/lib/api/fallback";

import { generalEnquiryMessage, withMessage } from "@/features/whatsapp/link";

export default async function HomeHero() {
  const settings = await withFallback(getSiteSettings(), FALLBACK_SITE_SETTINGS, "site settings");

  const whatsappUrl = withMessage(
    settings.whatsappUrl,
    generalEnquiryMessage(settings.whatsappGreeting),
  );

  return (
    <section id="home" className="overflow-hidden bg-cream">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24 lg:gap-16">
        {/* Hero content */}
        <div className="max-w-xl">
          <p className="mb-5 text-sm font-bold tracking-[0.18em] text-brand-700 uppercase">
            {settings.tagline || "Quality agricultural solutions"}
          </p>

          <h1 className="font-display text-5xl leading-[1.08] font-semibold tracking-tight text-brand-900 sm:text-6xl lg:text-7xl">
            Better farming starts with the right inputs.
          </h1>

          <p className="mt-6 line-clamp-4 max-w-lg text-base leading-8 text-ink-soft sm:text-lg">
            {settings.aboutText ||
              "Find quality farm inputs, crop care products and animal health essentials to support healthier farms and better harvests."}
          </p>

          {/* Calls to action */}
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-full bg-brand-800 px-7 py-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Explore products
              <span aria-hidden="true" className="ml-2">
                →
              </span>
            </Link>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-brand-800 px-7 py-4 text-sm font-semibold text-brand-900 transition-colors hover:bg-brand-50"
              >
                Talk to us
              </a>
            )}
          </div>

          <p className="mt-8 text-sm text-ink-soft">
            Supporting farmers with the products they need to grow.
          </p>
        </div>

        {/* Hero image */}
        <div className="relative min-h-[380px] overflow-hidden rounded-[2rem] bg-brand-100 sm:min-h-[480px] lg:min-h-[580px]">
          <Image
            src="/images/hero/agrovet-hero.jpg"
            alt="Aerial view of green agricultural fields and cultivated farmland"
            fill
            priority
            loading="eager"
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />

          <div className="absolute inset-0 bg-linear-to-t from-brand-950/30 via-transparent to-transparent" />

          <div className="absolute bottom-6 left-6 rounded-2xl border border-white/30 bg-white/90 px-5 py-4 shadow-lg backdrop-blur-sm">
            <p className="text-xs font-semibold tracking-wider text-brand-700 uppercase">
              Growing together
            </p>
            <p className="mt-1 font-display text-xl font-semibold text-brand-900">
              Healthier farms. Better harvests.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
