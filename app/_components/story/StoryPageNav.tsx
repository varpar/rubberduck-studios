import { RouteTransitionLink } from "../RouteTransition";

type StoryPage = "work" | "about" | "contact";

type StoryPageNavProps = {
  active: StoryPage;
};

const links: ReadonlyArray<{ href: `/${StoryPage}`; label: string; page: StoryPage }> = [
  { href: "/work", label: "Work", page: "work" },
  { href: "/about", label: "About", page: "about" },
  { href: "/contact", label: "Contact", page: "contact" },
];

/**
 * The non-WebGL pages share the same small, watery navigation surface. It is
 * intentionally server-rendered: active state is passed by the route, so
 * deep links remain fast and usable before any client-side code is ready.
 */
export function StoryPageNav({ active }: StoryPageNavProps) {
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-5">
      <div className="relative mx-auto flex max-w-[92rem] flex-wrap items-center justify-between gap-3 overflow-hidden rounded-[1.4rem] border border-white/24 bg-[#06263f]/82 px-3 py-3 shadow-[0_18px_52px_-34px_rgba(0,0,0,0.82)] backdrop-blur-xl sm:flex-nowrap sm:px-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-7 bottom-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent"
        />

        <RouteTransitionLink
          href="/"
          aria-label="Rubberduck home"
          className="group relative flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-2 text-white outline-none transition-opacity duration-300 hover:opacity-75 focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06263f]"
        >
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full bg-[#facc15] shadow-[0_0_0_3px_rgba(250,204,21,0.22)]"
          />
          <span className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
            rubberduck
          </span>
          <span className="sr-only">Home</span>
        </RouteTransitionLink>

        <nav aria-label="Primary">
          <ul className="relative flex items-center gap-1 rounded-2xl bg-white/10 p-1 ring-1 ring-white/16">
            {links.map((link) => {
              const isActive = active === link.page;

              return (
                <li key={link.href}>
                  <RouteTransitionLink
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className={
                      "flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold tracking-tight outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06263f] sm:px-4 sm:text-base " +
                      (isActive
                        ? "bg-white/16 text-white shadow-[0_7px_18px_-12px_rgba(0,0,0,0.9)]"
                        : "text-white/72 hover:bg-white/12 hover:text-white")
                    }
                  >
                    {link.label}
                  </RouteTransitionLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
