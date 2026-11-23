import type { NextConfig } from "next";

import { getBackendOrigin } from "./src/config/backend";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "nxmruecdnsgwobsjnybf.supabase.co",
        pathname: "/storage/v1/object/public/media/**",
      },
    ],
  },

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
