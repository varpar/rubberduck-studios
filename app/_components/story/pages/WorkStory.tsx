import Image from "next/image";
import { bookMailto } from "../../../_data/site";
import { work } from "../../../_data/work";
import { RouteTransitionLink } from "../../RouteTransition";
import { CTABand } from "../CTABand";
import { EyebrowHeader } from "../EyebrowHeader";
import { Footer } from "../Footer";
import { LiveSiteLink } from "../LiveSiteLink";
import { Section } from "../Section";

/** A curated entry point into two evidence-led, shareable project stories. */
export function WorkStory({ embedded = false }: { embedded?: boolean }) {
  const Root = embedded ? "div" : "main";

  return (
    <Root id={embedded ? undefined : "main-content"} className="rd-story rd-work-index">
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
          <h2 className="mt-5 max-w-[20ch] text-balance font-heading text-[clamp(2.4rem,4.8vw,5.25rem)] leading-[1.02] font-semibold tracking-[-0.045em] text-white">
            Different briefs. The same care, all the way through.
          </h2>
          <p className="mt-7 max-w-2xl text-base leading-relaxed text-[var(--rd-text-body)] sm:text-lg">
            Explore the finished websites, or step inside the decisions that
            shaped them.
          </p>
        </header>

        <ol className="mt-12 space-y-16 lg:mt-16 lg:space-y-20">
          {work.projects.map((project) => (
            <li key={project.slug} className="rd-project-entry">
              <article aria-labelledby={`project-${project.slug}`}>
                <div className="rd-route-copy mb-6 flex items-center gap-4 border-t border-white/24 pt-5">
                  <span className="font-display text-2xl leading-none text-[#facc15]">
                    {project.number}
                  </span>
                  <p className="text-xs font-semibold tracking-[0.16em] text-[var(--rd-text-muted)] uppercase">
                    {project.kind}
                  </p>
                  <span className="ml-auto inline-flex items-center gap-2 text-xs font-medium text-[var(--rd-text-muted)]">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#facc15]" />
                    Live project
                  </span>
                </div>
                <div className="grid items-center gap-7 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-10">
                  <RouteTransitionLink
                    href={`/work/${project.slug}`}
                    aria-label={`Read the ${project.title} case study`}
                    className="rd-project-preview block min-w-0 rounded-2xl focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:ring-offset-4 focus-visible:ring-offset-[#06243a] focus-visible:outline-none"
                  >
                    <div className={`rd-project-cover rd-project-cover--${project.slug}`}>
                      <Image
                        src={project.logo.src}
                        alt={project.logo.alt}
                        width={project.logo.width}
                        height={project.logo.height}
                        quality={90}
                        loading="lazy"
                        sizes="(min-width: 1152px) 400px, (min-width: 1024px) 36vw, (min-width: 640px) 65vw, 70vw"
                        className="h-auto w-[68%] object-contain"
                      />
                    </div>
                  </RouteTransitionLink>
                  <div className="rd-route-copy min-w-0">
                    <h3 id={`project-${project.slug}`} className="text-balance font-heading text-[clamp(2.5rem,4.2vw,4.3rem)] leading-[1.02] font-semibold tracking-[-0.055em] text-white">
                      {project.title}
                    </h3>
                    <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--rd-text-body)] sm:text-lg">
                      {project.summary}
                    </p>
                    <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-[var(--rd-text-muted)]">
                      {project.details.map((detail) => (
                        <li key={detail} className="flex items-center gap-2">
                          <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[#facc15]" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-8 flex flex-wrap items-center gap-3">
                      <RouteTransitionLink href={`/work/${project.slug}`} className="rd-project-action rd-project-action--case">
                        Read case study
                        <span aria-hidden="true" className="text-lg leading-none">→</span>
                      </RouteTransitionLink>
                      <LiveSiteLink project={project} />
                    </div>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="sky" reveal={false}>
        <div className="rd-route-copy max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#facc15] uppercase">
            What we bring to the table
          </p>
          <h2 className="mt-5 max-w-[16ch] text-balance font-heading text-[clamp(2.25rem,4.4vw,4.75rem)] leading-[1.04] font-semibold tracking-[-0.045em] text-white">
            The parts of a launch that have to agree.
          </h2>
        </div>
        <ul className="mt-12 grid gap-px overflow-hidden rounded-[1.45rem] border border-white/14 bg-white/10 md:grid-cols-3">
          {work.services.map((service, index) => (
            <li key={service.title} className="rd-route-copy bg-[var(--rd-surface)] p-7 sm:p-8">
              <span className="font-display text-3xl text-[#facc15]">0{index + 1}</span>
              <h3 className="mt-10 font-heading text-2xl leading-[1.04] font-semibold tracking-[-0.03em] text-white">
                {service.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-[var(--rd-text-body)]">
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
