import { RouteTransitionLink } from "../../RouteTransition";
import { IconArrowRight } from "../../icons";
import { AssetSlot } from "../AssetSlot";
import { EyebrowHeader } from "../EyebrowHeader";
import { Footer } from "../Footer";
import { Section } from "../Section";
import { Split } from "../Split";
import {
  founder,
  studioApproach,
  studioPrinciples,
} from "../../../_data/about";
import { bookMailto } from "../../../_data/site";

/**
 * A compact introduction to Rubberduck. The story is deliberately short: the
 * selected work explains the output; this page explains who customers work
 * with and how the studio thinks.
 */
export function AboutStory() {
  return (
    <main className="rd-story">
      <Section reveal={false}>
        <Split
          flip={false}
          media={
            <AssetSlot
              src="/images/story/about-ritual.png"
              alt="A yellow rubber duck, notebook, pencil and folded paper boat on a mossy pond-side workbench."
              ratio="portrait"
              priority
              caption="Field note · a studio ritual"
              objectPosition="50% 62%"
              className="!max-w-none"
            />
          }
        >
          <EyebrowHeader
            level={1}
            size="display"
            align="left"
            eyebrow="About Rubberduck"
            title="A studio, not an agency."
            sub="An independent studio for teams that need a useful thing built without the extra theatre."
          />

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <RouteTransitionLink
              href="/work"
              className="group/cta inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-[#06263f]/88 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_-18px_rgba(0,0,0,0.88)] ring-1 ring-white/24 transition-[transform,background-color] duration-300 hover:-translate-y-0.5 hover:bg-[#06263f] focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none motion-reduce:transition-none"
            >
              See selected work
              <IconArrowRight
                size={16}
                className="transition-transform duration-300 ease-out group-hover/cta:translate-x-1 motion-reduce:transition-none"
              />
            </RouteTransitionLink>
            <a
              href={bookMailto("A project for Rubberduck")}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-white/38 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none"
            >
              Email Varun
            </a>
          </div>
        </Split>
      </Section>

      <Section tone="ocean" reveal={false}>
        <Split
          flip
          media={
            <AssetSlot
              src="/images/story/work-pond.png"
              alt="A rubber duck floating through clear pond water beside pale glass tiles."
              ratio="square"
              caption="Talk it out · make it lighter"
              objectPosition="42% 67%"
              className="!max-w-none"
            />
          }
        >
          <EyebrowHeader
            align="left"
            eyebrow={studioApproach.eyebrow}
            title={studioApproach.title}
          />
          <div className="mt-6 space-y-4 text-lg leading-relaxed text-white/80">
            {studioApproach.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <div className="mt-9 border-l-2 border-white/28 pl-5">
            <p className="text-xs font-semibold tracking-[0.18em] text-white/65 uppercase">
              {founder.name} · {founder.role}
            </p>
            <p className="mt-2 text-base leading-relaxed text-white/80">
              {founder.bio}
            </p>
          </div>

          <ul className="mt-10 grid gap-5 sm:grid-cols-3">
            {studioPrinciples.map((principle) => (
              <li key={principle.title}>
                <h3 className="font-display text-2xl tracking-tight text-white">
                  {principle.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/75">
                  {principle.note}
                </p>
              </li>
            ))}
          </ul>
        </Split>
      </Section>

      <Section tone="sky">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <EyebrowHeader
            align="center"
            eyebrow="A useful first step"
            title="Bring the knot."
            sub="A short note is enough to start. We will tell you plainly whether Rubberduck is the right fit."
          />
          <a
            href={bookMailto("A project for Rubberduck")}
            className="group/cta mt-8 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-[#06263f]/88 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_-18px_rgba(0,0,0,0.88)] ring-1 ring-white/24 transition-[transform,background-color] duration-300 hover:-translate-y-0.5 hover:bg-[#06263f] focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none motion-reduce:transition-none"
          >
            Start a conversation
            <IconArrowRight
              size={16}
              className="transition-transform duration-300 ease-out group-hover/cta:translate-x-1 motion-reduce:transition-none"
            />
          </a>
        </div>
      </Section>

      <Footer />
    </main>
  );
}
