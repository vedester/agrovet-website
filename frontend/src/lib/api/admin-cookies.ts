
// Directory: frontend/src/lib/api/admin-cookies.ts

import "server-only";

export const ADMIN_ACCESS_COOKIE = "agrovet_admin_access";
export const ADMIN_REFRESH_COOKIE = "agrovet_admin_refresh";

export const ADMIN_ACCESS_MAX_AGE = 15 * 60;
export const ADMIN_REFRESH_MAX_AGE = 7 * 24 * 60 * 60;

type AdminCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge?: number;
  expires?: Date;
};

const baseCookieOptions: AdminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

export function getAdminAccessCookieOptions(): AdminCookieOptions {
  return {
    ...baseCookieOptions,
    maxAge: ADMIN_ACCESS_MAX_AGE,
  };
}

export function getAdminRefreshCookieOptions(): AdminCookieOptions {
  return {
    ...baseCookieOptions,
    maxAge: ADMIN_REFRESH_MAX_AGE,
  };
}

export function getExpiredAdminCookieOptions(): AdminCookieOptions {
  return {
    ...baseCookieOptions,
    maxAge: 0,
    expires: new Date(0),
  };
}
