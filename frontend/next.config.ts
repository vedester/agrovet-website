import type { NextConfig } from "next";

import { getBackendOrigin } from "./src/config/backend";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,

  // Cache profiles used by cacheLife("...") in src/features/*/api.ts.
  // stale: how long a browser keeps a page before checking again.
  // revalidate: how often the server refreshes it in the background.
  // expire: after this long without a refresh, the next visit waits for fresh data.
  cacheLife: {
    siteSettings: { stale: 60, revalidate: 60, expire: 3600 },
    catalogue: { stale: 60, revalidate: 60, expire: 3600 },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The browser only ever talks to this site. These rewrites forward a short,
  // explicit allowlist of public read-only routes (and product photos) to Django,
  // so the backend address never appears in browser code. Django needs the
  // trailing slashes in the destinations.
  async rewrites() {
    const backend = getBackendOrigin();
    return [
      { source: "/api/shop/site", destination: `${backend}/api/v1/site/` },
      {
        source: "/api/shop/catalog/categories",
        destination: `${backend}/api/v1/catalog/categories/`,
      },
      {
        source: "/api/shop/catalog/products",
        destination: `${backend}/api/v1/catalog/products/`,
      },
      {
        source: "/api/shop/catalog/products/:slug",
        destination: `${backend}/api/v1/catalog/products/:slug/`,
      },
      { source: "/media/:path*", destination: `${backend}/media/:path*` },
    ];
  },
};

export default nextConfig;
