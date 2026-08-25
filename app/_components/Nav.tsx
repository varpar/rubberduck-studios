"use client";

import gsap from "gsap";
import { Flip } from "gsap/Flip";
import Link from "next/link";
import { useLayoutEffect, useRef, type CSSProperties } from "react";
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

export function Nav() {
  const view = useView();
  const hover = useHover();
  const isHome = view === "home";

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

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-0 z-20"
    >
      <ul className="contents">
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
    </nav>
  );
}
