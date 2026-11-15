import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    // Museum images are fetched, resized and cached by our own image
    // optimiser (/_next/image), so visitors never hot-link the museums.
    remotePatterns: [
      new URL("https://images.metmuseum.org/CRDImages/**"),
      new URL("https://www.artic.edu/iiif/2/**"),
      new URL("https://upload.wikimedia.org/wikipedia/commons/**"),
    ],
    qualities: [75],
    // Museum images don't change; keep resized copies for 30 days.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
