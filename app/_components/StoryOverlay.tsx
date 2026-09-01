"use client";

import { useEffect, useRef, useState } from "react";
import { useView, type View } from "../_state/navigation";
import { AboutStory } from "./story/pages/AboutStory";
import { ContactStory } from "./story/pages/ContactStory";
import { WorkStory } from "./story/pages/WorkStory";

/* The in-app transition + content layer.
 *
 * On the home hero, clicking a nav label sets `view` to a page. This panel
 * then becomes a vertical, scrollable page above the live pond. The pond itself
 * does not slide or fade—the story copy resolves in place, so page changes feel
 * like a change in attention instead of another animated surface.
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
  const [surfaceVisible, setSurfaceVisible] = useState(active);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame: number | null = null;
    let visibilityFrame: number | null = null;
    let timer: number | null = null;

    const schedulePhase = (next: "idle" | "leaving" | "entering") => {
      frame = window.requestAnimationFrame(() => setContentPhase(next));
    };

    const scheduleVisibility = (next: boolean) => {
      visibilityFrame = window.requestAnimationFrame(() => setSurfaceVisible(next));
    };

    if (!active) {
      if (reduce) {
        frame = window.requestAnimationFrame(() => {
          setContentPhase("idle");
          setSurfaceVisible(false);
        });
      } else {
        schedulePhase("leaving");
        timer = window.setTimeout(() => {
          setSurfaceVisible(false);
          window.requestAnimationFrame(() => setContentPhase("idle"));
        }, 140);
      }
    } else if (view !== rendered) {
      scheduleVisibility(true);
      if (reduce) {
        frame = window.requestAnimationFrame(() => {
          setRendered(view);
          scrollRef.current?.scrollTo({ top: 0 });
          setContentPhase("idle");
        });
      } else {
        schedulePhase("leaving");
        timer = window.setTimeout(() => {
          setRendered(view);
          scrollRef.current?.scrollTo({ top: 0 });
        }, 140);
      }
    } else if (reduce) {
      schedulePhase("idle");
    } else {
      scheduleVisibility(true);
      schedulePhase("entering");
      timer = window.setTimeout(
        () => window.requestAnimationFrame(() => setContentPhase("idle")),
        320,
      );
    }

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      if (visibilityFrame !== null) window.cancelAnimationFrame(visibilityFrame);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [view, active, rendered]);

  useEffect(() => {
    if (!active || rendered === "home") return;

    const frame = window.requestAnimationFrame(() => {
      scrollRef.current
        ?.querySelector<HTMLElement>("h1")
        ?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [active, rendered]);

  return (
    <div
      ref={scrollRef}
      data-story-scroll
      aria-hidden={!active}
      inert={!active}
      className={
        "fixed inset-0 z-10 overflow-x-hidden " +
        (surfaceVisible
          ? "visible pointer-events-auto overflow-y-auto"
          : "invisible pointer-events-none overflow-y-hidden")
      }
    >
      <div
        key={rendered}
        data-page-phase={contentPhase}
        className="rd-overlay-story min-h-full pt-24 sm:pt-28"
      >
        {rendered === "projects" && <WorkStory embedded />}
        {rendered === "about" && <AboutStory embedded />}
        {rendered === "contact" && <ContactStory embedded />}
      </div>
    </div>
  );
}
