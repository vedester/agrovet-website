export const WEEK_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

export type OpeningDay = { day: WeekDay; closed: boolean; opens: string; closes: string };

/** Business details for the storefront. Every field is public by design. */
export type SiteSettings = {
  businessName: string;
  tagline: string;
  aboutText: string;
  phone: string;
  whatsappNumber: string;
  whatsappUrl: string;
  whatsappGreeting: string;
  email: string;
  address: string;
  googleMapsUrl: string;
  openingHours: OpeningDay[];
  hoursNote: string;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  orderNote: string;
  seoTitle: string;
  seoDescription: string;
};
