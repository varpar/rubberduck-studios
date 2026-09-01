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
    <header className="sticky top-0 z-40 border-b border-white/14 bg-[#06243a]/96 shadow-[0_12px_36px_-28px_rgba(0,0,0,0.92)]">
      <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3 sm:flex-nowrap sm:px-8 lg:px-10">
        <RouteTransitionLink
          href="/"
          aria-label="Rubberduck home"
          className="group relative flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-1 text-white outline-none transition-opacity duration-200 hover:opacity-75 focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06243a]"
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
          <ul className="relative flex items-center gap-1">
            {links.map((link) => {
              const isActive = active === link.page;

              return (
                <li key={link.href}>
                  <RouteTransitionLink
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className={
                      "flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold tracking-tight outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06243a] sm:px-4 sm:text-base " +
                      (isActive
                        ? "bg-white/12 text-white shadow-[inset_0_-2px_0_0_#facc15]"
                        : "text-white/74 hover:bg-white/8 hover:text-white")
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
