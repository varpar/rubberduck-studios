"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useView, type View } from "../_state/navigation";
import { AboutStory } from "./story/pages/AboutStory";
import { ContactStory } from "./story/pages/ContactStory";
import { WorkStory } from "./story/pages/WorkStory";

/* The in-app transition + content layer.
 *
 * On the home hero, clicking a nav label sets `view` to a page. This panel
 * then RISES from the bottom (translateY 100% → 0) like water flooding up over
 * the duck, and becomes a vertical, scrollable page. Going home drains it back
 * down. The Anton headings inside blur in as they scroll into view.
 *
 * It sits above the WebGL canvas (z-10) but below the nav labels (z-20), so the
 * nav still floats on top to switch pages / go home. Reduced motion: no slide,
 * it just appears. */
export function StoryOverlay() {
  const view = useView();
  const active = view !== "home";
  // Keep the last page mounted while the panel drains back down.
  const [rendered, setRendered] = useState<View>("home");
  const [contentPhase, setContentPhase] = useState<
    "idle" | "leaving" | "entering"
  >("idle");
  const [entryDelay, setEntryDelay] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame: number | null = null;
    let timer: number | null = null;

    const schedulePhase = (next: "idle" | "leaving" | "entering") => {
      frame = window.requestAnimationFrame(() => setContentPhase(next));
    };

    if (!active) {
      schedulePhase("leaving");
    } else if (view !== rendered) {
      if (reduce) {
        frame = window.requestAnimationFrame(() => {
          setEntryDelay(0);
          setRendered(view);
          scrollRef.current?.scrollTo({ top: 0 });
          setContentPhase("idle");
        });
      } else {
        // The first story waits for the existing water-dive delay before it
        // resolves from blur. Switching story tabs is intentionally faster.
        const delay = rendered === "home" ? 700 : 0;
        schedulePhase("leaving");
        timer = window.setTimeout(() => {
          setEntryDelay(delay);
          setRendered(view);
          scrollRef.current?.scrollTo({ top: 0 });
        }, 180);
      }
    } else if (reduce) {
      schedulePhase("idle");
    } else {
      schedulePhase("entering");
      timer = window.setTimeout(
        () => window.requestAnimationFrame(() => setContentPhase("idle")),
        560 + entryDelay,
      );
    }

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [view, active, rendered, entryDelay]);

  const contentStyle = {
    "--rd-story-enter-delay": `${entryDelay}ms`,
  } as CSSProperties;

  return (
    <div
      ref={scrollRef}
      aria-hidden={!active}
      // Delayed on activate so the page "surfaces" AFTER the 3D water has risen
      // and the camera has gone under — not a crossfade racing the dive.
      style={{ transitionDelay: active ? "720ms" : "0ms" }}
      className={
        // No background — transparent so the live water canvas behind it is
        // what you see while scrolling (you're IN the water, not on a panel).
        "fixed inset-0 z-10 overflow-x-hidden transition-[transform,opacity] duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none " +
        (active
          ? "pointer-events-auto translate-y-0 opacity-100 overflow-y-auto"
          : "pointer-events-none translate-y-full opacity-0 overflow-y-hidden")
      }
    >
      <div
        key={rendered}
        style={contentStyle}
        data-page-phase={contentPhase}
        className="rd-overlay-story min-h-full pt-24 sm:pt-28"
      >
        {rendered === "projects" && <WorkStory />}
        {rendered === "about" && <AboutStory />}
        {rendered === "contact" && <ContactStory />}
      </div>
    </div>
  );
}
