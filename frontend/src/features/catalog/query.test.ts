import { describe, expect, it } from "vitest";

import { normalizeQuery, parseSearchParams, toBackendParams } from "./query";

describe("parseSearchParams", () => {
  it("reads valid URL parameters", () => {
    expect(
      parseSearchParams({
        page: "2",
        q: "dap",
        category: "fertilizers",
        sort: "price-low",
        instock: "true",
        featured: "1",
        min: "100",
        max: "5000",
      }),
    ).toEqual({
      page: 2,
      search: "dap",
      category: "fertilizers",
      sort: "price-low",
      inStock: true,
      featured: true,
      minPrice: 100,
      maxPrice: 5000,
    });
  });

  it("ignores invalid values", () => {
    expect(
      parseSearchParams({ page: "abc", q: "", sort: "bogus", instock: "false", min: "", max: "x" }),
    ).toEqual({});
  });
});

describe("normalizeQuery", () => {
  it("fills defaults, clamps numbers and cleans the search text", () => {
    expect(normalizeQuery({})).toEqual({ page: 1, pageSize: 24 });
    expect(
      normalizeQuery({
        page: 0,
        pageSize: 500,
        search: "  dap   fertilizer  ",
        category: "Bad Slug",
        minPrice: -5,
        maxPrice: 200,
      }),
    ).toEqual({ page: 1, pageSize: 100, search: "dap fertilizer", maxPrice: 200 });
  });
});

describe("toBackendParams", () => {
  it("maps names and sort orders to the backend's vocabulary", () => {
    const params = toBackendParams(
      normalizeQuery({
        page: 2,
        search: "dap",
        category: "fertilizers",
        sort: "newest",
        inStock: true,
        featured: true,
        minPrice: 100,
        maxPrice: 5000,
      }),
    );
    expect(params).toEqual({
      page: 2,
      page_size: 24,
      search: "dap",
      category: "fertilizers",
      ordering: "-created_at",
      in_stock: true,
      featured: true,
      min_price: 100,
      max_price: 5000,
    });
  });

  it("leaves unset values out", () => {
    expect(toBackendParams(normalizeQuery({}))).toEqual({ page: 1, page_size: 24 });
  });
});
