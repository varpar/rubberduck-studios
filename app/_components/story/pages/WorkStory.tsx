import { bookMailto } from "../../../_data/site";
import { work } from "../../../_data/work";
import { RouteTransitionLink } from "../../RouteTransition";
import { CTABand } from "../CTABand";
import { EyebrowHeader } from "../EyebrowHeader";
import { Footer } from "../Footer";
import { ProjectMedia } from "../ProjectMedia";
import { Section } from "../Section";

/** A curated entry point into two evidence-led, shareable project stories. */
export function WorkStory({ embedded = false }: { embedded?: boolean }) {
  const Root = embedded ? "div" : "main";

  return (
    <Root id={embedded ? undefined : "main-content"} className="rd-story">
      <Section reveal={false}>
        <div className="rd-route-copy max-w-5xl">
          <EyebrowHeader
            level={1}
            size="display"
            eyebrow={work.hero.eyebrow}
            title={work.hero.title}
            sub={work.hero.sub}
          />
        </div>
      </Section>

      <Section tone="ocean" reveal={false}>
        <header className="rd-route-copy max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#facc15] uppercase">
            Selected case studies
          </p>
          <h2 className="mt-5 max-w-[16ch] text-balance font-heading text-[clamp(2.4rem,4.8vw,5.25rem)] leading-[0.95] font-semibold tracking-[-0.045em] text-white sm:leading-[0.9]">
            Two different briefs. Two systems built beyond the first screen.
          </h2>
          <p className="mt-7 max-w-2xl text-base leading-relaxed text-white/76 sm:text-lg">
            These are not concept decks. Each story follows the visible work and
            the decisions underneath it—from the interface a customer sees to the
            system a team needs to keep it useful.
          </p>
        </header>

        <ol className="mt-16 space-y-20 lg:mt-20 lg:space-y-28">
          {work.projects.map((project, index) => (
            <li key={project.slug}>
              <RouteTransitionLink
                href={`/work/${project.slug}`}
                aria-label={`Read the ${project.title} case study`}
                className="group block cursor-pointer rounded-[1.65rem] outline-none focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:ring-offset-4 focus-visible:ring-offset-[#06243a]"
              >
                <div className="grid gap-6 border-t border-white/18 pt-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-end sm:gap-8">
                  <span className="font-display text-4xl leading-none text-[#facc15] sm:text-5xl">
                    {project.number}
                  </span>
                  <div className="rd-route-copy max-w-3xl">
                    <p className="text-xs font-semibold tracking-[0.18em] text-white/62 uppercase">
                      {project.kind}
                    </p>
                    <h3 className="mt-3 text-balance font-heading text-[clamp(2.5rem,5.2vw,5.75rem)] leading-[0.88] font-semibold tracking-[-0.055em] text-white">
                      {project.title}
                    </h3>
                    <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/76 sm:text-lg">
                      {project.summary}
                    </p>
                  </div>
                  <span className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-full border border-white/18 px-4 text-sm font-semibold text-white/86 transition-colors duration-200 group-hover:border-white/42 group-hover:bg-white/8 group-hover:text-white sm:self-end">
                    Read the case study
                    <span aria-hidden="true" className="text-lg leading-none">↗</span>
                  </span>
                </div>

                <ProjectMedia
                  image={project.visual}
                  caption={`${project.title} · ${project.kind}`}
                  preload={index === 0}
                  sizes="(min-width: 1024px) 78vw, 100vw"
                  className="mt-8 aspect-[16/10] w-full sm:aspect-[16/9]"
                />

                <ul className="rd-route-copy mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold tracking-[0.14em] text-white/58 uppercase sm:gap-x-6">
                  {project.details.map((detail) => (
                    <li key={detail} className="flex items-center gap-2">
                      <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[#facc15]" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </RouteTransitionLink>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="sky" reveal={false}>
        <div className="rd-route-copy max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#facc15] uppercase">
            What we bring to the table
          </p>
          <h2 className="mt-5 max-w-[16ch] text-balance font-heading text-[clamp(2.25rem,4.4vw,4.75rem)] leading-[0.94] font-semibold tracking-[-0.045em] text-white">
            The parts of a launch that have to agree.
          </h2>
        </div>
        <ul className="mt-12 grid gap-px overflow-hidden rounded-[1.45rem] border border-white/14 bg-white/10 md:grid-cols-3">
          {work.services.map((service, index) => (
            <li key={service.title} className="rd-route-copy bg-[#06243a]/44 p-7 sm:p-8">
              <span className="font-display text-3xl text-[#facc15]">0{index + 1}</span>
              <h3 className="mt-10 font-heading text-2xl leading-[0.98] font-semibold tracking-[-0.03em] text-white">
                {service.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-white/72">
                {service.body}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="deep">
        <CTABand
          headline={work.cta.headline}
          sub={work.cta.sub}
          cta="Email Rubberduck"
          mailto={bookMailto("A useful idea for Rubberduck")}
        />
      </Section>

      <Footer />
    </Root>
  );
}
