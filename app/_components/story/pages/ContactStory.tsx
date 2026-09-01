import { IconArrowRight } from "../../icons";
import { EyebrowHeader } from "../EyebrowHeader";
import { Footer } from "../Footer";
import { Section } from "../Section";
import { expectSteps } from "../../../_data/contact";
import { bookMailto, site } from "../../../_data/site";

/**
 * Contact is a direct email conversion page. It answers the only three
 * questions a prospective customer needs before writing: who replies, what
 * happens next, and how much effort the first step takes.
 */
export function ContactStory({ embedded = false }: { embedded?: boolean }) {
  const Root = embedded ? "div" : "main";

  return (
    <Root id={embedded ? undefined : "main-content"} className="rd-story">
      <Section reveal={false}>
        <div className="max-w-4xl">
          <EyebrowHeader
            level={1}
            size="display"
            align="left"
            eyebrow="Start a project"
            title="Tell us where work gets stuck."
            sub="Send Varun a short email. If there is a useful fit, you will talk directly with the person shaping the work."
          />

          <div className="rd-route-copy mt-8 flex flex-col items-start gap-4">
            <a
              href={bookMailto("A project for Rubberduck")}
              className="group/cta inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-[#facc15] px-5 py-3 text-sm font-semibold text-[#06263f] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.88)] ring-1 ring-[#fef3c7]/70 transition-[transform,background-color] duration-300 hover:-translate-y-0.5 hover:bg-[#fde047] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none motion-reduce:transition-none"
            >
              Email Varun
              <IconArrowRight
                size={16}
                className="transition-transform duration-300 ease-out group-hover/cta:translate-x-1 motion-reduce:transition-none"
              />
            </a>
            <span className="flex items-center gap-2 text-sm text-white/80">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#facc15]" />
              {site.availability}
            </span>
          </div>
        </div>
      </Section>

      <Section tone="ocean">
        <EyebrowHeader
          align="center"
          eyebrow="What happens next"
          title="Three simple steps."
          sub="No form, no discovery theatre, no pile of homework before a real conversation."
        />

        <ol className="mt-12 grid gap-5 sm:grid-cols-3">
          {expectSteps.map((step) => (
            <li
              key={step.n}
              className="rd-route-copy relative overflow-hidden rounded-[1.75rem] border border-white/20 bg-[#06263f]/64 p-7 shadow-[0_20px_56px_-42px_rgba(0,0,0,0.64)] backdrop-blur-md"
            >
              <span
                aria-hidden="true"
                className="absolute top-0 right-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full border border-white/18 bg-white/10"
              />
              <span className="font-display text-5xl text-white">{step.n}</span>
              <h3 className="mt-4 font-display text-2xl tracking-tight text-white">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/80">
                {step.note}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="sky">
        <div className="rd-route-copy mx-auto flex max-w-2xl flex-col items-center text-center">
          <EyebrowHeader
            align="center"
            eyebrow="One direct line"
            title="A few honest lines are enough."
            sub="Tell us what you are trying to change and where the friction is. We will take it from there."
          />
          <a
            href={bookMailto("A project for Rubberduck")}
            className="group/cta mt-8 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-[#facc15] px-5 py-3 text-sm font-semibold text-[#06263f] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.88)] ring-1 ring-[#fef3c7]/70 transition-[transform,background-color] duration-300 hover:-translate-y-0.5 hover:bg-[#fde047] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none motion-reduce:transition-none"
          >
            Email Varun
            <IconArrowRight
              size={16}
              className="transition-transform duration-300 ease-out group-hover/cta:translate-x-1 motion-reduce:transition-none"
            />
          </a>
        </div>
      </Section>

      <Footer />
    </Root>
  );
}
