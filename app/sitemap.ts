import type { MetadataRoute } from "next";
import { getSiteUrl } from "./_data/site";

const paths = ["/", "/work", "/about", "/contact"] as const;

/**
 * Search engines need absolute URLs in XML sitemaps. Until the deployed
 * domain is deliberately configured, return an empty sitemap rather than
 * pointing crawlers at an unrelated site.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  if (!siteUrl) return [];

  return paths.map((path) => ({
    url: new URL(path, `${siteUrl}/`).toString(),
  }));
}
