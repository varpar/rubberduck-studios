import type { NextConfig } from "next";

function hasVerifiedSiteUrl() {
  const value = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;

  if (!value) return false;

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    // Interface screenshots need enough detail to keep small UI text crisp.
    qualities: [75, 90],
  },
  // A parent-level lockfile is unrelated to this app. Pinning Turbopack to
  // this directory avoids watching the broader Desktop workspace in dev.
  turbopack: {
    root: __dirname,
  },
  async headers() {
    const canIndex = hasVerifiedSiteUrl();

    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          // Do not let a localhost, preview, or incorrectly configured build
          // become a competing search result before its public domain exists.
          ...(!canIndex
            ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
            : []),
        ],
      },
      // These authored resources retain their full fidelity. A bounded
      // browser cache avoids revalidating every model/texture on a revisit,
      // without treating mutable public filenames as year-long immutable URLs.
      ...["models", "hdr", "textures", "images", "fonts"].map((directory) => ({
        source: `/${directory}/:path*`,
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      })),
    ];
  },
};

export default nextConfig;
