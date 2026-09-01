"use client";

import { HomeLink } from "./HomeLink";
import { Nav } from "./Nav";
import { StoryOverlay } from "./StoryOverlay";

export function Stage() {
  return (
    <main
      id="main-content"
      className="relative z-10 h-dvh w-full overflow-hidden"
    >
      <HomeLink />
      <Nav />
      {/* NavDuck (a 2nd WebGL canvas) removed — two canvases per tab kept
          blowing Chrome's WebGL context limit and freezing the scene. */}
      {/* Rises up over the hero on a nav click and becomes the scrollable page. */}
      <StoryOverlay />
    </main>
  );
}
