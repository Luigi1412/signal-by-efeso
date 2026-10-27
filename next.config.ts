import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Authenticated workspace pages depend on the active session and RLS.
  cacheComponents: false,
  // Restored workspaces must not depend on a machine-specific Turbopack cache database.
  experimental: { turbopackFileSystemCacheForBuild: false },
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
