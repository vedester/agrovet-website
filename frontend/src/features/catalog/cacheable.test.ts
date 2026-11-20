import { describe, expect, it } from "vitest";

import { isCacheableQuery, normalizeQuery, type ProductQuery } from "./query";

describe("isCacheableQuery", () => {
  it("caches plain browsing", () => {
    expect(isCacheableQuery(normalizeQuery({}))).toBe(true);
    expect(
      isCacheableQuery(
        normalizeQuery({ category: "seeds", sort: "price-low", inStock: true, page: 3 }),
      ),
    ).toBe(true);
  });

  it.each<[string, ProductQuery]>([
    ["a search", { search: "dap" }],
    ["a minimum price", { minPrice: 100 }],
    ["a maximum price", { maxPrice: 500 }],
    ["a deep page", { page: 21 }],
  ])("never caches %s", (_label, query) => {
    expect(isCacheableQuery(normalizeQuery(query))).toBe(false);
  });
});
