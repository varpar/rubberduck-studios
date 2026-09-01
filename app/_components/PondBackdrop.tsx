"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useState } from "react";
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

    // One frame is enough to let the external scene store settle before the
    // dynamic Canvas mounts on a direct deep link. Scheduling avoids a
    // synchronous effect→render cascade while keeping the first paint clean.
    const frame = window.requestAnimationFrame(() => setSceneReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, [view]);

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
