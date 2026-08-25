/**
 * Imperative duck -> water bridge.
 *
 * These values are written and read inside R3F's render loop, so a mutable
 * store is intentional: React state would schedule four component renders on
 * every animation frame. The water shader consumes the four records as
 * uniform vectors to form body displacement, ring ripples, and V-shaped wakes.
 */
export type WaterInteractor = {
  x: number;
  z: number;
  vx: number;
  vz: number;
  speed: number;
  radius: number;
  phase: number;
  active: number;
  wakeCursor: number;
  lastWakeAt: number;
};

export const WAKE_IMPULSES_PER_DUCK = 4;

export type WaterWakeImpulse = {
  x: number;
  z: number;
  emittedAt: number;
  strength: number;
};

export const waterInteractors: WaterInteractor[] = Array.from(
  { length: 4 },
  (_, index) => ({
    x: 1000,
    z: 1000,
    vx: 0,
    vz: 0,
    speed: 0,
    radius: index === 0 ? 0.55 : 0.22,
    phase: index * 1.7,
    active: 0,
    wakeCursor: 0,
    lastWakeAt: -Infinity,
  }),
);

// A tiny world-space wake history. Each moving duck leaves four short-lived
// impulses behind it, which lets a ripple continue to travel after the duck
// has moved on without a costly height-field simulation or render target.
export const waterWakeImpulses: WaterWakeImpulse[] = Array.from(
  { length: waterInteractors.length * WAKE_IMPULSES_PER_DUCK },
  () => ({ x: 1000, z: 1000, emittedAt: -1000, strength: 0 }),
);
