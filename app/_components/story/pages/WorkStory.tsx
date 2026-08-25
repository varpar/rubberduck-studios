import { AssetSlot } from "../AssetSlot";
import { CTABand } from "../CTABand";
import { EyebrowHeader } from "../EyebrowHeader";
import { Footer } from "../Footer";
import { Section } from "../Section";
import { Split } from "../Split";
import { bookMailto } from "../../../_data/site";
import { work } from "../../../_data/work";

/** A short, conversion-led account of real, shipped work. */
export function WorkStory() {
  return (
    <main className="rd-story">
      <Section reveal={false}>
        <Split
          mobileMediaFirst
          media={
            <AssetSlot
              src="/images/story/work-pond.png"
              alt="A yellow rubber duck floating among translucent glass tiles and lily pads on a sunlit pond."
              ratio="landscape"
              priority
              caption="Systems that stay clear"
              objectPosition="50% 58%"
              className="!max-w-none"
            />
          }
        >
          <EyebrowHeader
            level={1}
            size="display"
            eyebrow={work.hero.eyebrow}
            title={work.hero.title}
            sub={work.hero.sub}
          />
        </Split>
      </Section>

      <Section tone="ocean">
        <header className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-white/72 uppercase">
            Selected work
          </p>
          <h2 className="mt-4 font-display text-4xl leading-[0.94] tracking-tight sm:text-6xl">
            Three live builds, shaped around three very different jobs.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-white/78">
            Commerce, editorial, and a high-trust B2B site—every project starts
            with the right narrative and ends with the mechanics to support it.
          </p>
        </header>

        <div className="mt-12 grid gap-7 xl:grid-cols-3">
          {work.projects.map((project) => (
            <article
              key={project.title}
              className="h-full overflow-hidden rounded-[1.9rem] bg-[#06263f]/72 p-3 shadow-[0_24px_60px_-42px_rgba(0,0,0,0.76)] ring-1 ring-white/18 backdrop-blur-md"
            >
              <AssetSlot
                src={project.image.src}
                alt={project.image.alt}
                ratio="landscape"
                caption={project.image.caption}
                objectPosition={project.image.objectPosition}
                className="!max-w-none rounded-[1.35rem]"
              />

              <div className="px-3 pt-7 pb-5 sm:px-5 sm:pt-8 sm:pb-6">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="font-display text-2xl tracking-tight text-white">
                    {project.number}
                  </span>
                  <span className="text-xs font-semibold tracking-[0.16em] text-white/62 uppercase">
                    {project.kind}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-3xl leading-[0.95] tracking-tight text-white sm:text-4xl">
                  {project.title}
                </h3>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-white/78">
                  {project.summary}
                </p>
                <ul
                  className="mt-6 flex flex-wrap gap-2"
                  aria-label={`${project.title} includes`}
                >
                  {project.details.map((detail) => (
                    <li
                      key={detail}
                      className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/78 ring-1 ring-white/16"
                    >
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section tone="sky">
        <EyebrowHeader
          eyebrow="What we do"
          title="The parts that make a launch work."
          sub="A small studio is most useful when the story, the interface, and the work behind the scenes all agree."
        />
        <ul className="mt-12 grid gap-px overflow-hidden rounded-[1.8rem] bg-white/14 ring-1 ring-white/18 md:grid-cols-3">
          {work.services.map((service, index) => (
            <li key={service.title} className="bg-[#06263f]/62 p-7 backdrop-blur-md sm:p-8">
              <span className="text-xs font-semibold tracking-[0.2em] text-white/68 uppercase">
                0{index + 1}
              </span>
              <h3 className="mt-12 font-display text-3xl leading-[0.95] tracking-tight text-white">
                {service.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-white/74">
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
    </main>
  );
}
