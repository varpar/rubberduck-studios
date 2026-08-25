import type { Metadata } from "next";
import { JsonLd, getPageJsonLd } from "../_components/seo/JsonLd";
import { createPageMetadata } from "../_components/seo/metadata";
import { StoryPageNav } from "../_components/story/StoryPageNav";
import { WorkStory } from "../_components/story/pages/WorkStory";

export const metadata: Metadata = createPageMetadata({
  path: "/work",
  title: "Work",
  description:
    "Selected client work from Rubberduck: commerce, editorial, and high-trust lead-generation systems built from the inside out.",
  image: "/images/story/projects/nutripanda.webp",
  imageAlt:
    "NutriPanda wellness products arranged in a playful, bright product scene.",
});

export default function WorkPage() {
  return (
    <div className="min-h-screen">
      <JsonLd
        data={getPageJsonLd({
          path: "/work",
          name: "Work — Rubberduck",
          description:
            "Selected project work from Rubberduck across DTC commerce, editorial storytelling, and hotel revenue positioning.",
          image: "/images/story/projects/nutripanda.webp",
          serviceKeys: [
            "workflowAutomation",
            "productDevelopment",
          ],
        })}
      />
      <StoryPageNav active="work" />
      <WorkStory />
    </div>
  );
}
