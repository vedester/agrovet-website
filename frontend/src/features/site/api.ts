// This file exposes functions that other parts of your frontend can call without knowing the details of how Django is accessed

import { cacheLife, cacheTag } from "next/cache";

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
  cacheTag("site-settings");

  return mapSiteSettings(await backendGet("/site/", siteSettingsSchema));
}
