// Only used to resolve a relative or absolute address into a clean path.
const RESOLVE_BASE = "file:///";

/**
 * Turns an image address from the backend into a same-site path (/media/...).
 *
 * The browser must never learn the backend address: photos are served through
 * the /media rewrite in next.config.ts. Anything that does not resolve to a
 * /media/ path (including attempts to climb out of it) is rejected with null.
 */
export function toMediaPath(raw: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(raw, RESOLVE_BASE).pathname;
  } catch {
    return null;
  }
  return pathname.startsWith("/media/") ? pathname : null;
}
