import type { z } from "zod";

import { getBackendOrigin } from "@/config/backend";

import { ApiError } from "./errors";

const API_PREFIX = "/api/v1";
const TIMEOUT_MS = 8_000;
// Segments of letters, digits, "_" and "-", with a trailing slash (Django requires it).
const SAFE_PATH = /^\/[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*\/$/;

export type QueryParams = Record<string, string | number | boolean | undefined>;

export function buildUrl(
  path: string,
  params: QueryParams = {},
  origin: string = getBackendOrigin(),
): string {
  if (!SAFE_PATH.test(path)) {
    throw new Error(`Unsafe API path: ${path}`);
  }
  const url = new URL(`${API_PREFIX}${path}`, origin);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function summarizeIssues(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
) {
  const shown = issues
    .slice(0, 3)
    .map((issue) => `${issue.path.map(String).join(".") || "(root)"}: ${issue.message}`);
  return `The backend response has an unexpected shape. ${shown.join("; ")}`;
}

/**
 * The only function that talks to the backend from server code.
 * Always returns data that matches `schema`, or throws an ApiError.
 */
export async function backendGet<S extends z.ZodType>(
  path: string,
  schema: S,
  params?: QueryParams,
): Promise<z.output<S>> {
  const url = buildUrl(path, params);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (cause) {
    throw new ApiError("unreachable", path, "The backend could not be reached.", { cause });
  }

  if (response.status === 404) {
    throw new ApiError("not_found", path, "Not found.", { status: 404 });
  }
  if (!response.ok) {
    throw new ApiError("http", path, `The backend answered ${response.status}.`, {
      status: response.status,
    });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    throw new ApiError("bad_response", path, "The backend response is not valid JSON.", { cause });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError("bad_response", path, summarizeIssues(parsed.error.issues));
  }
  return parsed.data;
}
