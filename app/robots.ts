import type { MetadataRoute } from "next";
import { getSiteUrl } from "./_data/site";

const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "PerplexityBot",
] as const;

/**
 * Previews and local builds must not be indexed. A verified HTTPS SITE_URL is
 * deliberately required before we publish an allow rule or sitemap location.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  if (!siteUrl) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: [...AI_CRAWLERS], allow: "/" },
    ],
    sitemap: new URL("/sitemap.xml", `${siteUrl}/`).toString(),
    host: siteUrl,
  };
}
