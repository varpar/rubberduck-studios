"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useState } from "react";
import { nav, type View } from "../_state/navigation";
import { DuckKeyboardControls } from "./DuckKeyboardControls";

// The WebGL world belongs to the app, not to an individual route. Keeping it
// here means a work index and every case study can swap editorial content
// without replacing the canvas (and without replaying the pond's entrance).
const DuckScene = dynamic(() => import("./DuckScene"), { ssr: false });

function viewForPath(pathname: string): View {
  if (pathname.startsWith("/work")) return "projects";
  if (pathname.startsWith("/about")) return "about";
  if (pathname.startsWith("/contact")) return "contact";
  return "home";
}

export function PondBackdrop() {
  const pathname = usePathname();
  const view = viewForPath(pathname);
  const [sceneReady, setSceneReady] = useState(false);

  useLayoutEffect(() => {
    // Direct case-study loads should establish their scene state before the
    // client-only Canvas mounts. Moving between /work and /work/[slug] leaves
    // `view` unchanged, so neither the state nor the world restarts.
    nav.setView(view);
  }, [view]);

  useEffect(() => {
    let firstFrame = 0;
    let paintFrame = 0;
    let idleCallback: number | undefined;
    let fallbackTimer: number | undefined;

    const cancelScheduledStart = () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(paintFrame);
      if (idleCallback !== undefined) window.cancelIdleCallback(idleCallback);
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
    };

    const startScene = () => {
      if (document.hidden) return;
      document.removeEventListener("visibilitychange", scheduleStart);
      setSceneReady(true);
    };

    function scheduleStart() {
      cancelScheduledStart();
      if (document.hidden) return;

      // Give readable content and navigation a paint before parsing the 3D
      // bundle or allocating its GPU resources. The timeout bounds the wait
      // on a busy device; no model or reflection quality is reduced.
      firstFrame = window.requestAnimationFrame(() => {
        paintFrame = window.requestAnimationFrame(() => {
          if (typeof window.requestIdleCallback === "function") {
            idleCallback = window.requestIdleCallback(startScene, { timeout: 250 });
          } else {
            fallbackTimer = window.setTimeout(startScene, 0);
          }
        });
      });
    }

    scheduleStart();
    document.addEventListener("visibilitychange", scheduleStart);
    return () => {
      cancelScheduledStart();
      document.removeEventListener("visibilitychange", scheduleStart);
    };
  }, []);

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#9edbed]"
      >
        {sceneReady ? <DuckScene /> : null}
      </div>

      <DuckKeyboardControls />

      {/* Pilot-duck mode is intentionally paused. Keep the pond as an
          accessible, low-cost ambient world while the ordinary page ducks
          continue to react and swim beneath the editorial content. */}
    </>
  );
}
