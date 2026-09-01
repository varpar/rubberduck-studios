import type { MetadataRoute } from "next";
import { getSiteUrl } from "./_data/site";
import { work } from "./_data/work";

const corePaths = ["/", "/work", "/about", "/contact"] as const;

/**
 * Search engines need absolute URLs in XML sitemaps. Until the deployed
 * domain is deliberately configured, return an empty sitemap rather than
 * pointing crawlers at an unrelated site.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  if (!siteUrl) return [];

  const paths = [
    ...corePaths,
    ...work.projects.map((project) => `/work/${project.slug}`),
  ];

  return paths.map((path) => ({
    url: new URL(path, `${siteUrl}/`).toString(),
  }));
}
