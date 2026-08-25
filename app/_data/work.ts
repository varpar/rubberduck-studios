/*
 * Keep this page grounded in shipped work. The copy explains the shape of
 * each build without inventing outcomes, client metrics, or product claims.
 */

export type FeaturedProject = {
  number: string;
  kind: string;
  title: string;
  summary: string;
  details: string[];
  image: {
    src: string;
    alt: string;
    caption: string;
    objectPosition: string;
  };
};

export const work = {
  hero: {
    eyebrow: "Rubberduck · selected work",
    title: "Useful systems, with the details left in.",
    sub:
      "Three launches across commerce, editorial, and hospitality—each designed around a clear job, then built end to end.",
  },
  projects: [
    {
      number: "01",
      kind: "Commerce + operations",
      title: "NutriPanda",
      summary:
        "A playful, full-stack wellness shop—designed for discovery, built for checkout, and paired with the operating tools that keep orders moving.",
      details: ["Storefront + checkout", "Order operations", "Content + growth"],
      image: {
        src: "/images/story/projects/nutripanda.webp",
        alt: "NutriPanda wellness products arranged in a playful, bright product scene.",
        caption: "Commerce, with an operating layer",
        objectPosition: "50% 48%",
      },
    },
    {
      number: "02",
      kind: "Editorial + motion",
      title: "Mi Amor Tales",
      summary:
        "A restrained, editorial wedding world where photography, film, stories, and enquiry sit together like a beautifully printed album.",
      details: ["Story archive", "Film + photography", "Motion with restraint"],
      image: {
        src: "/images/story/projects/mi-amor-tales.webp",
        alt: "A wedding portrait from the Mi Amor Tales photography archive.",
        caption: "An archive built to feel like film",
        objectPosition: "50% 50%",
      },
    },
    {
      number: "03",
      kind: "Strategy + lead generation",
      title: "Lanthir Revenue",
      summary:
        "A high-trust hospitality site that turns a complex revenue practice into a clear, credible path to a first conversation.",
      details: [
        "Hospitality positioning",
        "Credibility system",
        "Conversation path",
      ],
      image: {
        src: "/images/story/projects/lanthir-revenue.webp",
        alt: "A heritage hotel courtyard used on the Lanthir Revenue website.",
        caption: "Revenue expertise, made clear",
        objectPosition: "50% 50%",
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
