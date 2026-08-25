"use client";

import type { CSSProperties } from "react";

/* ==========================================================================
 * BlurInText — per-character "soft blur in" reveal (Apple-keynote style).
 *
 * This is now a stable, semantic text wrapper. The older per-character GSAP
 * reveal kept headings hidden until JavaScript and an IntersectionObserver ran,
 * which made the content less resilient and could delay first paint beside the
 * WebGL scene. Keeping the public API avoids churn at call sites while making
 * every heading immediately readable.
 *
 * `trigger`:
 *   - "mount"  : reveal as soon as it mounts. For headings already on screen
 *                (the reel cover cards, which are visible the moment a page docks).
 *   - "inview" : reveal the first time the heading scrolls into the viewport.
 *                For headings that live off to the right in the horizontal reel —
 *                so the reveal lands exactly as the card slides into frame,
 *                not silently while it's still off-screen.
 *
 * Accessibility: the whole string is exposed via aria-label on the wrapper and
 * the per-glyph spans are aria-hidden, so screen readers announce words, not
 * letters.
 *
 * Line breaks: pass "\n" in `text` to split onto multiple lines (replaces the
 * old inline <br/> the headings used).
 * ======================================================================== */

const VISIBLE: CSSProperties = {
  whiteSpace: "pre", // preserve the spaces we split into their own glyph spans
};

export function BlurInText({
  text,
  className = "",
  delay = 0,
  stagger = 0.02,
  trigger = "mount",
}: {
  text: string;
  className?: string;
  /** Seconds to wait before the first glyph starts — lets the card settle first. */
  delay?: number;
  /** Seconds between each glyph's start. */
  stagger?: number;
  trigger?: "mount" | "inview";
}) {
  // Deliberately retain these props for all existing page call sites. The text
  // must remain visible before JavaScript is available, so they no longer
  // control first-paint animation.
  void delay;
  void stagger;
  void trigger;

  return (
    <span aria-label={text} className={"block " + className}>
      {text.split("\n").map((line, li) => (
        // Each source line becomes its own block so the heading keeps wrapping
        // exactly where the old <br/> used to sit.
        <span key={li} aria-hidden className="block">
          {Array.from(line).map((ch, ci) => (
            <span key={ci} data-char className="inline-block" style={VISIBLE}>
              {ch}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}
