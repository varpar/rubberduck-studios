import { bookMailto } from "../../../_data/site";
import type { FeaturedProject } from "../../../_data/work";
import { RouteTransitionLink } from "../../RouteTransition";
import { CTABand } from "../CTABand";
import { Footer } from "../Footer";
import { ProjectMedia } from "../ProjectMedia";
import { Section } from "../Section";

/**
 * A case study is arranged as a reading experience rather than a card deck.
 * Copy introduces the decision first; the supporting screen comes after it as
 * proof. That gives every image a role without pretending a single template
 * can tell two very different project stories.
 */
export function CaseStudyStory({ project }: { project: FeaturedProject }) {
  const { caseStudy } = project;
  const storyStops = [
    { href: "#case-frame", label: "Project frame" },
    { href: "#case-decisions", label: "Key decisions" },
    { href: "#case-proof", label: "Selected proof" },
  ];

  return (
    <main
      id="main-content"
      className={`rd-story rd-case-study rd-case-study--${project.slug}`}
    >
      <Section reveal={false}>
        <div className="rd-route-copy max-w-5xl">
          <RouteTransitionLink
            href="/work"
            className="inline-flex min-h-11 items-center gap-2 rounded-full text-sm font-semibold text-white/72 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06243a] focus-visible:outline-none"
          >
            <span aria-hidden="true" className="text-lg leading-none">←</span>
            All work
          </RouteTransitionLink>

          <p className="mt-12 text-xs font-semibold tracking-[0.2em] text-[#facc15] uppercase">
            {project.number} · {project.kind}
          </p>
          <h1
            tabIndex={-1}
            className="mt-5 max-w-[15ch] text-balance break-normal hyphens-none font-heading text-[clamp(3.15rem,7.1vw,7.4rem)] leading-[0.87] font-semibold tracking-[-0.065em] text-white"
          >
            {caseStudy.title}
          </h1>

          <nav
            aria-label={`${project.title} case-study sections`}
            className="rd-route-copy mt-8 flex flex-wrap items-center gap-2"
          >
            <span className="mr-2 text-[0.68rem] font-semibold tracking-[0.18em] text-white/56 uppercase">
              Case notes
            </span>
            {storyStops.map((stop, index) => (
              <a
                key={stop.href}
                href={stop.href}
                className="inline-flex min-h-11 items-center rounded-full border border-white/20 bg-[#062b42]/28 px-4 text-xs font-semibold tracking-[0.08em] text-white/84 transition-colors duration-200 hover:border-white/42 hover:bg-white/12 hover:text-white focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b5270] focus-visible:outline-none motion-reduce:transition-none"
              >
                <span aria-hidden="true" className="mr-2 text-[#facc15]">
                  0{index + 1}
                </span>
                {stop.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-10 grid gap-8 border-t border-white/18 pt-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.8fr)] lg:gap-16">
          <p className="rd-route-copy max-w-3xl text-lg leading-relaxed text-white/82 sm:text-xl">
            {caseStudy.intro}
          </p>
          <div className="rd-route-copy border-l border-white/18 pl-5 sm:pl-6">
            <p className="text-xs font-semibold tracking-[0.2em] text-white/58 uppercase">
              Built across
            </p>
            <ul className="mt-5 space-y-3">
              {caseStudy.scope.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-white/78 sm:text-base">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#facc15]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <ProjectMedia
          image={project.visual}
          preload
          caption={`${project.title} · ${project.kind}`}
          sizes="(min-width: 1280px) 1080px, (min-width: 768px) calc(100vw - 5rem), calc(100vw - 3rem)"
          className="mt-14 aspect-[16/10] w-full sm:aspect-[16/9]"
        />
      </Section>

      <Section id="case-frame" tone="ocean" reveal={false}>
        <div className="grid gap-8 lg:grid-cols-[minmax(10rem,0.34fr)_minmax(0,0.66fr)] lg:gap-16">
          <p className="rd-route-copy text-xs font-semibold tracking-[0.2em] text-[#facc15] uppercase">
            {caseStudy.overview.eyebrow}
          </p>
          <div className="rd-route-copy max-w-3xl">
            <h2 className="text-balance break-normal hyphens-none font-heading text-[clamp(2.55rem,5.1vw,5.4rem)] leading-[0.9] font-semibold tracking-[-0.055em] text-white">
              {caseStudy.overview.title}
            </h2>
            <div className="mt-8 space-y-5 text-base leading-relaxed text-white/78 sm:text-lg">
              {caseStudy.overview.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>

        <dl className="mt-16 grid border-t border-white/18 sm:grid-cols-3">
          {caseStudy.facts.map((fact) => (
            <div
              key={fact.label}
              className="rd-route-copy border-b border-white/18 py-7 sm:border-r sm:px-6 sm:last:border-r-0"
            >
              <dt className="text-xs font-semibold tracking-[0.18em] text-white/56 uppercase">
                {fact.label}
              </dt>
              <dd className="mt-4 max-w-[18ch] text-base leading-snug text-white sm:text-lg">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="case-decisions" tone="sky" reveal={false}>
        <div className="rd-route-copy max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#facc15] uppercase">
            How the system held together
          </p>
          <h2 className="mt-5 text-balance break-normal hyphens-none font-heading text-[clamp(2.55rem,5.1vw,5.4rem)] leading-[0.9] font-semibold tracking-[-0.055em] text-white">
            The decisions beneath the finished surface.
          </h2>
        </div>

        <ol className="mt-12 grid gap-px overflow-hidden rounded-[1.45rem] border border-white/14 bg-white/10 md:grid-cols-3">
          {caseStudy.principles.map((principle) => (
            <li key={principle.number} className="rd-route-copy bg-[#06243a]/42 p-7 sm:p-8">
              <span className="font-display text-4xl leading-none text-[#facc15]">
                {principle.number}
              </span>
              <h3 className="mt-10 text-balance font-heading text-2xl leading-[0.95] font-semibold tracking-[-0.04em] text-white sm:text-3xl">
                {principle.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-white/72 sm:text-base">
                {principle.body}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="case-proof" tone="ocean" reveal={false}>
        <header className="rd-route-copy max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#facc15] uppercase">
            Selected proof
          </p>
          <h2 className="mt-5 text-balance break-normal hyphens-none font-heading text-[clamp(2.55rem,5.1vw,5.4rem)] leading-[0.9] font-semibold tracking-[-0.055em] text-white">
            A closer look at the work in use.
          </h2>
        </header>

        <ol className="mt-16 space-y-20 lg:mt-20 lg:space-y-28">
          {caseStudy.chapters.map((chapter, index) => {
            const mediaWidth =
              index === 1
                ? "lg:ml-auto lg:w-[88%]"
                : index === 2
                  ? "lg:w-[78%]"
                  : "w-full";

            return (
              <li key={chapter.title}>
                <div className="grid gap-5 border-t border-white/18 pt-5 lg:grid-cols-[minmax(5rem,0.16fr)_minmax(0,0.84fr)] lg:gap-10">
                  <span className="font-display text-5xl leading-none text-[#facc15] sm:text-6xl">
                    0{index + 1}
                  </span>
                  <div className="rd-route-copy max-w-3xl">
                    <p className="text-xs font-semibold tracking-[0.2em] text-white/58 uppercase">
                      {chapter.eyebrow}
                    </p>
                    <h3 className="mt-4 text-balance break-normal hyphens-none font-heading text-[clamp(2.1rem,4vw,4.4rem)] leading-[0.9] font-semibold tracking-[-0.05em] text-white">
                      {chapter.title}
                    </h3>
                    <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/78 sm:text-lg">
                      {chapter.body}
                    </p>
                  </div>
                </div>

                <ProjectMedia
                  image={chapter.visual}
                  caption={`${project.title} · ${chapter.eyebrow}`}
                  sizes="(min-width: 1280px) 880px, (min-width: 768px) calc(100vw - 5rem), calc(100vw - 3rem)"
                  className={`mt-8 aspect-[16/10] sm:aspect-[16/9] ${mediaWidth}`}
                />
              </li>
            );
          })}
        </ol>
      </Section>

      <Section tone="deep" reveal={false}>
        <div className="rd-route-copy">
          <CTABand
            headline="Have a useful problem to make clearer?"
            sub="Tell us what needs to work better. We will bring a point of view, then build the parts that make it real."
            cta="Email Rubberduck"
            mailto={bookMailto(`A project like ${project.title}`)}
          />
        </div>
      </Section>

      <Footer />
    </main>
  );
}
