import type { Metadata } from "next";
import { getSiteUrl, site } from "@/app/_data/site";

type RouteMetadata = {
  path: string;
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
};

const defaultTitle = "Rubberduck — Useful systems, made clear";
const defaultDescription =
  `Rubberduck is an independent studio in ${site.location.display} for thoughtful automations and focused digital products.`;
function absoluteUrl(path: string) {
  const siteUrl = getSiteUrl();
  return siteUrl ? new URL(path, `${siteUrl}/`).toString() : undefined;
}

function socialImage(path?: string, alt?: string) {
  if (!path || !alt) return undefined;
  const url = absoluteUrl(path);
  return url ? [{ url, alt }] : undefined;
}

function socialTitle(title: string) {
  return title === "Rubberduck" ? defaultTitle : `${title} | Rubberduck`;
}

/**
 * Shared server-side metadata. Any URL-dependent value is omitted until a
 * verified HTTPS SITE_URL is configured, so previews cannot create bad
 * canonical or social links.
 */
export function createRootMetadata(): Metadata {
  const siteUrl = getSiteUrl();

  return {
    ...(siteUrl ? { metadataBase: new URL(`${siteUrl}/`) } : {}),
    title: {
      default: defaultTitle,
      template: "%s | Rubberduck",
    },
    description: defaultDescription,
    applicationName: site.studio,
    creator: "Varun",
    publisher: site.studio,
    ...(siteUrl ? { alternates: { canonical: `${siteUrl}/` } } : {}),
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: site.studio,
      title: defaultTitle,
      description: defaultDescription,
      ...(siteUrl ? { url: `${siteUrl}/` } : {}),
    },
    twitter: {
      card: "summary",
      title: defaultTitle,
      description: defaultDescription,
    },
  };
}

/** Metadata for one stable, server-rendered content route. */
export function createPageMetadata({
  path,
  title,
  description,
  image,
  imageAlt,
}: RouteMetadata): Metadata {
  const url = absoluteUrl(path);
  const social = socialImage(image, imageAlt);
  const titleForSocial = socialTitle(title);

  return {
    title,
    description,
    ...(url ? { alternates: { canonical: url } } : {}),
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: site.studio,
      title: titleForSocial,
      description,
      ...(url ? { url } : {}),
      ...(social ? { images: social } : {}),
    },
    twitter: {
      card: social ? "summary_large_image" : "summary",
      title: titleForSocial,
      description,
      ...(social ? { images: social } : {}),
    },
  };
}
