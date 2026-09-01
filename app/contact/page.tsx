import type { Metadata } from "next";
import { PondStoryFrame } from "../_components/PondWorkFrame";
import { JsonLd, getPageJsonLd } from "../_components/seo/JsonLd";
import { createPageMetadata } from "../_components/seo/metadata";
import { ContactStory } from "../_components/story/pages/ContactStory";

export const metadata: Metadata = createPageMetadata({
  path: "/contact",
  title: "Contact",
  description:
    "Book a call with Varun. One email, one 20-minute call, one clear plan. Talk it out, ship it out.",
});

export default function ContactPage() {
  return (
    <PondStoryFrame view="contact">
      <JsonLd
        data={getPageJsonLd({
          path: "/contact",
          name: "Contact — Rubberduck",
          description:
            "Start with one email and a 20-minute call with Varun to clarify an automation or focused product build.",
          type: "ContactPage",
          serviceKeys: [
            "workflowAutomation",
            "productDevelopment",
          ],
        })}
      />
      <ContactStory />
    </PondStoryFrame>
  );
}
