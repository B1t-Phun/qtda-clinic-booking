import type { NextConfig } from "next";
import { createRequire } from "node:module";

// Anchor the shared loader to this config file when Next.js transpiles it.
const { loadFrontendEnv } = createRequire(__filename)("../scripts/env.cjs") as typeof import("../scripts/env.cjs");
Object.assign(process.env, loadFrontendEnv());

const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ...(process.env.NODE_ENV === 'production' ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }] : []),
      ],
    }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: __dirname,
    rules: {
      "*.module.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.module.css",
      },
      "*.css": {
        condition: { not: { path: "*.module.css" } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
