import type { CSSProperties, ReactNode } from "react";

// Keep editorial content visible even if a stale development stylesheet still
// contains the earlier scroll-reveal rule. This inline guard is also useful
// for first paint on slow devices: the page never waits for JavaScript before
// its text or images can be read.
const visibleStyle: CSSProperties = { opacity: 1, transform: "none" };

/* A two-column editorial row: text on one side, a visual/asset on the other.
 * `flip` swaps the sides so consecutive rows zig-zag left↔right. Each column
 * slides in from its own side (rd-slide-*) when the Section reveals. Stacks to
 * a single column (text first) on mobile.
 *
 * Put split Sections in `reveal={false}` so the block doesn't also fade — the
 * column slide IS the reveal. */
export function Split({
  flip = false,
  mobileMediaFirst = false,
  media,
  children,
}: {
  flip?: boolean;
  /**
   * Lets a hero lead with its editorial image on narrow screens, while keeping
   * the heading first in the DOM for a sensible reading order.
   */
  mobileMediaFirst?: boolean;
  media: ReactNode;
  children: ReactNode;
}) {
  const textOrder = mobileMediaFirst
    ? flip
      ? "order-2 md:order-last"
      : "order-2 md:order-none"
    : "";
  const mediaOrder = mobileMediaFirst ? "order-1 md:order-none" : "";

  return (
    <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
      <div
        style={visibleStyle}
        className={[
          flip ? "rd-slide-r md:order-last" : "rd-slide-l",
          textOrder,
        ].join(" ")}
      >
        {children}
      </div>
      <div
        style={visibleStyle}
        className={
          "flex items-center justify-center " +
          mediaOrder +
          " " +
          (flip ? "rd-slide-l" : "rd-slide-r")
        }
      >
        {media}
      </div>
    </div>
  );
}
