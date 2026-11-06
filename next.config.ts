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
      // Only the global Tailwind entry goes through @tailwindcss/turbopack.
      // Applying that loader to *.module.css empties the CSS Module export map
      // (styles.columns / styles.row become undefined and /companies collapses).
      "**/globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
