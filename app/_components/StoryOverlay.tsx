"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useView, type View } from "../_state/navigation";

function StoryLoading() {
  return (
    <div role="status" className="mx-auto max-w-6xl px-6 py-16 text-white">
      <span className="inline-flex rounded-full bg-black/70 px-5 py-3 text-sm font-semibold">
        Loading page…
      </span>
    </div>
  );
}

// Home navigation can open any story, but only the selected story needs to
// ship to the browser. Direct routes still render their complete copy on the
// server; these separate bundles are solely for the in-place home overlay.
const AboutStory = dynamic(
  () => import("./story/pages/AboutStory").then((module) => module.AboutStory),
  { loading: StoryLoading },
);
const ContactStory = dynamic(
  () => import("./story/pages/ContactStory").then((module) => module.ContactStory),
  { loading: StoryLoading },
);
const WorkStory = dynamic(
  () => import("./story/pages/WorkStory").then((module) => module.WorkStory),
  { loading: StoryLoading },
);

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
  // Keep the previous story during transitions between reading views.
  // Home removes the entire reading layer immediately.
  const [rendered, setRendered] = useState<View>("home");
  const [contentPhase, setContentPhase] = useState<
    "idle" | "leaving" | "entering"
  >("idle");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active && rendered === "home") return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame: number | null = null;
    let timer: number | null = null;

    const schedulePhase = (next: "idle" | "leaving" | "entering") => {
      frame = window.requestAnimationFrame(() => setContentPhase(next));
    };

    if (!active) {
      frame = window.requestAnimationFrame(() => {
        setContentPhase("idle");
        setRendered("home");
      });
    } else if (view !== rendered) {
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
      schedulePhase("entering");
      timer = window.setTimeout(() => setContentPhase("idle"), 320);
    }

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [view, active, rendered]);

  useEffect(() => {
    if (!active || rendered === "home") return;

    const root = scrollRef.current;
    if (!root) return;

    let observer: MutationObserver | undefined;
    const focusHeading = () => {
      const heading = root.querySelector<HTMLElement>("h1");
      if (!heading) return false;
      heading.focus({ preventScroll: true });
      observer?.disconnect();
      return true;
    };

    const frame = window.requestAnimationFrame(() => {
      if (focusHeading()) return;
      // The selected story may still be downloading on its first visit.
      // Transfer focus as soon as its real heading replaces the status text.
      observer = new MutationObserver(focusHeading);
      observer.observe(root, { childList: true, subtree: true });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [active, rendered]);

  // Do not leave a hidden full-screen scrim behind the home controls. Its
  // lifetime follows the selected tab, not delayed animation state.
  if (!active) return null;

  return (
    <div
      ref={scrollRef}
      data-story-scroll
      data-story-open="true"
      className="fixed inset-0 z-10 overflow-x-hidden overflow-y-auto"
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
