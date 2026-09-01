import type { Metadata } from "next";
import { PondStoryFrame } from "../_components/PondWorkFrame";
import { JsonLd, getPageJsonLd } from "../_components/seo/JsonLd";
import { createPageMetadata } from "../_components/seo/metadata";
import { AboutStory } from "../_components/story/pages/AboutStory";

export const metadata: Metadata = createPageMetadata({
  path: "/about",
  title: "About",
  description:
    "An independent, automations-first studio where clients work directly with the person building the system.",
});

export default function AboutPage() {
  return (
    <PondStoryFrame view="about">
      <JsonLd
        data={getPageJsonLd({
          path: "/about",
          name: "About — Rubberduck",
          description:
            "An independent, automations-first studio where clients talk directly to the person building the work.",
        })}
      />
      <AboutStory />
    </PondStoryFrame>
  );
}
