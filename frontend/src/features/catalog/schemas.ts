import { z } from "zod";

import { PRICE_PATTERN } from "@/lib/money";

// These mirror the Django API exactly. Anything that does not match fails loudly
// at the boundary instead of crashing a page later.

const imageSchema = z.object({ id: z.number(), image: z.string(), alt_text: z.string() });
const categoryBriefSchema = z.object({ name: z.string(), slug: z.string() });

const productFields = {
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  sku: z.string(),
  brand: z.string(),
  pack_size: z.string(),
  price: z.string().regex(PRICE_PATTERN),
  is_in_stock: z.boolean(),
  requires_advice: z.boolean(),
  is_featured: z.boolean(),
};

export const productSummarySchema = z.object({
  ...productFields,
  category: categoryBriefSchema,
  cover_image: imageSchema.nullable(),
});

export const productDetailSchema = z.object({
  ...productFields,
  description: z.string(),
  category: categoryBriefSchema.extend({ parent: categoryBriefSchema.nullable() }),
  images: z.array(imageSchema),
});

// next/previous are absolute backend links; they are deliberately not read.
export const productPageSchema = z.object({
  count: z.number(),
  results: z.array(productSummarySchema),
});

const categoryNodeSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  image: z.string().nullable(),
  product_count: z.number(),
});

// Categories have two levels at most, so no recursive schema is needed.
export const categoryTreeSchema = z.array(
  categoryNodeSchema.extend({ children: z.array(categoryNodeSchema) }),
);

export type ImageWire = z.infer<typeof imageSchema>;
export type CategoryNodeWire = z.infer<typeof categoryNodeSchema>;
export type CategoryTreeWire = z.infer<typeof categoryTreeSchema>;
export type ProductSummaryWire = z.infer<typeof productSummarySchema>;
export type ProductDetailWire = z.infer<typeof productDetailSchema>;
export type ProductPageWire = z.infer<typeof productPageSchema>;
