"use client";

import type { ReactNode } from "react";
import type { PageView } from "../_state/navigation";
import { HomeLink } from "./HomeLink";
import { Nav } from "./Nav";

/**
 * Shared reading frame for direct story URLs. The single live pond now lives
 * in the root layout; this frame only supplies the route-aware navigation and
 * readable content layer, never a replacement WebGL scene.
 */
export function PondStoryFrame({
  view,
  children,
}: {
  view: PageView;
  children: ReactNode;
}) {
  return (
    <div className="rd-pond-work-frame min-h-dvh">
      <HomeLink routeMode />
      <Nav routeMode routeView={view} />

      <div className="rd-pond-work-frame__content relative z-10 pt-24 sm:pt-28">
        {children}
      </div>
    </div>
  );
}

/** Work keeps this named wrapper because its nested layout is long-lived. */
export function PondWorkFrame({ children }: { children: ReactNode }) {
  return <PondStoryFrame view="projects">{children}</PondStoryFrame>;
}
