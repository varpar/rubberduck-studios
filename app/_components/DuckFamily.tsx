"use client";

import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Duck, type DuckHandle } from "./Duck";
import {
  duckExplorer,
  registerDuckExplorerTarget,
  unregisterDuckExplorerTarget,
  type DuckExplorerKey,
} from "../_state/duckExplorer";
import { duckKeyboard } from "../_state/duckKeyboard";
import { nav, useView, type View } from "../_state/navigation";
import { constrainPondPosition } from "../_state/pool";

// Piloted ducks should feel like they displace water, rather than like a
// keyboard cursor: a restrained top speed, a gradual paddle acceleration,
// then a short coast through modest water drag.
const KEYBOARD_MAX_SPEED = 1.25; // world units / second at full paddle
const KEYBOARD_ACCELERATION = 1.85; // world units / second²
const KEYBOARD_COAST_DRAG = 0.95; // lower = longer, gentler glide
const KEYBOARD_MOTION_EPSILON = 0.0025;
const MAX_PHYSICS_DELTA = 1 / 20;
// This is a deliberately tiny four-body contact check, not a physics engine.
// The radius tracks the visual duck scale and a contact can only fire once
// until the pilot leaves its small separation band.
const DUCK_CONTACT_RADIUS_PER_SCALE = 0.37;
const DUCK_CONTACT_PADDING = 0.08;
const DUCK_CONTACT_RELEASE_MULTIPLIER = 1.18;
const DUCK_CONTACT_COOLDOWN = 0.5;
const DUCK_CONTACT_NUDGE_MAX = 0.12;

function steerTowards(
  velocity: { x: number; z: number },
  targetX: number,
  targetZ: number,
  acceleration: number,
  delta: number,
) {
  const deltaX = targetX - velocity.x;
  const deltaZ = targetZ - velocity.z;
  const distance = Math.hypot(deltaX, deltaZ);
  if (distance <= 0.00001) return;

  const blend = Math.min(1, (acceleration * delta) / distance);
  velocity.x += deltaX * blend;
  velocity.z += deltaZ * blend;
}

// One smooth ease for every duck in every transition.
//
// We tried the report's "snappy" CSS bezier curves first
// (e.g. 0.10, 0.75, 0.20, 1.0 push-off) but those are designed for short UI
// transitions — at our slow SWIM_SPEED the initial slope (~7.5× average)
// meant ducks traversed 70% of their distance in the first second, then
// crawled the rest. Visually that read as an instant lurch followed by
// nothing happening, and the per-duck timing assumptions (t_mama_at_center
// = distance / speed) became wrong by seconds.
//
// `sine.inOut` is symmetric and gentle: zero slope at both ends (smooth
// rest→accelerate and decelerate→rest), peak slope at the midpoint, and
// nearly-linear cruise during the middle 60% — which is what preserves
// trail spacing visually. Same ease for every duck = same speed at any
// given progress fraction = the family moves as one.
const SWIM_EASE = "sine.inOut";

// === Model ============================================================
//
// Every view has a designated "stopper" — the one duck that ends up at the
// CENTER anchor. The other three ducks are always hidden, but on
// *alternating sides*: every successful transition flips the hidden side.
// So the family's idle state is always (stopper at CENTER, the other three
// hidden together on one side). The hidden side flips L → R → L → R …
// each click.
//
// Direction of any swim is from the current hidden side to the opposite
// hidden side. Each duck either:
//   • is the NEW stopper → enters from hidden side, settles at CENTER
//   • is the OLD stopper → starts at CENTER, follows the family out
//   • is a "passer"     → swims from current hidden side straight to the
//                         opposite hidden side
//
// "Respect mama": the OLD stopper waits at CENTER until mama arrives, then
// follows. When mama is the NEW stopper (going home), OLD vacates *just
// before* mama arrives so the spot is clear.
//
// Dodges (z-swerve): a passer dodges another duck if that duck is at/near
// CENTER while the passer is crossing it. Sides alternate (+Z, −Z, +Z, …)
// in order of when passers cross CENTER, so the line visually splits.

type DuckKey = DuckExplorerKey;
const DUCK_KEYS: readonly DuckKey[] = ["mom", "d1", "d2", "d3"];

type Side = "left" | "right";

const STOPPER_FOR_VIEW: Record<View, DuckKey> = {
  home: "mom",
  projects: "d1",
  about: "d2",
  contact: "d3",
};

// Visual anchor — where any stopper sits. Exported so Water.tsx can point its
// environment-capture cube cameras at the same spot (see the cubemap
// refraction/reflection setup there).
export const CENTER_X = -1.3;

// Hidden positions on each side. Trail order is mom → d1 → d2 → d3 (mom
// closest to CENTER). They stay fully inside the playable pool: the close
// hero composition still leaves them beyond the frame, while the sandbox
// pull-back reveals the entire family rather than ducks parked beyond a wall.
const HIDDEN_X: Record<Side, Record<DuckKey, number>> = {
  left: { mom: -5.35, d1: -6.8, d2: -7.85, d3: -8.35 },
  right: { mom: 5.35, d1: 6.8, d2: 7.85, d3: 8.35 },
};

// Scale: with the camera at (0, 1.4, 6.5) + fov 28, the viewport vertical
// extent at z=0 is ~3.3 units. MOM_SCALE 1.3 puts mama at ~40% of viewport
// height. Ducklings are 1/3 of mama (proportions preserved from before).
const MOM_SCALE = 1.3;
const DUCKLING_SCALE = MOM_SCALE / 3;
// Bob amplitudes are pre-divided by scale so the *world-space* bob feels
// the same across the resize.
const MOM_BOB_AMP = 0.058; // → world ≈ 0.075
const DUCKLING_BOB_AMP = 0.14; // → world ≈ 0.06

// How deep each rides. Mom sits at the default belly-deep waterline; the
// ducklings ride noticeably higher so the little ones look like they're
// bobbing on top rather than sunk into the surface.
const MOM_SUBMERGED = 0.38;
const DUCKLING_SUBMERGED = 0.2;

// Pacing — an unhurried, gentle glide. (5.5 read as frantic.) The page no
// longer waits for the whole timeline: we dock the moment the chosen duck
// reaches center (see the tl.call below), so the swim can be calm without
// making the click→page beat feel slow.
const SWIM_SPEED = 2.8; // world units / second

// How long the chosen duck lingers at center after arriving before the page
// docks (family blurs out, navbar duck pops in). A short, deliberate beat.
const DOCK_SETTLE = 0.45; // seconds
const OLD_FOLLOW_DELAY = 0.1; // OLD starts moving this long *after* mama is at CENTER
const OLD_LEAD_DELAY = 0.2; // (mama=NEW case) OLD vacates this long *before* mama arrives
const OLD_CLOSE_WINDOW = 0.35; // how long after OLD starts moving it's still "near" CENTER

// Dodge arc. At the new eye-level camera, z-offset stops translating to
// screen-Y separation (we're nearly looking down the +X axis) — it
// instead reads as the passer crossing IN FRONT of / BEHIND the stopped
// duck via perspective. 1.5 puts the passer roughly 1.3× closer to /
// farther from camera at peak, which sells the depth without making the
// passer balloon at viewer.
const PASS_Z_OFFSET = 1.5;
const PASS_BAND = 2.2; // x-distance over which a passer arcs in and back

// Inverse of sine.inOut: given a progress fraction (0..1) of a tween's
// distance, return the time at which sine.inOut reaches that fraction.
//   y = 0.5 · (1 − cos(πt/D))  ⇒  t = D · acos(1 − 2y) / π
// Used so the dodge enter/peak/exit times track the *actual* x position
// of the passer under sine.inOut, not a linear approximation that drifts
// hundreds of milliseconds away from the truth.
function sineInOutT(progress: number, duration: number): number {
  if (duration <= 0) return 0;
  const p = Math.max(0, Math.min(1, progress));
  return (duration * Math.acos(1 - 2 * p)) / Math.PI;
}

export function DuckFamily() {
  const momRef = useRef<DuckHandle>(null);
  const d1Ref = useRef<DuckHandle>(null);
  const d2Ref = useRef<DuckHandle>(null);
  const d3Ref = useRef<DuckHandle>(null);

  const activeTLRef = useRef<gsap.core.Timeline | null>(null);
  // Tracked locally because they alternate deterministically with each
  // committed transition; no need to plumb through nav state.
  const prevViewRef = useRef<View>("home");
  const hiddenSideRef = useRef<Side>("left");
  const isFirstRenderRef = useRef(true);

  // Each duck keeps its own little packet of momentum. Selecting a different
  // duck in explore mode should never make it inherit the previous duck's
  // velocity and dart away on the first frame.
  const velocityByDuckRef = useRef<Record<DuckKey, { x: number; z: number }>>({
    mom: { x: 0, z: 0 },
    d1: { x: 0, z: 0 },
    d2: { x: 0, z: 0 },
    d3: { x: 0, z: 0 },
  });
  const pilotKeyRef = useRef<DuckKey | null>(null);
  const contactByDuckRef = useRef<Record<DuckKey, boolean>>({
    mom: false,
    d1: false,
    d2: false,
    d3: false,
  });
  const lastContactAtRef = useRef<Record<DuckKey, number>>({
    mom: -Infinity,
    d1: -Infinity,
    d2: -Infinity,
    d3: -Infinity,
  });
  const controlSpaceRef = useRef({
    up: new THREE.Vector3(),
    right: new THREE.Vector3(),
  });
  // Screen-relative controls avoid the classic "left moves right" failure
  // when the camera moves from the hero eye-line into the sandbox / dive.
  const camera = useThree((state) => state.camera);

  const view = useView();
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  // view is read inside useFrame (which captures a stale value otherwise),
  // so mirror to a ref that's synced every render.
  const viewRef = useRef<View>(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  function getDuck(name: DuckKey): DuckHandle | null {
    if (name === "mom") return momRef.current;
    if (name === "d1") return d1Ref.current;
    if (name === "d2") return d2Ref.current;
    return d3Ref.current;
  }

  // Register live handles once. The water camera reads the selected handle
  // directly in its frame loop, so selection changes do not re-render the
  // 3D duck family just to move a camera.
  useEffect(() => {
    const targets: readonly [DuckKey, DuckHandle | null][] = [
      ["mom", momRef.current],
      ["d1", d1Ref.current],
      ["d2", d2Ref.current],
      ["d3", d3Ref.current],
    ];

    for (const [key, target] of targets) {
      if (target) registerDuckExplorerTarget(key, target);
    }

    return () => {
      for (const [key, target] of targets) {
        if (target) unregisterDuckExplorerTarget(key, target);
      }
    };
  }, []);

  // Per-frame: steer a selected pilot duck, or the centered duck while
  // underwater. Inputs are disabled only while a family transition is active.
  // They resolve through camera-ground axes, accelerate toward a capped
  // velocity, then coast through water drag while Duck.tsx retains heading.
  useFrame((state, delta) => {
    const activeTL = activeTLRef.current;
    if (activeTL && activeTL.isActive()) {
      for (const velocity of Object.values(velocityByDuckRef.current)) {
        velocity.x = 0;
        velocity.z = 0;
      }
      pilotKeyRef.current = null;
      return;
    }

    const explorer = duckExplorer.getState();
    const activeView = viewRef.current;
    const canSteer = explorer.active || activeView !== "home";
    if (!canSteer) {
      if (pilotKeyRef.current) {
        const velocity = velocityByDuckRef.current[pilotKeyRef.current];
        velocity.x = 0;
        velocity.z = 0;
        pilotKeyRef.current = null;
      }
      return;
    }
    // In the authored underwater state, steer the duck that is already
    // centered for that section. Pilot mode keeps its explicit 1–4 selection.
    const pilotKey = explorer.active
      ? explorer.selected
      : STOPPER_FOR_VIEW[activeView];
    const duck = getDuck(pilotKey);
    if (!duck) return;

    // A newly selected duck starts at rest; the duck we just left stays where
    // it is rather than coasting off-camera on its own.
    if (pilotKeyRef.current !== pilotKey) {
      if (pilotKeyRef.current) {
        const previousVelocity =
          velocityByDuckRef.current[pilotKeyRef.current];
        previousVelocity.x = 0;
        previousVelocity.z = 0;
      }
      const velocity = velocityByDuckRef.current[pilotKey];
      velocity.x = 0;
      velocity.z = 0;
      pilotKeyRef.current = pilotKey;
      // Contact state belongs to the currently piloted duck. Resetting it on
      // a 1–4 switch avoids a prior duck's overlap suppressing the new
      // duck's first real bump.
      contactByDuckRef.current.mom = false;
      contactByDuckRef.current.d1 = false;
      contactByDuckRef.current.d2 = false;
      contactByDuckRef.current.d3 = false;
    }

    const keys = duckKeyboard.getState();
    const horizontal = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
    const vertical = (keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0);
    const inputMagnitude = Math.hypot(horizontal, vertical);
    const physicsDelta = Math.min(delta, MAX_PHYSICS_DELTA);
    const velocity = velocityByDuckRef.current[pilotKey];

    if (inputMagnitude > 0) {
      const { up, right } = controlSpaceRef.current;
      // Camera *up*, rather than camera forward, is the direction toward the
      // top of the screen. Project it to the pond plane so ArrowUp still means
      // visual up at the shallow hero angle, the overhead sandbox angle, and
      // the underwater camera.
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      up.y = 0;
      if (up.lengthSq() < 0.0001) up.set(0, 0, -1);
      else up.normalize();

      // The camera's local +X is always screen-right. Project it onto the
      // pond plane too so the mapping remains correct during the dive.
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      right.y = 0;
      if (right.lengthSq() < 0.0001) right.set(1, 0, 0);
      else right.normalize();

      const inputScale = KEYBOARD_MAX_SPEED / inputMagnitude;
      const targetX = (right.x * horizontal + up.x * vertical) * inputScale;
      const targetZ = (right.z * horizontal + up.z * vertical) * inputScale;
      steerTowards(
        velocity,
        targetX,
        targetZ,
        KEYBOARD_ACCELERATION,
        physicsDelta,
      );
    } else {
      const coast = Math.exp(-KEYBOARD_COAST_DRAG * physicsDelta);
      velocity.x *= coast;
      velocity.z *= coast;
      if (Math.abs(velocity.x) < KEYBOARD_MOTION_EPSILON) velocity.x = 0;
      if (Math.abs(velocity.z) < KEYBOARD_MOTION_EPSILON) velocity.z = 0;
    }

    if (
      Math.abs(velocity.x) > KEYBOARD_MOTION_EPSILON ||
      Math.abs(velocity.z) > KEYBOARD_MOTION_EPSILON
    ) {
      const desiredX = duck.group.position.x + velocity.x * physicsDelta;
      const desiredZ = duck.group.position.z + velocity.z * physicsDelta;
      const next = constrainPondPosition(desiredX, desiredZ);
      // The elliptical boundary preserves a natural shoreline. Stop only the
      // blocked component so diagonal steering still skims smoothly along it.
      if (next.x !== desiredX) {
        velocity.x = 0;
      }
      if (next.z !== desiredZ) {
        velocity.z = 0;
      }
      duck.group.position.x = next.x;
      duck.group.position.z = next.z;

      // With only four ducks this costs three planar distance checks during
      // actual movement. A new contact bounces both visible bodies and nudges
      // the piloted one back along the contact normal, so it cannot visually
      // drive through another duck. We intentionally leave the other duck's
      // travel state untouched: timelines and first-person tracking stay
      // stable, and the reaction remains purely local and reversible.
      const now = state.clock.elapsedTime;
      for (const otherKey of DUCK_KEYS) {
        if (otherKey === pilotKey) continue;
        const other = getDuck(otherKey);
        if (!other) continue;

        const dx = duck.group.position.x - other.group.position.x;
        const dz = duck.group.position.z - other.group.position.z;
        const distance = Math.hypot(dx, dz);
        const contactRadius =
          (duck.scale + other.scale) * DUCK_CONTACT_RADIUS_PER_SCALE +
          DUCK_CONTACT_PADDING;
        const inContact = distance < contactRadius;
        const wasInContact = contactByDuckRef.current[otherKey];

        if (!inContact) {
          if (distance > contactRadius * DUCK_CONTACT_RELEASE_MULTIPLIER) {
            contactByDuckRef.current[otherKey] = false;
          }
          continue;
        }

        if (
          wasInContact ||
          now - lastContactAtRef.current[otherKey] < DUCK_CONTACT_COOLDOWN
        ) {
          continue;
        }

        contactByDuckRef.current[otherKey] = true;
        lastContactAtRef.current[otherKey] = now;
        duck.bounce();
        other.bounce();

        const velocityLength = Math.hypot(velocity.x, velocity.z);
        const normalX =
          distance > 0.0001
            ? dx / distance
            : velocityLength > 0.0001
              ? -velocity.x / velocityLength
              : 1;
        const normalZ =
          distance > 0.0001
            ? dz / distance
            : velocityLength > 0.0001
              ? -velocity.z / velocityLength
              : 0;
        const overlap = contactRadius - distance;
        const nudge = Math.min(
          DUCK_CONTACT_NUDGE_MAX,
          Math.max(0.025, overlap * 0.55),
        );
        const separated = constrainPondPosition(
          duck.group.position.x + normalX * nudge,
          duck.group.position.z + normalZ * nudge,
        );
        duck.group.position.x = separated.x;
        duck.group.position.z = separated.z;
        velocity.x *= 0.28;
        velocity.z *= 0.28;
      }
    }
  });

  useEffect(() => {
    // First render is the initial HOME state set up via the basePosition
    // props on the Duck components below — mom at CENTER_X, ducklings at
    // HIDDEN_X.left. No animation.
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      prevViewRef.current = view;
      return;
    }

    const prevView = prevViewRef.current;
    if (prevView === view) return;

    if (activeTLRef.current) {
      activeTLRef.current.kill();
      activeTLRef.current = null;
    }
    nav.setContentVisible(null);

    const oldStopper = STOPPER_FOR_VIEW[prevView];
    const newStopper = STOPPER_FOR_VIEW[view];
    const hiddenSide = hiddenSideRef.current;
    const newSide: Side = hiddenSide === "left" ? "right" : "left";

    // ---- Read the world ----------------------------------------------
    // Start positions come from the ducks' actual current world positions
    // so a spam-click mid-tween still picks up sensibly from wherever
    // each duck happened to be.
    const startX: Record<DuckKey, number> = {} as Record<DuckKey, number>;
    for (const k of DUCK_KEYS) {
      const d = getDuck(k);
      startX[k] = d ? d.group.position.x : HIDDEN_X[hiddenSide][k];
    }

    // ---- Decide ends -------------------------------------------------
    const endX: Record<DuckKey, number> = {} as Record<DuckKey, number>;
    for (const k of DUCK_KEYS) {
      endX[k] = k === newStopper ? CENTER_X : HIDDEN_X[newSide][k];
    }

    if (reducedMotion) {
      // A reduced-motion route change still preserves the chosen duck/page
      // relationship, but it does not run the long swimming choreography.
      // Updating the same imperative groups keeps the canvas and overlay in
      // sync without a transient animation frame.
      for (const k of DUCK_KEYS) {
        const d = getDuck(k);
        if (!d) continue;
        d.group.position.set(endX[k], d.group.position.y, 0);
      }
      hiddenSideRef.current = newSide;
      prevViewRef.current = view;
      if (view !== "home") nav.setContentVisible(view);
      return;
    }

    // ---- Timings -----------------------------------------------------
    // Distance |a - b| / SWIM_SPEED = seconds, regardless of direction.
    // When mom actually arrives at CENTER under the sine.inOut curve.
    // Using the helper instead of distance/speed (linear) keeps OLD's
    // "wait for mama" delay accurate to within a frame.
    const mamaTotalDistance = Math.abs(endX.mom - startX.mom);
    const mamaTotalDuration = mamaTotalDistance / SWIM_SPEED;
    const t_mama_at_center =
      mamaTotalDistance > 0.01
        ? sineInOutT(
            Math.abs(CENTER_X - startX.mom) / mamaTotalDistance,
            mamaTotalDuration,
          )
        : 0;

    // When does the OLD stopper start moving?
    //   • if OLD is mama, there's no "wait for mama" — mama starts at 0.
    //   • else if OLD is not near CENTER (spam-click interruption left it
    //     mid-flight), skip the wait — just start at 0.
    //   • else if mama is the NEW stopper, OLD vacates *before* mama
    //     arrives so mom's spot is clear.
    //   • else OLD waits for mama and then follows.
    let oldStartTime = 0;
    if (oldStopper !== "mom") {
      const oldNearCenter = Math.abs(startX[oldStopper] - CENTER_X) < 0.5;
      if (oldNearCenter) {
        oldStartTime =
          newStopper === "mom"
            ? Math.max(0, t_mama_at_center - OLD_LEAD_DELAY)
            : t_mama_at_center + OLD_FOLLOW_DELAY;
      }
    }

    const tweenStart: Record<DuckKey, number> = {} as Record<DuckKey, number>;
    for (const k of DUCK_KEYS) {
      tweenStart[k] = k === oldStopper ? oldStartTime : 0;
    }

    // ---- Build the timeline -----------------------------------------
    const tl = gsap.timeline({
      paused: true,
      onComplete: () => {
        // Commit the new resting state. (Anyone who exited is already at
        // their HIDDEN_X[newSide] — that's where their tween ended.) The
        // page itself docks earlier, via the tl.call below.
        hiddenSideRef.current = newSide;
        prevViewRef.current = view;
      },
    });
    activeTLRef.current = tl;

    // Position tweens — single smooth ease for every duck. Per-stroke
    // surge (in Duck.tsx) provides the paddle-rhythm "life" on top.
    //
    // `z: 0` is part of every main tween so that any z offset the user
    // applied via arrow keys (on the centered duck) glides back to the
    // formation z=0 along with the x motion. No snap. The dodge tweens
    // below use `overwrite: "auto"` to take over the z channel for the
    // passers that need to weave around CENTER.
    for (const k of DUCK_KEYS) {
      const d = getDuck(k);
      if (!d) continue;
      const distance = Math.abs(endX[k] - startX[k]);
      if (distance < 0.01) continue;
      const duration = distance / SWIM_SPEED;
      tl.to(
        d.group.position,
        { x: endX[k], z: 0, duration, ease: SWIM_EASE },
        tweenStart[k],
      );
    }

    // ---- Dodges ------------------------------------------------------
    // OLD is "near" CENTER from time 0 to oldStartTime + CLOSE_WINDOW.
    const t_old_close_end = oldStartTime + OLD_CLOSE_WINDOW;
    // NEW stopper arrives at CENTER at the end of its sine.inOut tween
    // (progress = 1.0 ⇒ t = duration), so just sum start + duration.
    const newStopTotalDistance = Math.abs(endX[newStopper] - startX[newStopper]);
    const t_new_at_center =
      tweenStart[newStopper] + newStopTotalDistance / SWIM_SPEED;

    // Dock the page as soon as the chosen duck settles at center (+ a short
    // beat) rather than waiting for the last straggler to clear the frame.
    // This is what keeps the click→page beat snappy while the swim stays
    // slow. Home has no page to dock, so it's skipped there.
    if (view !== "home") {
      tl.call(
        () => nav.setContentVisible(view),
        undefined,
        t_new_at_center + DOCK_SETTLE,
      );
    }

    // Collect passers — ducks that cross CENTER (start and end on
    // opposite sides of it). t_pass is computed via sineInOutT so it
    // matches when each passer is actually at CENTER, not a linear
    // estimate that drifts.
    const passers: { key: DuckKey; t_pass: number; totalDistance: number; totalDuration: number; distToCenter: number }[] = [];
    for (const k of DUCK_KEYS) {
      if (k === oldStopper || k === newStopper) continue;
      const sStart = startX[k] - CENTER_X;
      const sEnd = endX[k] - CENTER_X;
      if (sStart * sEnd >= 0) continue; // doesn't cross
      const totalDistance = Math.abs(endX[k] - startX[k]);
      if (totalDistance < 0.01) continue;
      const totalDuration = totalDistance / SWIM_SPEED;
      const distToCenter = Math.abs(CENTER_X - startX[k]);
      const t_pass =
        tweenStart[k] +
        sineInOutT(distToCenter / totalDistance, totalDuration);
      passers.push({ key: k, t_pass, totalDistance, totalDuration, distToCenter });
    }
    passers.sort((a, b) => a.t_pass - b.t_pass);

    passers.forEach(
      ({ key, t_pass, totalDistance, totalDuration, distToCenter }, idx) => {
        const d = getDuck(key);
        if (!d) return;
        // Dodge if either (a) OLD is still near CENTER as this passer
        // crosses, or (b) NEW has already arrived and is parked there.
        const dodgesOld = t_pass < t_old_close_end;
        const dodgesNew = t_pass > t_new_at_center - 0.05;
        if (!dodgesOld && !dodgesNew) return;

        const sign = idx % 2 === 0 ? 1 : -1;
        const z_offset = PASS_Z_OFFSET * sign;

        // Enter the arc when the passer is `PASS_BAND` units before
        // CENTER, peak at CENTER, exit `PASS_BAND` units past. All three
        // times computed via sineInOutT so the z arc tracks the passer's
        // real x trajectory — the peak now actually lands when the
        // passer is at the obstacle's x.
        const t_enter =
          tweenStart[key] +
          sineInOutT(
            (distToCenter - PASS_BAND) / totalDistance,
            totalDuration,
          );
        const t_peak = t_pass;
        const t_exit =
          tweenStart[key] +
          sineInOutT(
            (distToCenter + PASS_BAND) / totalDistance,
            totalDuration,
          );
        if (t_peak <= t_enter || t_exit <= t_peak) return;

        // overwrite: "auto" so these z tweens win the channel from the
        // main tween's `z: 0` target while the swerve is active.
        tl.to(
          d.group.position,
          {
            z: z_offset,
            duration: t_peak - t_enter,
            ease: "sine.inOut",
            overwrite: "auto",
          },
          t_enter,
        );
        tl.to(
          d.group.position,
          {
            z: 0,
            duration: t_exit - t_peak,
            ease: "sine.inOut",
            overwrite: "auto",
          },
          t_peak,
        );
      },
    );

    tl.play(0);
  }, [reducedMotion, view]);

  return (
    <>
      <Duck
        ref={momRef}
        basePosition={[CENTER_X, 0, 0]}
        scale={MOM_SCALE}
        bobPhase={0}
        bobAmplitude={MOM_BOB_AMP}
        submergedFraction={MOM_SUBMERGED}
        rippleIndex={0}
        rippleRadius={0.56}
      />
      <Duck
        ref={d1Ref}
        basePosition={[HIDDEN_X.left.d1, 0, 0]}
        scale={DUCKLING_SCALE}
        bobPhase={0.7}
        bobAmplitude={DUCKLING_BOB_AMP}
        submergedFraction={DUCKLING_SUBMERGED}
        rippleIndex={1}
        rippleRadius={0.23}
      />
      <Duck
        ref={d2Ref}
        basePosition={[HIDDEN_X.left.d2, 0, 0]}
        scale={DUCKLING_SCALE}
        bobPhase={1.4}
        bobAmplitude={DUCKLING_BOB_AMP}
        submergedFraction={DUCKLING_SUBMERGED}
        rippleIndex={2}
        rippleRadius={0.23}
      />
      <Duck
        ref={d3Ref}
        basePosition={[HIDDEN_X.left.d3, 0, 0]}
        scale={DUCKLING_SCALE}
        bobPhase={2.1}
        bobAmplitude={DUCKLING_BOB_AMP}
        submergedFraction={DUCKLING_SUBMERGED}
        rippleIndex={3}
        rippleRadius={0.23}
      />
    </>
  );
}
