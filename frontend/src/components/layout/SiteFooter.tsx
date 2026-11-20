// Directory: frontend/src/components/layout/SiteFooter.tsx

import Link from "next/link";

import { FALLBACK_SITE_SETTINGS } from "@/features/site/defaults";
import { getSiteSettings } from "@/features/site/api";
import { withFallback } from "@/lib/api/fallback";

import { generalEnquiryMessage, withMessage } from "@/features/whatsapp/link";

const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export default async function SiteFooter() {
  const settings = await withFallback(getSiteSettings(), FALLBACK_SITE_SETTINGS, "site settings");

  const whatsappUrl = withMessage(
    settings.whatsappUrl,
    generalEnquiryMessage(settings.whatsappGreeting),
  );

  const socialLinks = [
    { label: "Facebook", href: settings.facebookUrl },
    { label: "Instagram", href: settings.instagramUrl },
    { label: "TikTok", href: settings.tiktokUrl },
  ].filter((item) => item.href);

  return (
    <footer className="mt-auto bg-brand-900 text-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="font-display text-2xl font-semibold">
            {settings.businessName}
          </Link>

          {settings.tagline && (
            <p className="mt-4 max-w-xs text-sm leading-7 text-brand-100">{settings.tagline}</p>
          )}

          {settings.aboutText && (
            <p className="mt-3 max-w-xs text-sm leading-7 text-brand-100">{settings.aboutText}</p>
          )}
        </div>

        <div>
          <h2 className="font-semibold">Explore</h2>

          <ul className="mt-5 space-y-3 text-sm text-brand-100">
            <li>
              <Link href="/" className="hover:text-white">
                Home
              </Link>
            </li>
            <li>
              <Link href="/#categories" className="hover:text-white">
                Categories
              </Link>
            </li>
            <li>
              <Link href="/#products" className="hover:text-white">
                Featured products
              </Link>
            </li>
            <li>
              <Link href="/products" className="hover:text-white">
                All products
              </Link>
            </li>
            <li className="mt-4 border-t border-white/15 pt-4">
              <span className="mb-2 block text-xs text-brand-200">For store administrators</span>
              <Link
                href="/admin/login"
                className="font-semibold text-white transition-colors hover:text-brand-200"
              >
                Staff Login →
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-semibold">Contact us</h2>

          <ul className="mt-5 space-y-3 text-sm leading-6 text-brand-100">
            {settings.address && (
              <li>
                {settings.googleMapsUrl ? (
                  <a
                    href={settings.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white"
                  >
                    {settings.address}
                  </a>
                ) : (
                  settings.address
                )}
              </li>
            )}

            {settings.phone && (
              <li>
                <a href={`tel:${settings.phone}`} className="hover:text-white">
                  {settings.phone}
                </a>
              </li>
            )}

            {settings.email && (
              <li>
                <a href={`mailto:${settings.email}`} className="hover:text-white">
                  {settings.email}
                </a>
              </li>
            )}

            {whatsappUrl && (
              <li>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-white hover:text-brand-100"
                >
                  Chat with us on WhatsApp
                </a>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h2 className="font-semibold">Opening hours</h2>

          {settings.openingHours.length > 0 ? (
            <ul className="mt-5 space-y-3 text-sm text-brand-100">
              {settings.openingHours.map((day) => (
                <li key={day.day} className="flex justify-between gap-3">
                  <span>{DAY_LABELS[day.day] ?? day.day}</span>
                  <span>{day.closed ? "Closed" : `${day.opens} – ${day.closes}`}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-sm text-brand-100">Contact us for our current opening hours.</p>
          )}

          {settings.hoursNote && (
            <p className="mt-4 text-sm leading-6 text-brand-100">{settings.hoursNote}</p>
          )}
        </div>
      </div>

      {socialLinks.length > 0 && (
        <div className="border-t border-white/15">
          <div className="mx-auto flex max-w-7xl flex-wrap gap-6 px-6 py-5 text-sm text-brand-100">
            {socialLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-6 text-sm text-brand-100 sm:flex-row sm:items-center sm:justify-between">
          <p>Powered by HILOSTER TECHNOLOGIES</p>
        </div>
      </div>
    </footer>
  );
}
