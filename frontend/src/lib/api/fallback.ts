import { ApiError } from "./errors";

function describeCause(cause: unknown): string {
  let current: unknown = cause;
  while (current && typeof current === "object" && "cause" in current && current.cause) {
    current = current.cause;
  }
  if (!current || typeof current !== "object") return "";
  const detail =
    "code" in current ? String(current.code) : "message" in current ? String(current.message) : "";
  return detail ? ` (${detail})` : "";
}

/** One readable line for logs, including the root cause (for example ECONNREFUSED). */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    const status = error.status ? ` ${error.status}` : "";
    return `${error.kind}${status} on ${error.path}: ${error.message}${describeCause(error.cause)}`;
  }
  return error instanceof Error ? error.message : String(error);
}

/** Use at call sites that can degrade gracefully (for example the site header). */
export async function withFallback<T>(work: Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await work;
  } catch (error) {
    console.error(`[api] ${label} failed: ${describeError(error)}`);
    return fallback;
  }
}
