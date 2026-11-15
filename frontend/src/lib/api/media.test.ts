import { describe, expect, it } from "vitest";

import { toMediaPath } from "./media";

describe("toMediaPath", () => {
  it.each<[string, string]>([
    ["http://127.0.0.1:8000/media/products/1/a.webp", "/media/products/1/a.webp"],
    ["/media/categories/b.webp", "/media/categories/b.webp"],
    ["//cdn.example.com/media/x.webp", "/media/x.webp"],
  ])("keeps only the path of %s", (raw, expected) => {
    expect(toMediaPath(raw)).toBe(expected);
  });

  it.each([
    "/static/admin/x.css",
    "/media/../admin/",
    "/media/%2e%2e/admin/",
    "",
    "https://example.com/",
    "not a url",
  ])("rejects %j", (raw) => {
    expect(toMediaPath(raw)).toBeNull();
  });
});
