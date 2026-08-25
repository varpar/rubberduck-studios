"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { POND_DIMENSIONS, pondBoundaryScale } from "../_state/pool";

const BANK_LEVEL = 0.055;

type GrassBlade = {
  x: number;
  z: number;
  height: number;
  width: number;
  yaw: number;
  lean: number;
  variant: 0 | 1;
};

type GrassClump = {
  angle: number;
  radius: number;
  count: number;
  width: number;
};

function seeded(value: number) {
  const hash = Math.sin(value * 127.1 + 311.7) * 43758.5453;
  return hash - Math.floor(hash);
}

function shorePoint(angle: number, radius: number) {
  const boundary = pondBoundaryScale(angle);
  return {
    x: Math.cos(angle) * POND_DIMENSIONS.radiusX * radius * boundary,
    z:
      POND_DIMENSIONS.centreZ +
      Math.sin(angle) * POND_DIMENSIONS.radiusZ * radius * boundary,
  };
}

/** A narrow blade with a baked, very slight forward bend. */
function createGrassBladeGeometry(variant: number) {
  const heightSegments = 5;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const halfWidth = 0.5;

  for (let row = 0; row <= heightSegments; row += 1) {
    const progress = row / heightSegments;
    const width = halfWidth * Math.pow(1 - progress, 0.64);
    const bend = Math.pow(progress, 2.15) * (0.13 + variant * 0.035);
    const sideways = Math.sin(progress * Math.PI) * (variant === 0 ? -0.035 : 0.045);

    positions.push(
      -width + sideways,
      progress,
      bend,
      width + sideways,
      progress,
      bend,
    );
    uvs.push(0, progress, 1, progress);
  }

  for (let row = 0; row < heightSegments; row += 1) {
    const left = row * 2;
    const right = left + 1;
    const nextLeft = left + 2;
    const nextRight = left + 3;
    indices.push(left, nextRight, nextLeft, left, right, nextRight);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function buildGrassBlades() {
  const clumps: readonly GrassClump[] = [
    { angle: -2.7, radius: 1.09, count: 9, width: 0.38 },
    { angle: -2.04, radius: 1.115, count: 8, width: 0.34 },
    { angle: -1.5, radius: 1.09, count: 7, width: 0.32 },
    { angle: -0.87, radius: 1.11, count: 8, width: 0.34 },
    { angle: -0.28, radius: 1.1, count: 9, width: 0.38 },
    { angle: 0.53, radius: 1.115, count: 8, width: 0.35 },
    { angle: 1.17, radius: 1.1, count: 7, width: 0.32 },
    { angle: 2.25, radius: 1.11, count: 8, width: 0.37 },
    { angle: 2.82, radius: 1.09, count: 7, width: 0.32 },
  ];
  const bladesByVariant: GrassBlade[][] = [[], []];
  let seedIndex = 0;

  clumps.forEach((clump, clumpIndex) => {
    const root = shorePoint(clump.angle, clump.radius);
    const tangentX = -Math.sin(clump.angle);
    const tangentZ = Math.cos(clump.angle);
    const outwardX = Math.cos(clump.angle);
    const outwardZ = Math.sin(clump.angle);

    for (let bladeIndex = 0; bladeIndex < clump.count; bladeIndex += 1) {
      const tangent = (seeded(seedIndex * 7 + 1) - 0.5) * clump.width;
      const radial = (seeded(seedIndex * 7 + 2) - 0.5) * 0.14;
      const variant = ((clumpIndex + bladeIndex) % 3 === 0 ? 1 : 0) as 0 | 1;
      bladesByVariant[variant].push({
        x: root.x + tangentX * tangent + outwardX * radial,
        z: root.z + tangentZ * tangent + outwardZ * radial,
        height: 0.34 + seeded(seedIndex * 7 + 3) * 0.48,
        width: 0.026 + seeded(seedIndex * 7 + 4) * 0.022,
        yaw: seeded(seedIndex * 7 + 5) * Math.PI * 2,
        lean: (seeded(seedIndex * 7 + 6) - 0.5) * 0.26,
        variant,
      });
      seedIndex += 1;
    }
  });

  return bladesByVariant;
}

/**
 * A restrained, static shore dressing: 71 bent grass blades in two instanced
 * batches. Realistic shoreline rocks now come from the shared imported model
 * in PondImportedAssets, so no generic procedural stones compete with them.
 */
export function PondBankFoliage() {
  const grassRefs = useRef<Array<THREE.InstancedMesh | null>>([]);
  const assets = useMemo(() => {
    const grassByVariant = buildGrassBlades();
    return {
      grassByVariant,
      grassGeometries: [createGrassBladeGeometry(0), createGrassBladeGeometry(1)],
      grassMaterials: [
        new THREE.MeshStandardMaterial({
          color: "#426f39",
          roughness: 0.91,
          metalness: 0,
          side: THREE.DoubleSide,
        }),
        new THREE.MeshStandardMaterial({
          color: "#69864b",
          roughness: 0.93,
          metalness: 0,
          side: THREE.DoubleSide,
        }),
      ],
    };
  }, []);

  useEffect(() => {
    const dummy = new THREE.Object3D();

    assets.grassByVariant.forEach((blades, variant) => {
      const mesh = grassRefs.current[variant];
      if (!mesh) return;
      blades.forEach((blade, index) => {
        dummy.position.set(blade.x, BANK_LEVEL - 0.004, blade.z);
        dummy.rotation.set(blade.lean, blade.yaw, 0);
        dummy.scale.set(blade.width, blade.height, blade.width);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
      });
      mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });

  }, [assets]);

  useEffect(
    () => () => {
      assets.grassGeometries.forEach((geometry) => geometry.dispose());
      assets.grassMaterials.forEach((material) => material.dispose());
    },
    [assets],
  );

  return (
    <group>
      {assets.grassByVariant.map((blades, variant) => (
        <instancedMesh
          key={`grass-${variant}`}
          ref={(mesh) => {
            grassRefs.current[variant] = mesh;
          }}
          args={[
            assets.grassGeometries[variant],
            assets.grassMaterials[variant],
            blades.length,
          ]}
          receiveShadow
          frustumCulled
        />
      ))}
    </group>
  );
}
