import { describe, expect, it } from "vitest";

import { categoryTreeWire, productCardWire, productDetailWire } from "@/test/fixtures";

import { mapCategories, mapProductDetail, mapProductPage, mapProductSummary } from "./mappers";
import {
  categoryTreeSchema,
  productDetailSchema,
  productPageSchema,
  productSummarySchema,
} from "./schemas";

describe("catalogue mappers", () => {
  it("maps a product card with money, a media path and an alt fallback", () => {
    const card = mapProductSummary(productSummarySchema.parse(productCardWire));

    expect(card.price).toEqual({ cents: 450000, label: "KES 4,500" });
    expect(card.packSize).toBe("50 kg bag");
    expect(card.inStock).toBe(false);
    expect(card.cover).toEqual({
      id: 1,
      src: "/media/products/7/a.webp",
      alt: "DAP Fertilizer",
    });
  });

  it("maps a product page and drops photos that are not under /media/", () => {
    const detail = mapProductDetail(productDetailSchema.parse(productDetailWire));

    expect(detail.description).toBe("Phosphate fertilizer for planting.");
    expect(detail.category.parent).toEqual({ name: "Farm Inputs", slug: "farm-inputs" });
    expect(detail.photos).toEqual([{ id: 2, src: "/media/products/7/b.webp", alt: "Back of bag" }]);
  });

  it("maps the category tree", () => {
    const tree = mapCategories(categoryTreeSchema.parse(categoryTreeWire));

    expect(tree).toHaveLength(1);
    expect(tree[0].productCount).toBe(2);
    expect(tree[0].image).toBeNull();
    expect(tree[0].children[0]).toMatchObject({
      slug: "dairy-meal",
      image: "/media/categories/c.webp",
      productCount: 1,
      children: [],
    });
  });

  it("works out paging and never exposes the backend address", () => {
    const wire = productPageSchema.parse({
      count: 50,
      next: "http://127.0.0.1:8000/api/v1/catalog/products/?page=2",
      previous: null,
      results: [productCardWire],
    });
    const page = mapProductPage(wire, { page: 1, pageSize: 24 });

    expect(page).toMatchObject({ total: 50, pageCount: 3, hasNext: true, hasPrevious: false });
    expect(page.items).toHaveLength(1);
    expect(JSON.stringify(page)).not.toContain("127.0.0.1");
  });

  it("rejects responses with the wrong shape", () => {
    expect(productSummarySchema.safeParse({ ...productCardWire, price: "abc" }).success).toBe(
      false,
    );
    expect(categoryTreeSchema.safeParse([{ id: 1 }]).success).toBe(false);
  });
});
