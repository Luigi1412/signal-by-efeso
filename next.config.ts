import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prototype: all data is local typed mock data. Cache Components / PPR add no value
  // here and introduce extra constraints around dynamic params, so they stay disabled.
  cacheComponents: false,
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
