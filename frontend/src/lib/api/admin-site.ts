import "server-only";

import { z } from "zod";

import { getBackendOrigin } from "@/config/backend";
import { withAdminAccessToken } from "@/lib/api/admin-session";
import { ApiError } from "@/lib/api/errors";
import { mapSiteSettings } from "@/features/site/mappers";
import { siteSettingsSchema, type SiteSettingsWire } from "@/features/site/schemas";
import type { SiteSettings } from "@/features/site/types";

const ADMIN_SITE_SETTINGS_PATH = "/api/v1/admin/site/";
const TIMEOUT_MS = 8_000;

const adminSiteSettingsSchema = siteSettingsSchema.extend({
  updated_at: z.string(),
});

export type AdminSiteSettings = SiteSettings & {
  updatedAt: string;
};

export type UpdateAdminSiteSettingsInput = Partial<Omit<SiteSettingsWire, "whatsapp_url">>;

async function requestAdminSiteSettings(
  accessToken: string,
  input?: UpdateAdminSiteSettingsInput,
): Promise<AdminSiteSettings> {
  let response: Response;

  try {
    response = await fetch(new URL(ADMIN_SITE_SETTINGS_PATH, getBackendOrigin()), {
      method: input === undefined ? "GET" : "PATCH",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...(input !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: input === undefined ? undefined : JSON.stringify(input),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (cause) {
    throw new ApiError(
      "unreachable",
      ADMIN_SITE_SETTINGS_PATH,
      "The website settings service could not be reached.",
      { cause },
    );
  }

  if (!response.ok) {
    const responseBody = await response.text();

    throw new ApiError(
      "http",
      ADMIN_SITE_SETTINGS_PATH,
      "The website settings request was rejected.",
      {
        status: response.status,
        responseBody,
      },
    );
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch (cause) {
    throw new ApiError(
      "bad_response",
      ADMIN_SITE_SETTINGS_PATH,
      "The website settings service returned invalid JSON.",
      { cause },
    );
  }

  const result = adminSiteSettingsSchema.safeParse(payload);

  if (!result.success) {
    console.error(
      "Website settings response schema validation failed:",
      JSON.stringify(result.error.issues, null, 2),
    );

    throw new ApiError(
      "bad_response",
      ADMIN_SITE_SETTINGS_PATH,
      "The website settings service returned an unexpected response.",
    );
  }

  return {
    ...mapSiteSettings(result.data),
    updatedAt: result.data.updated_at,
  };
}

export async function getAdminSiteSettings(): Promise<AdminSiteSettings> {
  return withAdminAccessToken(ADMIN_SITE_SETTINGS_PATH, (accessToken) =>
    requestAdminSiteSettings(accessToken),
  );
}

export async function updateAdminSiteSettings(
  input: UpdateAdminSiteSettingsInput,
): Promise<AdminSiteSettings> {
  return withAdminAccessToken(ADMIN_SITE_SETTINGS_PATH, (accessToken) =>
    requestAdminSiteSettings(accessToken, input),
  );
}
