/* ==========================================================================
 * BlurInText — stable, semantic display-text wrapper.
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
 * its presentational child spans are hidden, so screen readers announce the
 * complete heading once.
 *
 * Line breaks: pass "\n" in `text` to split onto multiple lines (replaces the
 * old inline <br/> the headings used).
 * ======================================================================== */

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
        // Each source line remains a block, while each word is kept whole.
        // Per-character inline blocks allow a browser to wrap inside words on
        // a narrow phone (for example "system" → "system / s"). The route
        // shell still provides the designed blur transition without trading
        // away readable editorial type.
        <span key={li} aria-hidden className="block">
          {line.split(/(\s+)/).map((token, ti) =>
            /^\s+$/.test(token) ? (
              token
            ) : (
              <span key={ti} className="inline-block whitespace-nowrap">
                {token}
              </span>
            ),
          )}
        </span>
      ))}
    </span>
  );
}
