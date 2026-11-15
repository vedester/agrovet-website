// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { productCardWire, productDetailWire } from "@/test/fixtures";
import { mockFetch } from "@/test/mock-fetch";

import { normalizeQuery } from "./query";
import { fetchProduct, fetchProducts } from "./service";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchProducts", () => {
  it("asks the backend with translated parameters and maps the page", async () => {
    const fetchMock = mockFetch({
      count: 1,
      next: null,
      previous: null,
      results: [productCardWire],
    });

    const page = await fetchProducts(normalizeQuery({ search: "dap", sort: "newest" }));

    expect(page?.items[0].name).toBe("DAP Fertilizer");
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toBe("/api/v1/catalog/products/");
    expect(url.searchParams.get("search")).toBe("dap");
    expect(url.searchParams.get("ordering")).toBe("-created_at");
    expect(url.searchParams.get("page_size")).toBe("24");
  });

  it("returns null when the page does not exist", async () => {
    mockFetch({ detail: "Invalid page." }, 404);
    await expect(fetchProducts(normalizeQuery({ page: 9 }))).resolves.toBeNull();
  });
});

describe("fetchProduct", () => {
  it("returns null for unknown products and never calls the backend for malformed slugs", async () => {
    const fetchMock = mockFetch({ detail: "Not found." }, 404);

    await expect(fetchProduct("missing-product")).resolves.toBeNull();
    await expect(fetchProduct("../admin")).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps a product detail", async () => {
    mockFetch(productDetailWire);

    const product = await fetchProduct("dap-fertilizer-50-kg-bag");

    expect(product?.category.parent?.slug).toBe("farm-inputs");
    expect(product?.photos).toHaveLength(1);
  });

  it("throws on outages instead of hiding them", async () => {
    mockFetch({}, 500);
    await expect(fetchProduct("dap")).rejects.toMatchObject({ kind: "http", status: 500 });
  });
});
