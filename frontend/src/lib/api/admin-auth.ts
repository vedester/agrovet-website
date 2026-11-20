
// Directory: frontend/src/lib/api/admin-auth.ts

import "server-only";

import { z } from "zod";

import { getBackendOrigin } from "@/config/backend";
import { ApiError } from "@/lib/api/errors";

const tokenPairSchema = z.object({
  access: z.string().min(1),
  refresh: z.string().min(1),
});

const adminUserSchema = z.object({
  id: z.union([z.string(), z.number()]),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  is_staff: z.boolean(),
});

export type AdminTokens = z.infer<typeof tokenPairSchema>;
export type AdminUser = z.infer<typeof adminUserSchema>;

async function backendRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  options: {
    method?: "GET" | "POST";
    accessToken?: string;
    body?: unknown;
  } = {},
): Promise<T> {
  const headers = new Headers({
    Accept: "application/json",
  });

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.accessToken) {
    headers.set("Authorization", `Bearer ${options.accessToken}`);
  }

  let response: Response;

  try {
    response = await fetch(`${getBackendOrigin()}${path}`, {
      method: options.method ?? "GET",
      headers,
      body:
        options.body === undefined
          ? undefined
          : JSON.stringify(options.body),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    throw new ApiError(
      "unreachable",
      path,
      "The authentication service could not be reached.",
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new ApiError(
      "http",
      path,
      "The authentication request was rejected.",
      { status: response.status },
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch (error) {
    throw new ApiError(
      "bad_response",
      path,
      "The authentication service returned invalid JSON.",
      { cause: error },
    );
  }

  const result = schema.safeParse(payload);

  if (!result.success) {
    throw new ApiError(
      "bad_response",
      path,
      "The authentication service returned an unexpected response.",
    );
  }

  return result.data;
}

export async function loginAdmin(
  email: string,
  password: string,
): Promise<{ tokens: AdminTokens; user: AdminUser }> {
  const tokens = await backendRequest(
    "/api/v1/auth/login/",
    tokenPairSchema,
    {
      method: "POST",
      body: { email, password },
    },
  );

  const user = await getAdminUser(tokens.access);

  if (!user.is_staff) {
    throw new ApiError(
      "http",
      "/api/v1/auth/me/",
      "This account is not authorized to access the admin panel.",
      { status: 403 },
    );
  }

  return { tokens, user };
}

export async function getAdminUser(
  accessToken: string,
): Promise<AdminUser> {
  return backendRequest(
    "/api/v1/auth/me/",
    adminUserSchema,
    { accessToken },
  );
}

export async function refreshAdminTokens(
  refreshToken: string,
): Promise<AdminTokens> {
  return backendRequest(
    "/api/v1/auth/refresh/",
    tokenPairSchema,
    {
      method: "POST",
      body: { refresh: refreshToken },
    },
  );
}

export async function logoutAdmin(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await backendRequest(
    "/api/v1/auth/logout/",
    z.undefined(),
    {
      method: "POST",
      accessToken,
      body: { refresh: refreshToken },
    },
  );
}
