"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";

type RoutePhase = "idle" | "leaving" | "entering";

type RouteTransitionContextValue = {
  transitionTo: (href: string, scroll?: boolean) => void;
};

const RouteTransitionContext = createContext<RouteTransitionContextValue | null>(
  null,
);

const EXIT_DURATION_MS = 180;
const ENTER_DURATION_MS = 560;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Holds the route boundary in the persistent root layout. Route links can ask
 * it to briefly dissolve the outgoing story before Next changes the URL; the
 * incoming route then resolves from a soft blur. It deliberately uses only
 * opacity/filter/transform so it remains cheap alongside the WebGL pond.
 */
export function RouteTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [phase, setPhase] = useState<RoutePhase>("idle");
  const pendingNavigation = useRef(false);
  const previousPathname = useRef(pathname);
  const exitTimer = useRef<number | null>(null);
  const enterTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
      if (enterTimer.current !== null) window.clearTimeout(enterTimer.current);
    };
  }, []);

  useEffect(() => {
    if (previousPathname.current === pathname) return;

    previousPathname.current = pathname;
    pendingNavigation.current = false;
    let frame: number | null = null;

    if (prefersReducedMotion()) {
      frame = window.requestAnimationFrame(() => setPhase("idle"));
      return () => {
        if (frame !== null) window.cancelAnimationFrame(frame);
      };
    }

    frame = window.requestAnimationFrame(() => setPhase("entering"));
    if (enterTimer.current !== null) window.clearTimeout(enterTimer.current);
    enterTimer.current = window.setTimeout(() => {
      setPhase("idle");
    }, ENTER_DURATION_MS);

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  const transitionTo = useCallback(
    (href: string, scroll = true) => {
      // RouteTransitionLink only passes known internal paths, but retain this
      // guard so an accidental unsafe URL can never reach router.push().
      if (!href.startsWith("/") || href.startsWith("//")) return;
      if (href === pathname || pendingNavigation.current) return;

      if (prefersReducedMotion()) {
        router.push(href, { scroll });
        return;
      }

      pendingNavigation.current = true;
      setPhase("leaving");
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
      exitTimer.current = window.setTimeout(() => {
        router.push(href, { scroll });
      }, EXIT_DURATION_MS);
    },
    [pathname, router],
  );

  return (
    <RouteTransitionContext.Provider value={{ transitionTo }}>
      <div
        className="rd-route-shell"
        data-route-kind={pathname === "/" ? "home" : "story"}
        data-route-phase={phase}
      >
        {children}
      </div>
      <div
        aria-hidden="true"
        className="rd-route-wash"
        data-visible={phase === "leaving" ? "true" : "false"}
      />
    </RouteTransitionContext.Provider>
  );
}

type TransitionLinkProps = Omit<
  ComponentProps<typeof Link>,
  "href" | "onNavigate"
> & {
  href: string;
};

/**
 * A normal Next Link with its prefetching and new-tab behaviour intact. For a
 * plain same-origin navigation it gives the persistent route boundary just
 * enough time to fade the outgoing page before calling router.push().
 */
export function RouteTransitionLink({
  href,
  scroll,
  ...props
}: TransitionLinkProps) {
  const context = useContext(RouteTransitionContext);

  if (!context) {
    throw new Error("RouteTransitionLink must be used inside RouteTransitionProvider.");
  }

  return (
    <Link
      {...props}
      href={href}
      scroll={scroll}
      onNavigate={(event) => {
        event.preventDefault();
        context.transitionTo(href, scroll);
      }}
    />
  );
}
