// Shared, mutable water-surface Y so the ducks float UP with the rising water
// during the dive transition. Water.tsx (GSAP) animates `.y`; each Duck reads
// it every frame and lifts by (y − rest) so the whole family rides the surface
// instead of ignoring the flood.
export const WATER_REST_Y = -0.1;

export const waterLevel = { y: WATER_REST_Y };
