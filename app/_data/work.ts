/*
 * Keep this page grounded in shipped work. The copy explains the shape of
 * each build without inventing outcomes, client metrics, or product claims.
 */

export type ProjectVisual = {
  src: string;
  alt: string;
  format: "wide" | "portrait";
};

export type FeaturedProject = {
  slug: "nutripanda" | "mi-amor-tales";
  number: string;
  kind: string;
  title: string;
  summary: string;
  details: string[];
  visual: ProjectVisual;
  caseStudy: {
    title: string;
    intro: string;
    scope: string[];
    overview: {
      eyebrow: string;
      title: string;
      body: string[];
    };
    facts: Array<{
      label: string;
      value: string;
    }>;
    principles: Array<{
      number: string;
      title: string;
      body: string;
    }>;
    chapters: Array<{
      eyebrow: string;
      title: string;
      body: string;
      visual: ProjectVisual;
    }>;
  };
};

export const work = {
  hero: {
    eyebrow: "Rubberduck · selected work",
    title: "Work with a clear point of view.",
    sub:
      "Two shipped systems where the public experience and the practical work behind it were designed together.",
  },
  projects: [
    {
      slug: "nutripanda",
      number: "01",
      kind: "Commerce system",
      title: "NutriPanda",
      summary:
        "A wellness store and operating layer shaped around the same simple idea: make a small product range easier to understand, buy, and keep current.",
      details: ["Storefront", "Product detail", "Operations"],
      visual: {
        src: "/images/work/nutripanda/product-detail.webp",
        alt: "NutriPanda's Immunity Support Gummies product page, with product information, price, trust markers, and purchase controls.",
        format: "wide",
      },
      caseStudy: {
        title: "A commerce system designed around everyday decisions.",
        intro:
          "NutriPanda began with a small, practical problem: how can a focused wellness range feel easy to choose from without becoming another noisy storefront? The answer had to carry from discovery through purchase—and continue into the tools used to run the shop after launch.",
        scope: [
          "Storefront architecture",
          "Product decision design",
          "Checkout + delivery context",
          "Operating layer",
        ],
        overview: {
          eyebrow: "The project frame",
          title: "One product system, two kinds of clarity.",
          body: [
            "The customer-facing experience had to make a compact product range feel legible at a glance. Each surface had a specific job: introduce the range, support a considered purchase, and make the next action obvious without piling on persuasion.",
            "The work could not stop at the storefront. The purchase path needed to account for address collection, payment choice, coupons, and delivery serviceability; pricing, stock, availability, and the product’s visual treatment also needed a focused operating surface behind it.",
          ],
        },
        facts: [
          { label: "Customer layer", value: "Storefront, product discovery, cart, and product detail" },
          { label: "Purchase layer", value: "Guest checkout, payment choice, coupons, and delivery context" },
          { label: "Operating layer", value: "Products, stock, availability, and fulfilment state" },
        ],
        principles: [
          {
            number: "01",
            title: "Begin with the choice.",
            body:
              "The product range is given room to be understood before it is asked to convert. Clear hierarchy keeps the decision small and direct.",
          },
          {
            number: "02",
            title: "Put proof where a decision happens.",
            body:
              "The detail page brings together product information, price, practical trust signals, and the next action in the same reading flow.",
          },
          {
            number: "03",
            title: "Keep the hand-off connected.",
            body:
              "A product should not become unmanageable once it is live. The checkout and operations surfaces keep the important variables visible and connected.",
          },
        ],
        chapters: [
          {
            eyebrow: "01 · Product discovery",
            title: "Make the first decision feel small.",
            body:
              "The storefront gives each product a clear, comparable place in the range. Product names, visual cues, and prices can be scanned quickly, so a visitor is not forced to decode a catalogue before they can decide where to begin.",
            visual: {
              src: "/images/work/nutripanda/discovery.webp",
              alt: "NutriPanda storefront showing Daily Vitality and Immunity Support Gummies as clear product cards.",
              format: "wide",
            },
          },
          {
            eyebrow: "02 · Product detail",
            title: "Give the purchase page one clear job.",
            body:
              "The detail view is where attention becomes a considered action. It holds product context, ingredients, compliance cues, price, and purchase controls together so the page can answer practical questions without breaking the brand’s approachable tone.",
            visual: {
              src: "/images/work/nutripanda/product-detail.webp",
              alt: "NutriPanda product detail page for Immunity Support Gummies with description, ingredients, price, and compliance markers.",
              format: "wide",
            },
          },
          {
            eyebrow: "03 · Product operations",
            title: "Design for the change that comes after launch.",
            body:
              "The operating interface keeps price, stock, availability, colour treatment, and product state in one practical place. That continuity matters: the shop can stay current without every change becoming a separate hand-off or a risky edit in the storefront.",
            visual: {
              src: "/images/work/nutripanda/operations.webp",
              alt: "NutriPanda administration screen for product pricing, stock, colour theme, and availability settings.",
              format: "wide",
            },
          },
        ],
      },
    },
    {
      slug: "mi-amor-tales",
      number: "02",
      kind: "Editorial experience",
      title: "Mi Amor Tales",
      summary:
        "An image-led wedding world where the first frame, individual stories, films, and enquiry all keep the same measured pace.",
      details: ["Editorial direction", "Story templates", "Responsive experience"],
      visual: {
        src: "/images/work/mi-amor-tales/home-hero.webp",
        alt: "Mi Amor Tales homepage introducing its wedding-photography world through a warm editorial hero image and navigation.",
        format: "wide",
      },
      caseStudy: {
        title: "A digital home that lets wedding stories breathe.",
        intro:
          "Mi Amor Tales already had a strong visual point of view. The website’s task was not to drown it in interface. It had to establish a pace, give every story and film its own space, and keep the route to an enquiry present without becoming the loudest thing on the page.",
        scope: [
          "Editorial art direction",
          "Story architecture",
          "Film + image browsing",
          "Responsive experience",
        ],
        overview: {
          eyebrow: "The project frame",
          title: "An experience shaped like an album, not a feed.",
          body: [
            "The homepage needed to be a first frame rather than a dashboard. Image, typography, navigation, and motion were treated as one opening gesture—quiet enough to let the photography set the emotional temperature.",
            "Under that opening, the site becomes a reusable story system: featured tales, individual wedding chapters, ritual sections, image walls, film moments, and contact all belong to the same reading rhythm. Each route can be entered directly without the experience changing character.",
          ],
        },
        facts: [
          { label: "Opening world", value: "Image-led home page, navigation, and editorial pacing" },
          { label: "Story system", value: "Featured tales, chapter templates, ritual sections, and image walls" },
          { label: "Film + contact", value: "User-led film playback and a calm route into an enquiry" },
        ],
        principles: [
          {
            number: "01",
            title: "Let the first image establish the pace.",
            body:
              "The opening frame does the emotional work first. Interface elements are present, but they do not compete with the person, place, or light in the image.",
          },
          {
            number: "02",
            title: "Turn pages into a reading rhythm.",
            body:
              "Generous spacing, restrained type, and image-led sequencing keep the site feeling like a collection of chapters rather than a content grid.",
          },
          {
            number: "03",
            title: "Give film its own quiet stage.",
            body:
              "Moving image is introduced as an invitation within the story, not as an interruption that asks visitors to leave the visual world behind.",
          },
        ],
        chapters: [
          {
            eyebrow: "01 · Opening frame",
            title: "Establish the visual world before the menu.",
            body:
              "The opening is paced like an arrival. Photography takes the lead, while the wordmark and navigation sit lightly in the frame. The result gives a visitor the atmosphere of the studio before asking them to make a choice about where to go next.",
            visual: {
              src: "/images/work/mi-amor-tales/home-hero.webp",
              alt: "Mi Amor Tales homepage with a bride framed by ornate arches, editorial headline, and navigation.",
              format: "wide",
            },
          },
          {
            eyebrow: "02 · Editorial system",
            title: "Build pages that read like an album, not a feed.",
            body:
              "The design uses image scale, generous negative space, and quiet typography to create a sequence rather than a collection of tiles. That system gives featured stories a repeatable structure without making each wedding feel like a template.",
            visual: {
              src: "/images/work/mi-amor-tales/editorial-system.webp",
              alt: "Mi Amor Tales editorial homepage section with black-and-white wedding imagery, large typography, and a quiet grid.",
              format: "wide",
            },
          },
          {
            eyebrow: "03 · Film + story",
            title: "Give moving images their own quiet stage.",
            body:
              "Film is framed as part of the story world. A focused poster image and a single clear play action make the invitation legible while allowing the surrounding page to keep its editorial restraint.",
            visual: {
              src: "/images/work/mi-amor-tales/film-story.webp",
              alt: "Mi Amor Tales film story page for Mohit and Riya with a video play control and editorial framing.",
              format: "wide",
            },
          },
        ],
      },
    },
  ] satisfies FeaturedProject[],
  services: [
    {
      title: "Websites people can act on",
      body:
        "Positioning, information architecture, and a clear route to a useful first conversation.",
    },
    {
      title: "Commerce that keeps moving",
      body:
        "Stores that make discovery and checkout simple, with the operating systems behind them.",
    },
    {
      title: "Focused tools & automations",
      body:
        "Useful interfaces and workflows that remove recurring friction without taking people out of the loop.",
    },
  ],
  cta: {
    headline: "Have something useful to launch?",
    sub:
      "We work best with teams that need the idea, experience, and machinery to make sense together.",
  },
} as const;

/** Resolve a known case study without introducing a runtime content fetch. */
export function getProjectBySlug(slug: string) {
  return work.projects.find((project) => project.slug === slug);
}
