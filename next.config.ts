import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prototype: all data is local typed mock data. Cache Components / PPR add no value
  // here and introduce extra constraints around dynamic params, so they stay disabled.
  cacheComponents: false,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  serverExternalPackages: ["pdfjs-dist"],
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
