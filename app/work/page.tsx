import type { Metadata } from "next";
import { JsonLd, getPageJsonLd } from "../_components/seo/JsonLd";
import { createPageMetadata } from "../_components/seo/metadata";
import { WorkStory } from "../_components/story/pages/WorkStory";

export const metadata: Metadata = createPageMetadata({
  path: "/work",
  title: "Work",
  description:
    "Selected client work from Rubberduck: commerce and editorial systems built from the inside out.",
});

export default function WorkPage() {
  return (
    <>
      <JsonLd
        data={getPageJsonLd({
          path: "/work",
          name: "Work — Rubberduck",
          description:
            "Selected project work from Rubberduck across DTC commerce and editorial storytelling.",
          serviceKeys: [
            "workflowAutomation",
            "productDevelopment",
          ],
        })}
      />
      <WorkStory />
    </>
  );
}
