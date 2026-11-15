import type { SiteSettingsWire } from "./schemas";
import type { SiteSettings } from "./types";

export function mapSiteSettings(wire: SiteSettingsWire): SiteSettings {
  return {
    businessName: wire.business_name,
    tagline: wire.tagline,
    aboutText: wire.about_text,
    phone: wire.phone,
    whatsappNumber: wire.whatsapp_number,
    whatsappUrl: wire.whatsapp_url,
    whatsappGreeting: wire.whatsapp_greeting,
    email: wire.email,
    address: wire.address,
    googleMapsUrl: wire.google_maps_url,
    openingHours: wire.opening_hours,
    hoursNote: wire.hours_note,
    facebookUrl: wire.facebook_url,
    instagramUrl: wire.instagram_url,
    tiktokUrl: wire.tiktok_url,
    orderNote: wire.order_note,
    seoTitle: wire.seo_title,
    seoDescription: wire.seo_description,
  };
}
