import type { Metadata } from "next";
import { getSiteUrl, site } from "@/app/_data/site";

type RouteMetadata = {
  path: "/work" | "/about" | "/contact";
  title: string;
  description: string;
  image: string;
  imageAlt: string;
};

const defaultTitle = "Rubberduck — Useful systems, made clear";
const defaultDescription =
  "Rubberduck is an independent studio for thoughtful automations and focused digital products.";
const defaultImage = "/images/story/work-pond.png";
const defaultImageAlt =
  "A yellow rubber duck floating among glass tiles and lily pads on a sunlit pond.";

function absoluteUrl(path: string) {
  const siteUrl = getSiteUrl();
  return siteUrl ? new URL(path, `${siteUrl}/`).toString() : undefined;
}

function socialImage(path: string, alt: string) {
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
  const image = socialImage(defaultImage, defaultImageAlt);

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
      ...(image ? { images: image } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: defaultTitle,
      description: defaultDescription,
      ...(image ? { images: image } : {}),
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
