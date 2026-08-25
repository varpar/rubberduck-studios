import type { ReactNode } from "react";

type Tone = "sky" | "ocean" | "deep" | "ink";

/* A full-bleed vertical-rhythm band. It intentionally renders complete content
 * on the server: primary copy should never depend on hydration or an
 * IntersectionObserver before a visitor can read it. `reveal` remains a
 * compatibility prop for existing callers, but no longer hides the section. */
export function Section({
  tone = "sky",
  reveal = true,
  id,
  children,
}: {
  tone?: Tone;
  reveal?: boolean;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`rd-story-section tone-${tone}`}>
      <div
        className={`rd-story-section__inner mx-auto w-full max-w-6xl px-6 py-20 sm:px-8 sm:py-28 lg:px-10 ${
          reveal ? "rd-reveal" : ""
        }`}
      >
        {children}
      </div>
    </section>
  );
}
