import { cacheLife } from "next/cache";

import { backendGet } from "@/lib/api/server";

import { mapSiteSettings } from "./mappers";
import { siteSettingsSchema } from "./schemas";
import type { SiteSettings } from "./types";

/**
 * Business settings, cached (see the "siteSettings" profile in next.config.ts).
 * Throws when the backend is down. Use withFallback(..., FALLBACK_SITE_SETTINGS)
 * where the page should still render.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  "use cache";
  cacheLife("siteSettings");

  return mapSiteSettings(await backendGet("/site/", siteSettingsSchema));
}
