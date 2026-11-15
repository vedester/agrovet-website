import { describe, expect, it } from "vitest";

import { siteSettingsWire } from "@/test/fixtures";

import { mapSiteSettings } from "./mappers";
import { siteSettingsSchema } from "./schemas";

describe("site settings", () => {
  it("maps the public settings to camelCase and defaults missing hours", () => {
    const settings = mapSiteSettings(siteSettingsSchema.parse(siteSettingsWire));

    expect(settings.businessName).toBe("Mwangaza Agrovet");
    expect(settings.whatsappUrl).toBe("https://wa.me/254712345678");
    expect(settings.openingHours[1]).toEqual({ day: "sun", closed: true, opens: "", closes: "" });
  });

  it("rejects malformed settings", () => {
    const badFlag = { ...siteSettingsWire, opening_hours: [{ day: "mon", closed: "no" }] };
    const badDay = { ...siteSettingsWire, opening_hours: [{ day: "funday", closed: true }] };

    expect(siteSettingsSchema.safeParse(badFlag).success).toBe(false);
    expect(siteSettingsSchema.safeParse(badDay).success).toBe(false);
  });
});
