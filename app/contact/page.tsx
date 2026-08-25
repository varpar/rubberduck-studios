import type { Metadata } from "next";
import { JsonLd, getPageJsonLd } from "../_components/seo/JsonLd";
import { createPageMetadata } from "../_components/seo/metadata";
import { StoryPageNav } from "../_components/story/StoryPageNav";
import { ContactStory } from "../_components/story/pages/ContactStory";

export const metadata: Metadata = createPageMetadata({
  path: "/contact",
  title: "Contact",
  description:
    "Book a call with Varun. One email, one 20-minute call, one clear plan. Talk it out, ship it out.",
  image: "/images/story/contact-message.png",
  imageAlt:
    "A paper boat carrying a sealed message floats beside a yellow rubber duck in clear pond water.",
});

export default function ContactPage() {
  return (
    <div className="min-h-screen">
      <JsonLd
        data={getPageJsonLd({
          path: "/contact",
          name: "Contact — Rubberduck",
          description:
            "Start with one email and a 20-minute call with Varun to clarify an automation or focused product build.",
          image: "/images/story/contact-message.png",
          type: "ContactPage",
          serviceKeys: [
            "workflowAutomation",
            "productDevelopment",
          ],
        })}
      />
      <StoryPageNav active="contact" />
      <ContactStory />
    </div>
  );
}
