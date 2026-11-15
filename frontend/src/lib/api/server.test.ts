// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { mockFetch } from "@/test/mock-fetch";

import { backendGet, buildUrl } from "./server";

const schema = z.object({ name: z.string() });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildUrl", () => {
  it("builds a versioned URL and skips empty parameters", () => {
    const url = buildUrl(
      "/catalog/products/",
      { page: 2, search: "dap", category: undefined, in_stock: false, empty: "" },
      "https://api.example.com",
    );
    expect(url).toBe(
      "https://api.example.com/api/v1/catalog/products/?page=2&search=dap&in_stock=false",
    );
  });

  it.each(["../admin/", "/catalog/../admin/", "/catalog/products?x=1", "//evil/"])(
    "refuses the unsafe path %s",
    (path) => {
      expect(() => buildUrl(path, {}, "https://api.example.com")).toThrow(/Unsafe API path/);
    },
  );
});

describe("backendGet", () => {
  it("returns data that matches the schema", async () => {
    mockFetch({ name: "Mwangaza" });
    await expect(backendGet("/site/", schema)).resolves.toEqual({ name: "Mwangaza" });
  });

  it("reports a missing resource as not_found", async () => {
    mockFetch({ detail: "Not found." }, 404);
    await expect(backendGet("/site/", schema)).rejects.toMatchObject({
      kind: "not_found",
      status: 404,
    });
  });

  it("reports server errors with their status", async () => {
    mockFetch({}, 500);
    await expect(backendGet("/site/", schema)).rejects.toMatchObject({ kind: "http", status: 500 });
  });

  it("reports an unreachable backend", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(backendGet("/site/", schema)).rejects.toMatchObject({ kind: "unreachable" });
  });

  it("reports a response that is not JSON", async () => {
    mockFetch("<html>oops</html>");
    await expect(backendGet("/site/", schema)).rejects.toMatchObject({ kind: "bad_response" });
  });

  it("reports a response with the wrong shape and names the field", async () => {
    mockFetch({ name: 5 });
    await expect(backendGet("/site/", schema)).rejects.toMatchObject({
      kind: "bad_response",
      message: expect.stringContaining("name"),
    });
  });

  it("asks for JSON and sets a timeout", async () => {
    const fetchMock = mockFetch({ name: "x" });
    await backendGet("/site/", schema);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://127.0.0.1:8000/api/v1/site/");
    expect(init.headers).toMatchObject({ Accept: "application/json" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
