"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// This stays a hair above the water's rest height. The leaf geometry itself is
// shallowly cupped, so the centre and rim catch light differently without any
// animation or an extra render pass.
const WATER_LEVEL = -0.1;
const PAD_HEIGHT = WATER_LEVEL + 0.017;
const TAU = Math.PI * 2;

type LilyPad = {
  x: number;
  z: number;
  size: number;
  rotation: number;
  tiltX: number;
  tiltZ: number;
  stretchX: number;
  stretchZ: number;
  variant: 0 | 1 | 2;
};

type IndexedLilyPad = LilyPad & { id: number };

// A tap should feel like it displaces a light leaf, rather than turning the
// entire pond into a physics toy. This remains local to the touched instance:
// one short dip, a little roll, then it settles back into its base matrix.
const TAP_REACTION_SECONDS = 0.7;
const TAP_DIP_WORLD = 0.032;
const TAP_TILT_RADIANS = 0.06;

// A deliberately small field. These are placed as individual leaves along the
// quieter edges, leaving open water for the ducks and the hero water lily.
const LILY_PADS: readonly LilyPad[] = [
  {
    x: -7.45,
    z: -3.85,
    size: 0.9,
    rotation: 1.64,
    tiltX: 0.014,
    tiltZ: -0.018,
    stretchX: 1.08,
    stretchZ: 0.9,
    variant: 0,
  },
  {
    x: -0.45,
    z: -5.42,
    size: 0.78,
    rotation: 2.28,
    tiltX: -0.01,
    tiltZ: 0.014,
    stretchX: 1.04,
    stretchZ: 0.96,
    variant: 0,
  },
  {
    x: 3.3,
    z: -4.68,
    size: 0.77,
    rotation: 3.2,
    tiltX: 0.018,
    tiltZ: 0.008,
    stretchX: 1.06,
    stretchZ: 0.94,
    variant: 2,
  },
  {
    x: 7.42,
    z: -2.58,
    size: 0.75,
    rotation: 4.08,
    tiltX: -0.012,
    tiltZ: -0.018,
    stretchX: 1.08,
    stretchZ: 0.9,
    variant: 0,
  },
  {
    x: 7.3,
    z: 0.58,
    size: 0.88,
    rotation: 2.84,
    tiltX: -0.016,
    tiltZ: 0.01,
    stretchX: 1.08,
    stretchZ: 0.89,
    variant: 1,
  },
  {
    x: -4.72,
    z: 2.75,
    size: 0.5,
    rotation: 0.88,
    tiltX: -0.008,
    tiltZ: 0.012,
    stretchX: 1.08,
    stretchZ: 0.9,
    variant: 1,
  },
];

function circularDistance(angle: number) {
  return Math.abs(((angle + Math.PI) % TAU) - Math.PI);
}

/**
 * Builds a water-lily leaf as a subtly cupped radial surface instead of an
 * extruded disc. The deep stem notch, gently uneven edge, dark rim, and faint
 * built-in vein colour make it read like a leaf at close range while staying
 * efficient enough to instance in three static batches.
 */
function createLilyPadGeometry(variant: number) {
  const segments = 72;
  const rings = 7;
  const pointsPerRing = segments + 1;
  const phase = [0.42, 1.85, 3.1][variant];
  const aspect = [0.94, 1.04, 0.88][variant];
  const baseColour = new THREE.Color(["#466b37", "#567743", "#3f6839"][variant]);
  const colour = new THREE.Color();
  const positions: number[] = [0, 0.035, 0];
  const colors: number[] = [
    baseColour.r * 1.08,
    baseColour.g * 1.08,
    baseColour.b * 1.08,
  ];
  const indices: number[] = [];
  const outerRingStart = 1 + (rings - 1) * pointsPerRing;
  const bottomRingStart = 1 + rings * pointsPerRing;

  const indexFor = (ring: number, segment: number) =>
    1 + (ring - 1) * pointsPerRing + segment;

  for (let ring = 1; ring <= rings; ring += 1) {
    const radial = ring / rings;

    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * TAU;
      const notchDistance = circularDistance(angle);
      // A soft, broad subtraction makes a true leaf notch rather than a cut
      // made with a perfect V. It falls away by the time it reaches the rim.
      const notch = Math.exp(
        -Math.pow(notchDistance / (0.19 + variant * 0.018), 2),
      );
      const edge =
        1 +
        Math.sin(angle * (3.1 + variant * 0.18) + phase) * 0.025 +
        Math.sin(angle * 7.4 - phase) * 0.012;
      const leafRadius = radial * edge * (1 - notch * 0.84 * radial);
      const x = Math.cos(angle) * leafRadius;
      const z = Math.sin(angle) * leafRadius * aspect;
      const vein = Math.pow(
        Math.max(0, Math.cos((angle - phase * 0.14) * 9)),
        30,
      );
      const lowFrequencyShade = Math.sin(angle * 2.3 + phase) * 0.014;
      const lightness =
        0.048 * (1 - radial) +
        vein * (0.028 + radial * 0.02) -
        radial * 0.023 +
        lowFrequencyShade;
      const y =
        0.017 +
        (1 - radial) * 0.02 +
        radial * radial * 0.006 +
        Math.sin(angle * 2 + phase) * radial * 0.0028;

      colour.copy(baseColour).offsetHSL(0, 0, lightness);
      positions.push(x, y, z);
      colors.push(colour.r, colour.g, colour.b);
    }
  }

  // First ring is a simple fan from a slightly lifted leaf centre.
  for (let segment = 0; segment < segments; segment += 1) {
    indices.push(0, indexFor(1, segment + 1), indexFor(1, segment));
  }

  for (let ring = 1; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const innerStart = indexFor(ring, segment);
      const innerEnd = indexFor(ring, segment + 1);
      const outerStart = indexFor(ring + 1, segment);
      const outerEnd = indexFor(ring + 1, segment + 1);
      indices.push(
        innerStart,
        outerEnd,
        outerStart,
        innerStart,
        innerEnd,
        outerEnd,
      );
    }
  }

  // A dark, thin live edge keeps the pads from looking like paper-thin game
  // sprites when the camera drops to the waterline.
  for (let segment = 0; segment <= segments; segment += 1) {
    const source = outerRingStart + segment;
    positions.push(
      positions[source * 3],
      positions[source * 3 + 1] - 0.021,
      positions[source * 3 + 2],
    );
    colors.push(baseColour.r * 0.57, baseColour.g * 0.62, baseColour.b * 0.55);
  }

  for (let segment = 0; segment < segments; segment += 1) {
    const topStart = outerRingStart + segment;
    const topEnd = topStart + 1;
    const bottomStart = bottomRingStart + segment;
    const bottomEnd = bottomStart + 1;
    indices.push(
      topStart,
      bottomEnd,
      bottomStart,
      topStart,
      topEnd,
      bottomEnd,
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function PondLilyPads() {
  const meshRefs = useRef<Array<THREE.InstancedMesh | null>>([]);
  const matrixDummyRef = useRef(new THREE.Object3D());
  const frameTimeRef = useRef(0);
  const tappedAtRef = useRef<number[]>(
    Array.from({ length: LILY_PADS.length }, () => -Infinity),
  );
  const activeTapCountRef = useRef(0);
  const assets = useMemo(() => {
    const padsByVariant: IndexedLilyPad[][] = [[], [], []];
    LILY_PADS.forEach((pad, id) =>
      padsByVariant[pad.variant].push({ ...pad, id }),
    );

    return {
      geometries: [0, 1, 2].map(createLilyPadGeometry),
      materials: [
        new THREE.MeshPhysicalMaterial({
          color: "#ffffff",
          vertexColors: true,
          roughness: 0.59,
          metalness: 0,
          clearcoat: 0.08,
          clearcoatRoughness: 0.82,
          side: THREE.DoubleSide,
        }),
        new THREE.MeshPhysicalMaterial({
          color: "#ffffff",
          vertexColors: true,
          roughness: 0.63,
          metalness: 0,
          clearcoat: 0.06,
          clearcoatRoughness: 0.86,
          side: THREE.DoubleSide,
        }),
        new THREE.MeshPhysicalMaterial({
          color: "#ffffff",
          vertexColors: true,
          roughness: 0.56,
          metalness: 0,
          clearcoat: 0.1,
          clearcoatRoughness: 0.78,
          side: THREE.DoubleSide,
        }),
      ],
      padsByVariant,
    };
  }, []);

  function writePadMatrix(
    mesh: THREE.InstancedMesh,
    pad: IndexedLilyPad,
    index: number,
    yOffset = 0,
    tiltOffset = 0,
    yawOffset = 0,
  ) {
    const dummy = matrixDummyRef.current;
    dummy.position.set(pad.x, PAD_HEIGHT + yOffset, pad.z);
    dummy.rotation.set(
      pad.tiltX + tiltOffset,
      pad.rotation + yawOffset,
      pad.tiltZ - tiltOffset * 0.72,
    );
    dummy.scale.set(pad.size * pad.stretchX, 1, pad.size * pad.stretchZ);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }

  useEffect(() => {
    assets.padsByVariant.forEach((pads, variant) => {
      const mesh = meshRefs.current[variant];
      if (!mesh) return;

      pads.forEach((pad, index) => {
        writePadMatrix(mesh, pad, index);
      });

      // There are only six matrices; each is touched for less than a second
      // after a direct tap. Dynamic usage keeps the resting pond just as
      // light while allowing that small local response.
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }, [assets]);

  useFrame((state) => {
    const now = state.clock.elapsedTime;
    frameTimeRef.current = now;
    // No active tap means no instance loops or GPU matrix uploads at all.
    if (activeTapCountRef.current === 0) return;

    assets.padsByVariant.forEach((pads, variant) => {
      const mesh = meshRefs.current[variant];
      if (!mesh) return;

      let changed = false;
      pads.forEach((pad, index) => {
        const tappedAt = tappedAtRef.current[pad.id];
        const elapsed = now - tappedAt;
        if (elapsed < 0 || tappedAt === -Infinity) return;
        if (elapsed >= TAP_REACTION_SECONDS) {
          // Restore the exact rest matrix even if a slow frame skipped over
          // the final, near-zero portion of the animation.
          writePadMatrix(mesh, pad, index);
          tappedAtRef.current[pad.id] = -Infinity;
          activeTapCountRef.current = Math.max(
            0,
            activeTapCountRef.current - 1,
          );
          changed = true;
          return;
        }

        const progress = elapsed / TAP_REACTION_SECONDS;
        // The touched side dips first, rises, and then softly settles. This
        // reads as a water response without a new simulation target or a
        // frame-by-frame React update.
        const taper = Math.pow(1 - progress, 0.7);
        const wave = Math.sin(progress * Math.PI * 2) * taper;
        writePadMatrix(
          mesh,
          pad,
          index,
          -wave * TAP_DIP_WORLD,
          wave * TAP_TILT_RADIANS,
          wave * 0.085,
        );
        changed = true;
      });

      if (changed) mesh.instanceMatrix.needsUpdate = true;
    });
  });

  function tapPad(variant: number, instanceId: number | undefined) {
    if (instanceId === undefined || instanceId < 0) return;
    const pad = assets.padsByVariant[variant]?.[instanceId];
    if (!pad) return;
    if (tappedAtRef.current[pad.id] === -Infinity) {
      activeTapCountRef.current += 1;
    }
    tappedAtRef.current[pad.id] = frameTimeRef.current;
  }

  useEffect(
    () => () => {
      assets.geometries.forEach((geometry) => geometry.dispose());
      assets.materials.forEach((material) => material.dispose());
    },
    [assets],
  );

  return (
    <group>
      {assets.padsByVariant.map((pads, variant) => (
        <instancedMesh
          key={variant}
          ref={(mesh) => {
            meshRefs.current[variant] = mesh;
          }}
          args={[
            assets.geometries[variant],
            assets.materials[variant],
            pads.length,
          ]}
          frustumCulled
          onPointerDown={(event: ThreeEvent<PointerEvent>) => {
            // A pad is an intentional target — do not also trigger a
            // click-through on the water or scenery behind it.
            event.stopPropagation();
            tapPad(variant, event.instanceId);
          }}
        />
      ))}
    </group>
  );
}
