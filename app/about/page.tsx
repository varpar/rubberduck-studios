import type { Metadata } from "next";
import { JsonLd, getPageJsonLd } from "../_components/seo/JsonLd";
import { createPageMetadata } from "../_components/seo/metadata";
import { StoryPageNav } from "../_components/story/StoryPageNav";
import { AboutStory } from "../_components/story/pages/AboutStory";

export const metadata: Metadata = createPageMetadata({
  path: "/about",
  title: "About",
  description:
    "An independent, automations-first studio where clients work directly with the person building the system.",
  image: "/images/story/about-ritual.png",
  imageAlt:
    "A yellow rubber duck, notebook, pencil and folded paper boat on a mossy pond-side workbench.",
});

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <JsonLd
        data={getPageJsonLd({
          path: "/about",
          name: "About — Rubberduck",
          description:
            "An independent, automations-first studio where clients talk directly to the person building the work.",
          image: "/images/story/about-ritual.png",
        })}
      />
      <StoryPageNav active="about" />
      <AboutStory />
    </div>
  );
}
