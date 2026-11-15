import { vi } from "vitest";

/** Replaces the global fetch with a stub that answers once with `body`. */
export function mockFetch(body: unknown, status = 200) {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(typeof body === "string" ? body : JSON.stringify(body), { status }),
    );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
