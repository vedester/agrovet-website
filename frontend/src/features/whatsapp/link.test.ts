// Directory: frontend/src/features/whatsapp/link.test.ts

import { describe, expect, it } from "vitest";

import { generalEnquiryMessage, productEnquiryMessage, withMessage } from "./link";

const product = {
  name: "DAP Fertilizer",
  packSize: "50 kg bag",
  price: { cents: 450000, label: "KES 4,500" },
  sku: "FERT-DAP-50",
  inStock: true,
};

describe("withMessage", () => {
  it("adds an encoded message to a WhatsApp link", () => {
    const result = withMessage("https://wa.me/254712345678", "Hello & welcome\nPrice: KES 100");

    const url = new URL(result);

    expect(url.searchParams.get("text")).toBe("Hello & welcome\nPrice: KES 100");
  });

  it("returns an empty string when WhatsApp is not configured", () => {
    expect(withMessage("", "Hello")).toBe("");
  });

  it("returns an empty string for an invalid URL", () => {
    expect(withMessage("not-a-url", "Hello")).toBe("");
  });

  it("rejects unrecognised hosts", () => {
    expect(withMessage("https://example.com/chat", "Hello")).toBe("");
  });

  it("rejects non-HTTPS URLs", () => {
    expect(withMessage("http://wa.me/254712345678", "Hello")).toBe("");
  });

  it("replaces an existing text parameter", () => {
    const result = withMessage("https://wa.me/254712345678?text=Old+message&app=1", "New message");

    const url = new URL(result);

    expect(url.searchParams.get("text")).toBe("New message");
    expect(url.searchParams.get("app")).toBe("1");
  });
});

describe("generalEnquiryMessage", () => {
  it("uses the configured greeting", () => {
    expect(generalEnquiryMessage("Hello, I would like to order:")).toBe(
      "Hello, I would like to order:",
    );
  });

  it("provides a fallback when no greeting is configured", () => {
    expect(generalEnquiryMessage("")).toContain("make an enquiry");
  });

  it("trims unnecessary whitespace", () => {
    expect(generalEnquiryMessage("  Hello there  ")).toBe("Hello there");
  });
});

describe("productEnquiryMessage", () => {
  it("includes product details and asks for availability confirmation", () => {
    const message = productEnquiryMessage(product);

    expect(message).toContain("DAP Fertilizer (50 kg bag)");
    expect(message).toContain("FERT-DAP-50");
    expect(message).toContain("KES 4,500");
    expect(message).toContain("confirm the current availability and final price");
    expect(message).toContain("collection or delivery options");
  });

  it("asks about restocking when the product is unavailable", () => {
    const message = productEnquiryMessage({
      ...product,
      inStock: false,
      packSize: "",
    });

    expect(message).toContain("DAP Fertilizer");
    expect(message).toContain("FERT-DAP-50");
    expect(message).toContain("back in stock");
    expect(message).toContain("recommend an alternative");
    expect(message).not.toContain("KES 4,500");
  });
});
