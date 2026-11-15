// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { getBackendOrigin } from "./backend";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getBackendOrigin", () => {
  it("falls back to the local Django server outside production", () => {
    expect(getBackendOrigin({})).toBe("http://127.0.0.1:8000");
    expect(getBackendOrigin({ NODE_ENV: "development" })).toBe("http://127.0.0.1:8000");
  });

  it("uses BACKEND_ORIGIN and normalises it", () => {
    expect(getBackendOrigin({ BACKEND_ORIGIN: "https://api.example.com/" })).toBe(
      "https://api.example.com",
    );
  });

  it("refuses to run in production without BACKEND_ORIGIN", () => {
    expect(() => getBackendOrigin({ NODE_ENV: "production" })).toThrow(/BACKEND_ORIGIN is not set/);
  });

  it.each([
    "not a url",
    "ftp://example.com",
    "https://example.com/api",
    "https://example.com/?x=1",
  ])("rejects %s", (value) => {
    expect(() => getBackendOrigin({ BACKEND_ORIGIN: value })).toThrow(/BACKEND_ORIGIN/);
  });

  it("cannot be used from browser code", () => {
    vi.stubGlobal("window", {});
    expect(() => getBackendOrigin({})).toThrow(/server-only/);
  });
});
