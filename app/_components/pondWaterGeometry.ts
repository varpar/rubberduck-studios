import * as THREE from "three";
import { POND_BOUNDARY_HARMONICS, POND_DIMENSIONS } from "../_state/pool";

/** Keep the original wave lattice, omitting cells outside the pond's bounds. */
export function createPondWaterGeometry(lowPower: boolean) {
  const spacing = 80 / (lowPower ? 72 : 160);
  const boundaryScale = 1 + POND_BOUNDARY_HARMONICS.reduce(
    (sum, harmonic) => sum + Math.abs(harmonic.amplitude),
    0,
  );
  const radiusX = POND_DIMENSIONS.radiusX * boundaryScale;
  const radiusZ = POND_DIMENSIONS.radiusZ * boundaryScale;
  // Local +Y becomes world -Z. Round out to the original grid and retain a
  // guard cell so every triangle touching the fragment shader's mask remains.
  const minX = Math.floor(-radiusX / spacing) - 1;
  const maxX = Math.ceil(radiusX / spacing) + 1;
  const minY = Math.floor((-POND_DIMENSIONS.centreZ - radiusZ) / spacing) - 1;
  const maxY = Math.ceil((-POND_DIMENSIONS.centreZ + radiusZ) / spacing) + 1;
  const geometry = new THREE.PlaneGeometry(
    (maxX - minX) * spacing,
    (maxY - minY) * spacing,
    maxX - minX,
    maxY - minY,
  );
  geometry.translate((minX + maxX) * spacing / 2, (minY + maxY) * spacing / 2, 0);
  return geometry;
}
