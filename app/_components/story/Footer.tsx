import { RouteTransitionLink } from "../RouteTransition";
import { site } from "../../_data/site";

/* The footer deliberately stays light over the live pond. It used to mount a
 * second requestAnimationFrame-driven Conway canvas here; removing that layer
 * keeps the close visually connected to the scene without taxing the GPU. */
export function Footer() {
  return (
    <footer className="border-t border-white/18 text-white">
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-10 sm:px-10 lg:px-12">
        <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
          <p className="text-xs font-semibold tracking-[0.24em] text-white/70 uppercase">
            Rubberduck studio
          </p>
          <h2 className="mt-5 max-w-[12ch] text-balance font-heading text-[clamp(3rem,8.4vw,9.5rem)] leading-[0.8] font-semibold tracking-[-0.065em] text-white sm:max-w-none">
            Let&apos;s make waves.
          </h2>
          <a
            href={`mailto:${site.email}`}
            className="mt-8 rounded-full bg-[#facc15] px-6 py-3 text-sm font-bold text-[#06263f] shadow-[0_14px_30px_-20px_rgba(0,0,0,0.9)] ring-1 ring-[#fef3c7]/70 transition-transform hover:-translate-y-0.5 hover:bg-[#fde047] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none motion-reduce:transition-none"
          >
            Book a call
          </a>
        </div>

        <div className="grid gap-10 border-t border-white/18 pt-9 md:grid-cols-[1fr_auto_auto] md:items-start md:gap-16">
          <div>
            <div className="font-display text-3xl tracking-tight">rubberduck</div>
            <p className="mt-2 max-w-sm text-sm text-white/76">
              {site.positioning} Talk it out, ship it out.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-[0.18em] text-white/60 uppercase">
              Pages
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <RouteTransitionLink href="/" className="inline-flex min-h-11 items-center text-white/80 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:outline-none">
                  Home
                </RouteTransitionLink>
              </li>
              {site.nav.map((n) => (
                <li key={n.href}>
                  <RouteTransitionLink href={n.href} className="inline-flex min-h-11 items-center text-white/80 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:outline-none">
                    {n.label}
                  </RouteTransitionLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-[0.18em] text-white/60 uppercase">
              Start here
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href={`mailto:${site.email}`} className="inline-flex min-h-11 items-center text-white/80 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:outline-none">
                  {site.email}
                </a>
              </li>
              {site.socials.map((s) => (
                <li key={s.label}>
                  <a href={s.href} className="inline-flex min-h-11 items-center text-white/80 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:outline-none">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-10 border-t border-white/18 pt-5 text-xs text-white/72">
          {site.duckCredit.text} · © 2026 {site.studio}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-white/70">
          Scenery: {site.assetCredits.map((credit, index) => (
            <span key={credit.href}>
              {index > 0 ? " · " : ""}
              <a
                href={credit.href}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-white/30 underline-offset-2 transition-colors hover:text-white"
              >
                {credit.text}
              </a>
            </span>
          ))}
        </p>
      </div>
    </footer>
  );
}
