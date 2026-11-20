// Directory: frontend/src/features/whatsapp/link.ts

import type { ProductDetail } from "@/features/catalog/types";

/**
 * Creates a WhatsApp click-to-chat URL with a prefilled message.
 * Only recognised HTTPS WhatsApp hosts are accepted.
 */
export function withMessage(whatsappUrl: string, message: string): string {
  if (!whatsappUrl.trim() || !message.trim()) return "";

  try {
    const url = new URL(whatsappUrl);

    const allowedHosts = ["wa.me", "api.whatsapp.com", "web.whatsapp.com"];

    if (url.protocol !== "https:" || !allowedHosts.includes(url.hostname)) {
      return "";
    }

    url.searchParams.set("text", message);

    return url.toString();
  } catch {
    return "";
  }
}

/**
 * Creates the default message for a general shop enquiry.
 */
export function generalEnquiryMessage(greeting: string): string {
  const message = greeting.trim();

  return (
    message ||
    "Hello, I found your website and would like to make an enquiry. Could you please assist me?"
  );
}

type EnquiryProduct = Pick<ProductDetail, "name" | "packSize" | "price" | "sku" | "inStock">;

/**
 * Creates a product-specific enquiry without implying that an order is confirmed.
 */
export function productEnquiryMessage(product: EnquiryProduct): string {
  const size = product.packSize ? ` (${product.packSize})` : "";

  if (product.inStock) {
    return [
      "Hello, I found this product on your website and would like to make an enquiry.",
      "",
      `Product: ${product.name}${size}`,
      `Product code: ${product.sku}`,
      `Displayed price: ${product.price.label}`,
      "",
      "Please confirm the current availability and final price.",
      "I would also like to know the available collection or delivery options.",
      "",
      "Thank you.",
    ].join("\n");
  }

  return [
    "Hello, I found this product on your website and would like to make an enquiry.",
    "",
    `Product: ${product.name}${size}`,
    `Product code: ${product.sku}`,
    "",
    "I can see that this product is currently listed as unavailable.",
    "Could you please let me know when it may be back in stock, or recommend an alternative?",
    "",
    "Thank you.",
  ].join("\n");
}
