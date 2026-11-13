import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      // Until accounts arrive (Phase 5), the home page opens the starter gallery.
      { source: "/", destination: "/g/demo", permanent: false },
    ];
  },
};

export default nextConfig;
