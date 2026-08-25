"use client";

import dynamic from "next/dynamic";
import { HomeLink } from "./HomeLink";
import { Nav } from "./Nav";
import { StoryOverlay } from "./StoryOverlay";

// R3F renders WebGL — disable SSR. Per Next.js 16 docs, `ssr: false` must
// live inside a Client Component, hence this wrapper.
const DuckScene = dynamic(() => import("./DuckScene"), { ssr: false });

export function Stage() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#9edbed]">
      {/* Canvas fills the viewport; everything below sits on top as overlays. */}
      <div className="absolute inset-0">
        <DuckScene />
      </div>

      <HomeLink />
      <Nav />
      {/* NavDuck (a 2nd WebGL canvas) removed — two canvases per tab kept
          blowing Chrome's WebGL context limit and freezing the scene. */}
      {/* Rises up over the hero on a nav click and becomes the scrollable page. */}
      <StoryOverlay />
    </main>
  );
}
