// Directory: frontend/src/components/layout/SiteHeader.tsx

import { FALLBACK_SITE_SETTINGS } from "@/features/site/defaults";
import { getSiteSettings } from "@/features/site/api";
import { generalEnquiryMessage, withMessage } from "@/features/whatsapp/link";
import { withFallback } from "@/lib/api/fallback";

import SiteHeaderView from "./SiteHeaderView";

export default async function SiteHeader() {
  const settings = await withFallback(getSiteSettings(), FALLBACK_SITE_SETTINGS, "site settings");

  const whatsappUrl = withMessage(
    settings.whatsappUrl,
    generalEnquiryMessage(settings.whatsappGreeting),
  );

  return <SiteHeaderView businessName={settings.businessName} whatsappUrl={whatsappUrl} />;
}
