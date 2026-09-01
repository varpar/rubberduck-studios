# CLAUDE.md — Rubberduck Portfolio Site

This file defines how you (Claude Code) work in this repo. Read it fully before doing
anything. These are rules, not suggestions. When in doubt, re-read this file before
acting.

---

## What this project is
Rubberduck is a small design/dev studio. This repo is its portfolio site. The hero
feature is a **rubber duck navigation system**: a "mom" rubber duck floats on screen
with three ducklings behind her; each duckling is a page (Projects / About / Contact).
Clicking a nav item triggers a cinematic GSAP sequence where the family swims, the
chosen duckling stops center-screen, the others exit, and that page loads. The
interaction IS the product. It must feel polished, playful, alive — Awwwards-grade
motion, not a generic portfolio.

---

## Stack (do not change without asking)
- Next.js 14 (App Router) + TypeScript
- React Three Fiber (`@react-three/fiber`) + `@react-three/drei` for all 3D
- GSAP for choreography / timeline animation
- Tailwind for the 2D UIer (nav, page content)

**Do NOT** introduce alternative libraries (no three.js raw rewrites, no Framer Motion
for the 3D choreography, no Zustand/Redux unless I ask, no new animation libs, no UI
kits). If you think something genuinely needs a new dependency, STOP and ask first with
a one-line reason.

---

## The golden rules (most important section)

1. **Do exactly what was asked. Nothing more.** Do not add features, pages, sections,
   routes, settings, "nice to haves," or refactors I didn't request. If you have an idea,
   mention it in one line at the END of your response and let me decide. Do not build it.

2. **Primitives before the real model. Always, this phase.** The duck navigation must be
   built and tuned with simple placeholder primitives (spheres/capsules with eye spheres)
   FIRST. Do NOT load `/public/models/duck.glb` until I explicitly say "swap in the
   model." Structure the `<Duck>` component so the GLB swap is a one-component change
   later, but do not do it now.

3. **Don't touch the water / environment.** There is no water yet. Background is a flat
   neutral color for now. Do not add water, shaders, skyboxes, fog, or environment maps
   unless I ask. We do that later, deliberately.

4. **GSAP timelines for the big choreography. Not hand-rolled useFrame.** All
   nav-click swim sequences must be GSAP timelines so they're controllable and
   reversible (`.reverse()`). useFrame is only for ambient stuff (idle bob, cursor-eye
   lerp). Do not animate the swim sequence by manually lerping in useFrame.

5. **One source of truth for navigation state.** Current view + selected duckling live
   in ONE place. Timelines read from / drive that state. Don't scatter animation state
   across components.

6. **Reusable `<Duck>` component.** Mom and ducklings are the SAME component with props
   (scale, role, eyeTarget, etc.). Do not write separate mom/duckling components.

7. **Don't refactor what works.** If a file already works and I didn't ask you to change
   it, leave it alone. No "while I was here I cleaned up..." Do not reformat, rename, or
   restructure existing working code uninvited.

8. **Don't delete anything I didn't tell you to delete.** No removing files, routes, or
   code blocks on your own judgment. Comment-out + ask if you think something's dead.

---

## How to work

- **Small steps, show results.** Build in the order I give. After a meaningful chunk,
  stop and let me look / run it, rather than building the entire feature blind in one
  giant pass.
- **When something is ambiguous, ask ONE sharp question.** Don't guess on architecture-
  level decisions. Do guess on trivial stuff (variable names, minor spacing) and keep
  moving.
- **Match my pace.** I prefer fast execution over long explanations. Don't write essays.
  Short status, then the work. Hinglish is fine, casual is fine.
- **Don't apologize repeatedly or over-explain.** If you made a mistake, fix it in one
  line of acknowledgement and move on.
- **If you get stuck or something fails twice, stop and tell me** — don'spiral through
  ten increasingly hacky attempts that leave the repo a mess.

---

## Code quality (this is a portfolio piece — the code may get shown)
- Clean, readable, typed. Meaningful names.
- Components small and single-purpose.
- Comments where the *why* isn't obvious (esp. the choreography math).
- 60fps target. Lerp/smooth all cursor-driven motion. No jank.
- Don't prematurely optimize, but don't write obviously wasteful render loops either.

---

## Performance
- Keep the canvas at 60fps.
- Smooth (lerp) all mouse-driven motion so it's never jittery.
- Mobile: don't fully solve responsive yet, but don't bake in desktop-only assumptions
  that are painful to undo. Degrade gracefully on touch.

---

## Legal / attribution (don't skip)
The real duck model (loaded later) is **CC-BY: "Rubber Duck" by ElOsitoAzul via
Sketchfab.** A visible credit must exist (footer or `/credits`). Keep this wired in even
while the model is a placeholder.

---

## Scope fence for v1 (do NOT cross without asking)
IN sco:
- Mom + 3 ducklings (placeholder primitives)
- Idle bob
- Eyes follow cursor
- Hover nav item -> eyes grow
- Click nav item -> swim choreography (chosen duckling centers, others exit, page loads)
- Reverse / re-navigate smoothly
- Minimal placeholder page content (Projects / About / Contact)
- Attribution credit

OUT of scope for now (do not build):
- Water / environment / shaders
- The real GLB model (until I say swap)
- Lab / Blog / extra pages or ducklings
- Real project case studies / real copy
- CMS, forms backend, email sending, analytics
- Auth, database, anything server-side

---

## When you finish a task
End with: (1) one-line summary of what changed, (2) how to see it / what to run,
(3) optionally ONE suggestion for next step — as a suggestion, not an action taken.

---

## TL;DR
Build only what's asked. Primitives first, GLB later, no water yet. GSAP for the swim,
reversible timelines, one state owner, one reusable Duck component. Don't refactor or
delete uninvited. Move fast, talk little, a one sharp question when truly stuck.
