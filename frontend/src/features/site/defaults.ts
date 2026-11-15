import type { SiteSettings } from "./types";

/** Shown only when the backend cannot be reached, so the layout still renders. */
export const FALLBACK_SITE_SETTINGS: SiteSettings = {
  businessName: "Agrovet",
  tagline: "",
  aboutText: "",
  phone: "",
  whatsappNumber: "",
  whatsappUrl: "",
  whatsappGreeting: "Hello, I would like to order:",
  email: "",
  address: "",
  googleMapsUrl: "",
  openingHours: [],
  hoursNote: "",
  facebookUrl: "",
  instagramUrl: "",
  tiktokUrl: "",
  orderNote: "",
  seoTitle: "",
  seoDescription: "",
};
