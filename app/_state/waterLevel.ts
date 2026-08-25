// Shared, mutable water-surface Y so the ducks float UP with the rising water
// during the dive transition. Water.tsx (GSAP) animates `.y`; each Duck reads
// it every frame and lifts by (y − rest) so the whole family rides the surface
// instead of ignoring the flood.
export const WATER_REST_Y = -0.1;

export const waterLevel = { y: WATER_REST_Y };

// How far the duck family sinks below the surface during a dive (0 = floating
// on top, negative = submerged). Water.tsx animates this; Duck.tsx adds it to
// each duck's Y so the whole family descends WITH the camera — you see the
// entire duck underwater instead of just the bit below the waterline.
export const duckDive = { y: 0 };
