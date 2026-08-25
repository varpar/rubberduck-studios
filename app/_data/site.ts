/* Global site facts shared by the story pages and footer. */

/**
 * A canonical URL is only safe when the studio has configured SITE_URL
 * explicitly (NEXT_PUBLIC_SITE_URL remains a backwards-compatible fallback).
 * Do not infer a public website from the email domain: a wrong canonical URL
 * is worse for search engines than omitting URL fields until launch.
 */
export function getSiteUrl() {
  const candidate =
    process.env.SITE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!candidate) return undefined;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" || !url.hostname) return undefined;
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

export const site = {
  studio: "Rubberduck",
  email: "hello@rubberduck.studio",
  // Shown next to the book-a-call CTAs. Keep this useful without inventing a
  // capacity claim that could quietly go stale after launch.
  availability: "Talk to us about the next available start",
  positioning: "A studio, not an agency.",
  nav: [
    { label: "Work", href: "/work" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  // Deliberately empty until real destinations exist — non-working social
  // links make a finished site feel unfinished.
  socials: [] as { label: string; href: string }[],
  // CC-BY attribution for the duck model, kept per the project legal note.
  // (Flag: remove if you've decided to drop this again.)
  duckCredit: {
    text: '3D duck: "Rubber Duck" by ElOsitoAzul · CC-BY via Sketchfab',
    href: "https://sketchfab.com",
  },
  // Visible CC-BY attribution for the optimized scenery models. Full source
  // and modification details live in docs/asset-credits.md.
  assetCredits: [
    {
      text: "Old Tree by gelmi.com.br · CC BY 4.0",
      href: "https://sketchfab.com/3d-models/old-tree-5793911821d04f73926ac4ab1d46727a",
    },
    {
      text: "Mossy old tree log by Julian Malik · CC BY 4.0",
      href: "https://sketchfab.com/3d-models/mossy-old-tree-log-c65a00ca4a174653beb4c59cb42b9143",
    },
    {
      text: "Cattail Plant by SXuno · CC BY 4.0",
      href: "https://sketchfab.com/3d-models/cattail-plant-c50630051edd4a7daa9708f6b31c021f",
    },
    {
      text: "Park Bench by RBG_illustrations · CC BY 4.0",
      href: "https://sketchfab.com/3d-models/park-bench-2ee2bc87756d4bf0932d83ab860ddb8f",
    },
    {
      text: "Bright Water Lily by Francesca Cepparulo_3D · CC BY 4.0",
      href: "https://sketchfab.com/3d-models/bright-water-lily-537ab44681b74fb9902fdc9af1955989",
    },
    {
      text: "Medium sized Rock for Game Engines by ChrisRE · CC BY 4.0",
      href: "https://sketchfab.com/3d-models/medium-sized-rock-for-game-engines-54cef4772d2a442680d5f18dcb2f93e7",
    },
  ],
} as const;

/** Builds a mailto that pre-frames the email subject from a chosen offer. */
export function bookMailto(subject?: string) {
  const base = `mailto:${site.email}`;
  return subject ? `${base}?subject=${encodeURIComponent(subject)}` : base;
}
