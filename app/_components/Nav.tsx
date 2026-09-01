"use client";

import gsap from "gsap";
import { Flip } from "gsap/Flip";
import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  PAGE_VIEWS,
  nav,
  useHover,
  useView,
  type PageView,
  type View,
} from "../_state/navigation";

// Flip ships inside the gsap package (no extra dependency). It measures real
// pixel rects, so it animates the labels' home→navbar move even though the two
// layouts anchor from opposite sides (right: vs left:) — something CSS can't
// tween across the `auto` values.
gsap.registerPlugin(Flip);

const LABELS: Record<PageView, string> = {
  projects: "Work",
  about: "About",
  contact: "Contact",
};

const HREFS: Record<PageView, "/work" | "/about" | "/contact"> = {
  projects: "/work",
  about: "/about",
  contact: "/contact",
};

const MOBILE_MENU_ITEMS: ReadonlyArray<{
  view: View;
  label: "Home" | "Work" | "About" | "Contact";
  href: "/" | "/work" | "/about" | "/contact";
}> = [
  { view: "home", label: "Home", href: "/" },
  { view: "projects", label: "Work", href: "/work" },
  { view: "about", label: "About", href: "/about" },
  { view: "contact", label: "Contact", href: "/contact" },
];

// Per-item positions for each mode. Home keeps the entry points low in the
// scene; the page state lifts them into the compact top navigation. Flip
// measures both real layouts, so this also works across `top` and `bottom`.
const HOME_POSITIONS: Record<PageView, CSSProperties> = {
  projects: {
    top: "auto",
    bottom: "clamp(9.5rem, 15vw, 13.5rem)",
    right: "clamp(1.25rem, 3.5vw, 3.5rem)",
    left: "auto",
    transform: "translate(0, 0)",
  },
  about: {
    top: "auto",
    bottom: "clamp(5.8rem, 10vw, 9rem)",
    right: "clamp(1.25rem, 3.5vw, 3.5rem)",
    left: "auto",
    transform: "translate(0, 0)",
  },
  contact: {
    top: "auto",
    bottom: "clamp(2.25rem, 5vw, 4.5rem)",
    right: "clamp(1.25rem, 3.5vw, 3.5rem)",
    left: "auto",
    transform: "translate(0, 0)",
  },
};

const PAGE_POSITIONS: Record<PageView, CSSProperties> = {
  projects: {
    top: "2rem",
    bottom: "auto",
    left: "35%",
    right: "auto",
    transform: "translate(-50%, 0)",
  },
  about: {
    top: "2rem",
    bottom: "auto",
    left: "50%",
    right: "auto",
    transform: "translate(-50%, 0)",
  },
  contact: {
    top: "2rem",
    bottom: "auto",
    left: "65%",
    right: "auto",
    transform: "translate(-50%, 0)",
  },
};

function positionFor(v: PageView, view: View): CSSProperties {
  return view === "home" ? HOME_POSITIONS[v] : PAGE_POSITIONS[v];
}

function isPlainPrimaryClick(event: ReactMouseEvent<HTMLAnchorElement>) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function MenuIcon({ open = false }: { open?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="h-5 w-5"
    >
      {open ? (
        <>
          <path d="m6 6 12 12" />
          <path d="m18 6-12 12" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}

/**
 * The home stage uses local view changes to turn the pond into a story. A
 * shared, deep-linkable page needs the exact same visual navigation, but its
 * labels must remain real links so a URL can be copied, shared, and revisited.
 */
export function Nav({
  routeMode = false,
  routeView,
}: {
  routeMode?: boolean;
  routeView?: PageView;
}) {
  const storedView = useView();
  // A shareable route uses the pathname-derived page state for its visual
  // active item. This deliberately stays separate from `storedView`: changing
  // a case-study slug must not tell the live pond to replay its camera/duck
  // transition simply to update a navigation highlight.
  const view: View = routeMode ? (routeView ?? "projects") : storedView;
  const hover = useHover();
  const isHome = view === "home";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

  // One real link per page label means the routes work before JavaScript, while
  // Flip can still measure and animate the same DOM elements after hydration.
  const btnRefs = useRef<Partial<Record<PageView, HTMLAnchorElement | null>>>(
    {},
  );
  // The previous layout's Flip state — captured clean each transition so the
  // NEXT transition can animate FROM it.
  const flipStateRef = useRef<Flip.FlipState | null>(null);

  // Runs after every view change, once the DOM already holds the new (LAST)
  // layout. We animate the labels back-then-forward from the previous layout,
  // so they physically travel between the home stack and the navbar row.
  useLayoutEffect(() => {
    // The phone layout uses a purpose-built vertical stack / overlay instead
    // of the desktop labels. There is no useful rect transition to measure
    // across those two different interaction models.
    if (window.matchMedia("(max-width: 639px)").matches) {
      flipStateRef.current = null;
      return;
    }

    const targets = PAGE_VIEWS.map((v) => btnRefs.current[v]).filter(
      (el): el is HTMLAnchorElement => el != null,
    );
    if (targets.length === 0) return;

    const prev = flipStateRef.current;
    // Capture the just-committed layout BEFORE Flip.from() applies its invert
    // transforms, so it stays a clean reference for the next transition.
    const current = Flip.getState(targets);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prev && !reduce) {
      Flip.from(prev, {
        targets,
        duration: 0.75,
        ease: "power3.inOut",
        // `scale: true` animates the big→small font-size change as a smooth
        // zoom, so each heading shrinks as it flies up into the navbar.
        scale: true,
        stagger: 0.06,
      });
    }
    flipStateRef.current = current;
  }, [view]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 640px)");
    const closeForDesktop = () => {
      if (desktopQuery.matches) setMobileMenuOpen(false);
    };
    desktopQuery.addEventListener("change", closeForDesktop);
    return () => desktopQuery.removeEventListener("change", closeForDesktop);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen || isHome) return;

    const menu = mobileMenuRef.current;
    if (!menu) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFirstLink = window.requestAnimationFrame(() => {
      menu.querySelector<HTMLAnchorElement>("a[href]")?.focus();
    });

    const closeAndRestoreFocus = () => {
      setMobileMenuOpen(false);
      window.requestAnimationFrame(() => mobileMenuButtonRef.current?.focus());
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAndRestoreFocus();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = Array.from(
        menu.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href]:not([aria-disabled="true"])',
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFirstLink);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isHome, mobileMenuOpen]);

  const closeMobileMenu = (restoreFocus = false) => {
    setMobileMenuOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => mobileMenuButtonRef.current?.focus());
    }
  };

  const handleMobileNavigation = (
    event: ReactMouseEvent<HTMLAnchorElement>,
    target: View,
  ) => {
    if (routeMode) {
      closeMobileMenu();
      return;
    }

    if (!isPlainPrimaryClick(event)) return;

    event.preventDefault();
    closeMobileMenu();
    nav.setView(target);
  };

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-0 z-20"
    >
      {/* Desktop keeps the existing floating-label choreography. */}
      <ul className="hidden sm:contents">
        {PAGE_VIEWS.map((v) => {
          const active = view === v;
          const hot = hover === v;

          const style: CSSProperties = {
            position: "fixed",
            ...positionFor(v, view),
          };

          return (
            <li key={v} style={style} className="pointer-events-auto">
              <Link
                // NavDuck measures this element to pin the rotating "you are
                // here" duck just to its left once the page has loaded.
                ref={(el) => {
                  btnRefs.current[v] = el;
                }}
                href={HREFS[v]}
                data-nav-item={v}
                onMouseEnter={() => nav.setHover(v)}
                onMouseLeave={() => nav.setHover(null)}
                onFocus={() => nav.setHover(v)}
                onBlur={() => nav.setHover(null)}
                onClick={(event) => {
                  if (routeMode) {
                    setMobileMenuOpen(false);
                    return;
                  }

                  // Keep normal link behaviour for middle-clicks and modified
                  // clicks. A standard click opens the pond story in place.
                  if (
                    event.button !== 0 ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey
                  ) {
                    return;
                  }

                  event.preventDefault();
                  setMobileMenuOpen(false);
                  nav.setView(v);
                }}
                aria-current={active ? "page" : undefined}
                className={
                  "relative tracking-tight " +
                  // Only color transitions here — Flip (in the layout effect)
                  // owns the position/size travel, so `transition-all` would
                  // fight it. Colors still ease on hover/active.
                  "transition-colors duration-300 ease-out " +
                  // Both states share the tall display face so the home→navbar
                  // move is a pure scale+glide, not a font swap mid-flight.
                  // Anton is a single heavy weight — no bold class needed.
                  "font-display " +
                  (isHome
                    ? "text-[clamp(2.65rem,5vw,5rem)] "
                    : "text-2xl sm:text-3xl ") +
                  // The nav stays white both over the water hero and the
                  // darkened glass story layer, so it reads as one system.
                  (isHome
                    ? active || hot
                      ? "text-white"
                      : "text-white/70 hover:text-white"
                    : active || hot
                      ? "text-white"
                      : "text-white/65 hover:text-white")
                }
              >
                {LABELS[v]}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* On the pond surface, phone destinations stay as a clean, deliberate
          stack rather than three independently positioned floating labels. */}
      {isHome && (
        <ul
          aria-label="Explore Rubberduck"
          className="pointer-events-auto fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] z-30 flex flex-col items-end gap-2 rounded-[1.4rem] bg-[#06263f]/82 p-3 text-right shadow-[0_18px_38px_-24px_rgba(0,0,0,0.86)] ring-1 ring-white/24 sm:hidden"
        >
          {PAGE_VIEWS.map((v) => {
            const hot = hover === v;

            return (
              <li key={v}>
                <Link
                  href={HREFS[v]}
                  onMouseEnter={() => nav.setHover(v)}
                  onMouseLeave={() => nav.setHover(null)}
                  onFocus={() => nav.setHover(v)}
                  onBlur={() => nav.setHover(null)}
                  onClick={(event) => {
                    if (!isPlainPrimaryClick(event)) return;
                    event.preventDefault();
                    setMobileMenuOpen(false);
                    nav.setView(v);
                  }}
                  className={
                    "inline-flex min-h-11 touch-manipulation items-center py-1 font-display text-[clamp(2.4rem,11vw,3.25rem)] leading-[0.88] tracking-tight text-white outline-none transition-[opacity,transform] duration-200 focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:ring-offset-4 focus-visible:ring-offset-[#1b7894] motion-reduce:transition-none " +
                    (hot
                      ? "opacity-100"
                      : "opacity-92 active:scale-[0.98] active:opacity-100")
                  }
                >
                  {LABELS[v]}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* Once the visitor is underwater, replace the floating labels with a
          roomy 44px control. The expanded menu is intentionally opaque rather
          than blurred so it remains light on already constrained phones. */}
      {!isHome && !mobileMenuOpen && (
        <button
          ref={mobileMenuButtonRef}
          type="button"
          aria-label="Open navigation menu"
          aria-expanded="false"
          aria-controls="mobile-primary-menu"
          onClick={() => setMobileMenuOpen(true)}
          className="pointer-events-auto fixed right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] z-30 inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center gap-2 rounded-full border border-white/35 bg-[#06263f]/84 px-3 text-sm font-semibold text-white shadow-[0_12px_28px_-18px_rgba(0,0,0,0.9)] outline-none transition-[background-color,transform] duration-200 hover:bg-[#06263f] focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b5270] active:scale-[0.97] active:bg-[#031c2e] motion-reduce:transition-none sm:hidden"
        >
          <MenuIcon />
          <span>Menu</span>
        </button>
      )}

      {mobileMenuOpen && !isHome && (
        <div
          id="mobile-primary-menu"
          ref={mobileMenuRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-primary-menu-title"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) closeMobileMenu(true);
          }}
          className="pointer-events-auto fixed inset-0 z-40 grid min-h-dvh place-items-center overflow-hidden bg-[#06263f] px-6 py-[max(1.25rem,env(safe-area-inset-top))] text-white sm:hidden"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_76%_12%,rgba(101,201,220,0.3),transparent_38%),radial-gradient(circle_at_18%_86%,rgba(27,120,148,0.58),transparent_44%)]"
          />
          <button
            type="button"
            onClick={() => closeMobileMenu(true)}
            className="absolute right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center gap-2 rounded-full border border-white/32 px-3 text-sm font-semibold outline-none transition-[background-color,transform] duration-200 hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06263f] active:scale-[0.97] active:bg-white/18 motion-reduce:transition-none"
          >
            <MenuIcon open />
            <span>Close</span>
          </button>
          <div className="relative flex w-full max-w-sm flex-col items-center text-center">
            <p
              id="mobile-primary-menu-title"
              className="mb-7 text-xs font-semibold uppercase tracking-[0.28em] text-[#facc15]"
            >
              Rubberduck
            </p>
            <ul className="flex w-full flex-col items-center gap-2">
              {MOBILE_MENU_ITEMS.map((item) => {
                const active = view === item.view;

                return (
                  <li key={item.view} className="w-full">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={(event) => handleMobileNavigation(event, item.view)}
                      className={
                        "flex min-h-14 w-full touch-manipulation items-center justify-center rounded-2xl px-5 py-2 font-display text-[clamp(2.5rem,13vw,4rem)] leading-none tracking-tight outline-none transition-[background-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:ring-offset-4 focus-visible:ring-offset-[#06263f] motion-reduce:transition-none " +
                        (active
                          ? "bg-white/14 text-white"
                          : "text-white/76 hover:bg-white/10 hover:text-white active:scale-[0.98] active:bg-white/16")
                      }
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </nav>
  );
}
