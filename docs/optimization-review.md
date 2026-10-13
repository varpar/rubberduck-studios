# Performance and readability review — 13 October 2026

## Visual correction — 14 October 2026

The user asked to preserve the pond aesthetic and remove the blue wash. The reading background now uses one neutral black backdrop at 65% opacity instead of a blue gradient at 76–90%. It covers the reading frame, including the navigation gutter, while the home hero stays unshaded. Navigation and supporting panels also use neutral translucent surfaces. No backdrop blur, color filter, or changes to the 3D scene were introduced.

Current worst-case text contrast over pure white behind the backdrop: body 6.12:1, secondary 5.19:1, yellow 4.56:1. The production build, TypeScript, and scoped lint pass. Browser preview inspection was blocked by the browser tool this turn, so the visual checks and earlier contrast figures below describe the 13 October version.

Follow-up: the reading overlay now exists only while Work, About, or Contact is selected. Returning Home removes the entire overlay immediately, instead of retaining a hidden dark element and separate visibility state. Its backdrop CSS also requires an explicit open-tab marker. Direct story routes retain their reading backdrop. The browser regression script now checks that the backdrop itself is absent on Home; it has not been rerun because browser inspection remains blocked.

## What changed

- Work entries pair uncropped, original-color screenshots with project summaries and separate case-study/live-site actions. Case studies have a prominent live-site button, section links, back navigation, and a next-project link.
- Live destinations are https://nutripanda.in/ and https://www.miamortales.com/. Both use ordinary links that work without JavaScript and open a new tab.
- A continuous translucent teal reading surface replaces fading contrast veils. Body copy and secondary text use opaque color tokens. Navigation has a stable dark background, visible keyboard focus, and spacing that works from tablet widths upward.
- Text transitions no longer use blur or permanent compositor promotion. Contact panels no longer blur the entire animated scene behind them. CTA labels remain readable throughout hover.
- The water lattice excludes invisible terrain while preserving its original spacing, alignment, and shoreline. The capture and main render share a single shadow update. Capture resolution, shader reflection behavior, textures, and asset files are retained.
- Hidden tabs perform no WebGL draws; the scene clock resumes without resetting wake or entrance timestamps. GPU render targets survive resizing and cloned materials are disposed correctly.
- The first content paint precedes scene initialization. Essential assets fetch concurrently, with staged visual appearance. Home stories load on demand and unmount when closed. Home links avoid prefetching unused standalone routes. Fonts and public-asset caching also avoid unnecessary work.

## Measurements

Comparison uses a snapshot of the workspace at the start of this task, including the interrupted optimization changes. Native Chrome/Metal on Apple M4 Pro, 1440 × 1000 CSS pixels, DPR 2, production builds, five-second settled samples. The baseline used webpack and the updated build used Turbopack, so bundle and CPU comparisons also include that difference. Geometry and draw-call figures are normalized by observed animation frames.

| Measure | Before | After | Difference |
| --- | ---: | ---: | ---: |
| Home draw calls per animation frame | 129 | 93 | −27.9% |
| Work draw calls per animation frame | 141 | 105 | −25.5% |
| Home submitted vertices/indices per animation frame | 1,729,452 | 1,084,863 | −37.3% |
| Work submitted vertices/indices per animation frame | 1,688,016 | 1,043,427 | −38.2% |
| Desktop water vertices | 25,921 | 1,802 | −93.1% |
| Fallback water vertices | 5,329 | 486 | −90.9% |
| Initial font transfer | 106,836 B | 83,428 B | −21.9% |
| Hidden scene draw calls in 600 ms | Not measured | 0 | Verified pause |

The canvas stayed at 2880 × 2000 pixels. All files under `public/` are byte-for-byte unchanged. These are reductions in rendering work, not a claim that the entire website loads 93% faster. CPU samples were mixed: home task time was 1.27 → 1.39 seconds, work 1.34 → 1.29 seconds per five-second window. No general CPU speedup or field Core Web Vitals claim is made. This remains a continuously animated scene while visible.

## Readability and verification

The lightest reading veil is 76% opaque over the brightest possible white background, with the lighter section stripe included. Calculated minimum contrast is 6.51:1 for body copy, 5.29:1 for secondary text, and 5.05:1 for yellow labels. The dark-on-yellow CTA is 10.11:1. The live-site buttons are 48 px tall.

- Production compilation and TypeScript pass. ESLint reports zero errors and seven existing unused procedural-component warnings in `PoolEnvironment.tsx`.
- All five story routes have no overflowing text/links at 320, 390, 768, and 1440 px. Desktop home navigation has no intersecting labels at 640, 768, or 1440 px.
- Home Work/About/Contact overlays open, transfer focus, and unmount after returning home. Reduced-motion navigation also passes.
- Case-study, back, next-project, and mobile menu navigation pass. Both live-site destinations and new-tab attributes are verified. No browser page errors were observed.
- Automated accessibility checks found no definite contrast/link-name/button-name violations. Gradient backgrounds require manual contrast verification; the numerical worst-case checks above cover those reading surfaces.
- Screenshots were reviewed on desktop and mobile. Browser checks are retained in `scripts/verify-experience.mjs`; run with `URL=http://localhost:3002 node scripts/verify-experience.mjs` against a production server. Chrome is used by default to exercise the native GPU rather than the software-renderer fallback.

Heuristic design assessment (0–10): text 6 → 8, structure 5 → 8, colors 3 → 9, visual craft 6 → 8. These are review judgments, not measured accessibility scores.

## References

- [React Three Fiber performance guidance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
- [Three.js renderer and shadow controls](https://threejs.org/docs/pages/WebGLRenderer.html)
- [Next.js lazy loading](https://nextjs.org/docs/app/guides/lazy-loading), cross-checked with this project's installed Next.js 16.2.6 documentation
- [WCAG minimum contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- `docs/water-rendering.md` describes the retained rendering limits and current settings.
