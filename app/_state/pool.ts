/**
 * These base radii are shared by the water mask, the shoreline scene, the
 * sandbox camera, and the keyboard controller. A shared low-frequency outline
 * below turns that ellipse into a natural pond while keeping ducks in water.
 */
export const POND_DIMENSIONS = {
  radiusX: 11.6,
  radiusZ: 7.05,
  centreZ: -0.35,
  floorY: -2.35,
} as const;

// Keep the terrain, water mask, shore assets, and movement boundary on one
// gently irregular outline. These are deliberately low-frequency so the pond
// feels hand-shaped rather than like a noisy procedural blob.
export const POND_BOUNDARY_HARMONICS = [
  { frequency: 3, phase: 0.6, amplitude: 0.042 },
  { frequency: 7, phase: -1.7, amplitude: 0.022 },
  { frequency: 11, phase: 0.5, amplitude: 0.011 },
] as const;

const SWIM_INSET = 0.86;

export function pondBoundaryScale(angle: number) {
  return POND_BOUNDARY_HARMONICS.reduce(
    (scale, harmonic) =>
      scale +
      Math.sin(angle * harmonic.frequency + harmonic.phase) *
        harmonic.amplitude,
    1,
  );
}

export function pondNormalizedDistance(x: number, z: number) {
  const normalizedX = x / POND_DIMENSIONS.radiusX;
  const normalizedZ = (z - POND_DIMENSIONS.centreZ) / POND_DIMENSIONS.radiusZ;
  const radius = Math.hypot(normalizedX, normalizedZ);
  const angle = Math.atan2(normalizedZ, normalizedX);

  return radius / pondBoundaryScale(angle);
}

export function constrainPondPosition(x: number, z: number) {
  const relativeZ = z - POND_DIMENSIONS.centreZ;
  const normalizedX = x / POND_DIMENSIONS.radiusX;
  const normalizedZ = relativeZ / POND_DIMENSIONS.radiusZ;
  const distance = Math.hypot(normalizedX, normalizedZ);
  const angle = Math.atan2(normalizedZ, normalizedX);
  const limit = pondBoundaryScale(angle) * SWIM_INSET;

  if (distance <= limit) return { x, z };

  const scale = limit / Math.max(distance, 0.0001);

  return {
    x: x * scale,
    z: POND_DIMENSIONS.centreZ + relativeZ * scale,
  };
}
