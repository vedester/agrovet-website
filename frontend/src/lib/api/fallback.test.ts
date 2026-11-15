import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./errors";
import { describeError, withFallback } from "./fallback";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("withFallback", () => {
  it("returns the real value when the work succeeds", async () => {
    await expect(withFallback(Promise.resolve("live"), "backup", "test")).resolves.toBe("live");
  });

  it("returns the fallback and logs when the work fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await withFallback(Promise.reject(new Error("boom")), "backup", "site settings");

    expect(result).toBe("backup");
    expect(log).toHaveBeenCalledOnce();
    expect(String(log.mock.calls[0][0])).toContain("site settings");
  });
});

describe("describeError", () => {
  it("explains API errors with their root cause, and plain errors by message", () => {
    const cause = Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } });
    const error = new ApiError("unreachable", "/site/", "The backend could not be reached.", {
      cause,
    });

    expect(describeError(error)).toBe(
      "unreachable on /site/: The backend could not be reached. (ECONNREFUSED)",
    );
    expect(describeError(new Error("boom"))).toBe("boom");
    expect(describeError("odd")).toBe("odd");
  });
});
