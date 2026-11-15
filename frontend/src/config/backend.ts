/**
 * The ONE place that knows where the Django backend lives.
 *
 * Server-only. The browser never sees this address: it calls relative URLs
 * (/api/shop/..., /api/admin/..., /media/...) on this same site, and the
 * rewrites in next.config.ts and the server-side API client forward them.
 *
 * - Local development: defaults to the Django dev server, no .env file needed.
 * - Production: BACKEND_ORIGIN must be set in the hosting dashboard, and it
 *   must be present at BUILD time too (rewrites are fixed when the app is built).
 */
type Env = Record<string, string | undefined>;

const DEV_DEFAULT = "http://127.0.0.1:8000";

export function getBackendOrigin(env: Env = process.env): string {
  if (typeof window !== "undefined") {
    throw new Error("getBackendOrigin() is server-only. Browser code must use relative /api URLs.");
  }

  const raw = env.BACKEND_ORIGIN?.trim();
  if (!raw) {
    if (env.NODE_ENV === "production") {
      throw new Error(
        "BACKEND_ORIGIN is not set. Set it to the address of the Django backend, " +
          "for example https://api.example.com (in the host settings, not in a file).",
      );
    }
    return DEV_DEFAULT;
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`BACKEND_ORIGIN is not a valid URL: ${raw}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`BACKEND_ORIGIN must start with http:// or https:// (got ${raw}).`);
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error(
      `BACKEND_ORIGIN must be just the address, like https://api.example.com (got ${raw}).`,
    );
  }
  return url.origin;
}
