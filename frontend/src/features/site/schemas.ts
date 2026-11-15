import { z } from "zod";

import { WEEK_DAYS } from "./types";

const openingDaySchema = z.object({
  day: z.enum(WEEK_DAYS),
  closed: z.boolean(),
  // A closed day may omit its times.
  opens: z.string().default(""),
  closes: z.string().default(""),
});

/** Shape of GET /api/v1/site/ exactly as the backend sends it. */
export const siteSettingsSchema = z.object({
  business_name: z.string(),
  tagline: z.string(),
  about_text: z.string(),
  phone: z.string(),
  whatsapp_number: z.string(),
  whatsapp_url: z.string(),
  whatsapp_greeting: z.string(),
  email: z.string(),
  address: z.string(),
  google_maps_url: z.string(),
  opening_hours: z.array(openingDaySchema),
  hours_note: z.string(),
  facebook_url: z.string(),
  instagram_url: z.string(),
  tiktok_url: z.string(),
  order_note: z.string(),
  seo_title: z.string(),
  seo_description: z.string(),
});

export type SiteSettingsWire = z.infer<typeof siteSettingsSchema>;
