"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { POND_DIMENSIONS } from "../_state/pool";

const WATER_SURFACE_Y = -0.1;
const PAD_SURFACE_Y = WATER_SURFACE_Y + 0.028;
const SAFE_PLANT_RADIUS = 0.77;

type MatrixInstance = {
  matrix: THREE.Matrix4;
};

type PadPlacement = {
  x: number;
  z: number;
  scale: number;
  rotation: number;
  variant: number;
};

function seeded(value: number) {
  const hash = Math.sin(value * 127.1 + 311.7) * 43758.5453;
  return hash - Math.floor(hash);
}

function makeMatrix(
  x: number,
  y: number,
  z: number,
  rotation: number,
  scale: [number, number, number],
  tilt = 0,
) {
  const yaw = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    rotation,
  );
  const pitch = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    tilt,
  );

  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    yaw.multiply(pitch),
    new THREE.Vector3(...scale),
  );
}

/**
 * A shallow, gently cupped water-lily pad. It is built as a smooth radial
 * surface rather than a faceted disc; three tiny outline changes let the
 * instanced clusters feel hand-placed without adding per-pad geometry.
 */
function makeLilyPadGeometry(variant: number) {
  const geometry = new THREE.BufferGeometry();
  const arcSegments = 48;
  const ringCount = 4;
  const notch = 0.22 + variant * 0.045;
  const outlineAspect = [0.96, 0.89, 1.03][variant];
  const positions: number[] = [-0.04, 0.004, 0];
  const uvs: number[] = [0.5, 0.5];
  const indices: number[] = [];
  const pointsPerRing = arcSegments + 1;
  const indexFor = (ring: number, segment: number) =>
    1 + (ring - 1) * pointsPerRing + segment;

  for (let ring = 1; ring <= ringCount; ring++) {
    const radius = ring / ringCount;

    for (let segment = 0; segment <= arcSegments; segment++) {
      const progress = segment / arcSegments;
      const angle = notch + progress * (Math.PI * 2 - notch * 2);
      const outline =
        1 +
        Math.sin(angle * (3.1 + variant * 0.35) + variant) * 0.028 +
        Math.sin(angle * 7.2 - variant * 0.65) * 0.018;
      const edgeLift =
        0.008 +
        radius * radius * (0.017 + variant * 0.002) +
        Math.sin(angle * 2.2 + variant) * 0.003 * radius;

      positions.push(
        Math.cos(angle) * radius * outline,
        edgeLift,
        Math.sin(angle) * radius * outline * outlineAspect,
      );
      uvs.push(
        0.5 + Math.cos(angle) * radius * 0.5,
        0.5 + Math.sin(angle) * radius * 0.5,
      );
    }
  }

  for (let segment = 0; segment < arcSegments; segment++) {
    indices.push(0, indexFor(1, segment + 1), indexFor(1, segment));
  }

  for (let ring = 1; ring < ringCount; ring++) {
    for (let segment = 0; segment < arcSegments; segment++) {
      const innerStart = indexFor(ring, segment);
      const innerEnd = indexFor(ring, segment + 1);
      const outerStart = indexFor(ring + 1, segment);
      const outerEnd = indexFor(ring + 1, segment + 1);
      indices.push(innerStart, outerEnd, outerStart, innerStart, innerEnd, outerEnd);
    }
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * A shared, curved petal with a rounded base and a gently lifted tip. The
 * smooth grid is transformed through one instanced mesh for every bloom.
 */
function makeLotusPetalGeometry() {
  const geometry = new THREE.BufferGeometry();
  const widthSegments = 8;
  const lengthSegments = 10;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const rowWidth = widthSegments + 1;
  const indexFor = (row: number, column: number) => row * rowWidth + column;

  for (let row = 0; row <= lengthSegments; row++) {
    const along = row / lengthSegments;
    const petalHalfWidth =
      Math.pow(Math.sin(Math.PI * along), 0.72) * (0.88 - along * 0.18);

    for (let column = 0; column <= widthSegments; column++) {
      const across = (column / widthSegments) * 2 - 1;
      const roundness = 1 - across * across;
      const crown = Math.sin(Math.PI * along) * (0.34 + roundness * 0.14);
      const tipLift = along * along * 0.17;

      positions.push(across * petalHalfWidth, crown + tipLift, along);
      uvs.push(column / widthSegments, along);
    }
  }

  for (let row = 0; row < lengthSegments; row++) {
    for (let column = 0; column < widthSegments; column++) {
      const lowerLeft = indexFor(row, column);
      const lowerRight = indexFor(row, column + 1);
      const upperLeft = indexFor(row + 1, column);
      const upperRight = indexFor(row + 1, column + 1);
      indices.push(lowerLeft, upperLeft, lowerRight, lowerRight, upperLeft, upperRight);
    }
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function safePondPoint(normalizedX: number, normalizedZ: number) {
  const distance = Math.hypot(normalizedX, normalizedZ);
  const scale = distance > SAFE_PLANT_RADIUS ? SAFE_PLANT_RADIUS / distance : 1;
  return {
    x: normalizedX * scale * POND_DIMENSIONS.radiusX,
    z: POND_DIMENSIONS.centreZ + normalizedZ * scale * POND_DIMENSIONS.radiusZ,
  };
}

function fillInstances(
  mesh: THREE.InstancedMesh | null,
  instances: readonly MatrixInstance[],
) {
  if (!mesh) return;

  instances.forEach((instance, index) => {
    mesh.setMatrixAt(index, instance.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

/**
 * Adds a planted water-garden: 42 smooth, cupped pads and eight layered
 * blossoms. Each repeated form is instanced, keeping the richer silhouettes
 * to seven draw calls even though it reads as a much fuller planted edge.
 */
export function PondLotus() {
  const firstPadRef = useRef<THREE.InstancedMesh>(null);
  const secondPadRef = useRef<THREE.InstancedMesh>(null);
  const thirdPadRef = useRef<THREE.InstancedMesh>(null);
  const outerPetalRef = useRef<THREE.InstancedMesh>(null);
  const innerPetalRef = useRef<THREE.InstancedMesh>(null);
  const flowerCentreRef = useRef<THREE.InstancedMesh>(null);
  const budRef = useRef<THREE.InstancedMesh>(null);

  const assets = useMemo(() => {
    const padGeometries = [0, 1, 2].map(makeLilyPadGeometry);
    // Fixed material batches deliberately avoid creating the instanced colour
    // attribute after the first WebGL compile. That prevents plants from
    // flashing black through the water's reflection/refraction pass.
    const padMaterials = [
      new THREE.MeshStandardMaterial({
        color: "#487d42",
        roughness: 0.58,
        metalness: 0,
        emissive: "#17391b",
        emissiveIntensity: 0.22,
        side: THREE.DoubleSide,
      }),
      new THREE.MeshStandardMaterial({
        color: "#5a8a49",
        roughness: 0.62,
        metalness: 0,
        emissive: "#1b401d",
        emissiveIntensity: 0.2,
        side: THREE.DoubleSide,
      }),
      new THREE.MeshStandardMaterial({
        color: "#386f42",
        roughness: 0.56,
        metalness: 0,
        emissive: "#112d18",
        emissiveIntensity: 0.24,
        side: THREE.DoubleSide,
      }),
    ];
    const petalGeometry = makeLotusPetalGeometry();
    const flowerCentreGeometry = new THREE.SphereGeometry(1, 18, 12);
    const budGeometry = new THREE.SphereGeometry(1, 18, 14);
    const outerPetalMaterial = new THREE.MeshStandardMaterial({
      color: "#f6cdd6",
      roughness: 0.46,
      metalness: 0,
      emissive: "#5a2433",
      emissiveIntensity: 0.2,
      side: THREE.DoubleSide,
    });
    const innerPetalMaterial = new THREE.MeshStandardMaterial({
      color: "#fff0e9",
      roughness: 0.42,
      metalness: 0,
      emissive: "#5a3840",
      emissiveIntensity: 0.18,
      side: THREE.DoubleSide,
    });
    const flowerCentreMaterial = new THREE.MeshStandardMaterial({
      color: "#ffd66f",
      roughness: 0.42,
      metalness: 0,
      emissive: "#513514",
      emissiveIntensity: 0.22,
    });
    const budMaterial = new THREE.MeshStandardMaterial({
      color: "#f2b9c6",
      roughness: 0.48,
      metalness: 0,
      emissive: "#4f1728",
      emissiveIntensity: 0.1,
    });

    const clusters = [
      { x: -0.55, z: -0.43, spreadX: 0.16, spreadZ: 0.11, count: 9 },
      { x: 0.48, z: -0.4, spreadX: 0.16, spreadZ: 0.11, count: 8 },
      { x: -0.61, z: 0.08, spreadX: 0.12, spreadZ: 0.16, count: 7 },
      { x: 0.57, z: 0.16, spreadX: 0.13, spreadZ: 0.16, count: 7 },
      { x: -0.18, z: 0.48, spreadX: 0.2, spreadZ: 0.1, count: 6 },
      { x: 0.2, z: 0.46, spreadX: 0.16, spreadZ: 0.09, count: 5 },
    ];
    const pads: PadPlacement[] = [];
    let seedIndex = 0;

    clusters.forEach((cluster, clusterIndex) => {
      for (let index = 0; index < cluster.count; index++) {
        const point = safePondPoint(
          cluster.x + (seeded(seedIndex * 13 + 1) - 0.5) * cluster.spreadX * 2,
          cluster.z + (seeded(seedIndex * 13 + 2) - 0.5) * cluster.spreadZ * 2,
        );
        pads.push({
          ...point,
          scale: 0.27 + seeded(seedIndex * 13 + 3) * 0.27,
          rotation: seeded(seedIndex * 13 + 4) * Math.PI * 2,
          variant:
            (clusterIndex + index + Math.floor(seeded(seedIndex * 13 + 5) * 2)) %
            3,
        });
        seedIndex += 1;
      }
    });

    const padsByVariant: MatrixInstance[][] = [[], [], []];
    pads.forEach((pad) => {
      padsByVariant[pad.variant].push({
        matrix: makeMatrix(
          pad.x,
          PAD_SURFACE_Y,
          pad.z,
          pad.rotation,
          [pad.scale, 1, pad.scale],
        ),
      });
    });

    const flowerPadIndices = [1, 7, 11, 17, 23, 29, 35, 40];
    const outerPetals: MatrixInstance[] = [];
    const innerPetals: MatrixInstance[] = [];
    const centres: MatrixInstance[] = [];
    const buds: MatrixInstance[] = [];

    flowerPadIndices.forEach((padIndex, flowerIndex) => {
      const pad = pads[padIndex];
      const blossomRotation = seeded(flowerIndex * 17 + 3) * Math.PI * 2;
      const blossomScale = 0.84 + seeded(flowerIndex * 17 + 5) * 0.24;
      const outerPetalCount = 9;
      const innerPetalCount = 7;

      for (let petalIndex = 0; petalIndex < outerPetalCount; petalIndex++) {
        const angle = blossomRotation + (petalIndex / outerPetalCount) * Math.PI * 2;
        outerPetals.push({
          matrix: makeMatrix(
            pad.x,
            PAD_SURFACE_Y + 0.022,
            pad.z,
            angle,
            [0.102 * blossomScale, 0.15 * blossomScale, 0.215 * blossomScale],
            -0.16,
          ),
        });
      }

      for (let petalIndex = 0; petalIndex < innerPetalCount; petalIndex++) {
        const angle =
          blossomRotation + 0.31 + (petalIndex / innerPetalCount) * Math.PI * 2;
        innerPetals.push({
          matrix: makeMatrix(
            pad.x,
            PAD_SURFACE_Y + 0.055,
            pad.z,
            angle,
            [0.078 * blossomScale, 0.17 * blossomScale, 0.145 * blossomScale],
            -0.37,
          ),
        });
      }

      centres.push({
        matrix: makeMatrix(
          pad.x,
          PAD_SURFACE_Y + 0.085,
          pad.z,
          blossomRotation,
          [0.052 * blossomScale, 0.036 * blossomScale, 0.052 * blossomScale],
        ),
      });
    });

    [3, 14, 25, 32, 38].forEach((padIndex, budIndex) => {
      const pad = pads[padIndex];
      const angle = seeded(budIndex * 23 + 2) * Math.PI * 2;
      const distance = pad.scale * 0.45;
      const budScale = 0.8 + seeded(budIndex * 23 + 5) * 0.22;
      buds.push({
        matrix: makeMatrix(
          pad.x + Math.sin(angle) * distance,
          PAD_SURFACE_Y + 0.07,
          pad.z + Math.cos(angle) * distance,
          angle,
          [0.047 * budScale, 0.11 * budScale, 0.047 * budScale],
        ),
      });
    });

    return {
      padGeometries,
      padMaterials,
      petalGeometry,
      outerPetalMaterial,
      innerPetalMaterial,
      flowerCentreGeometry,
      flowerCentreMaterial,
      budGeometry,
      budMaterial,
      padsByVariant,
      outerPetals,
      innerPetals,
      centres,
      buds,
    };
  }, []);

  useEffect(() => {
    fillInstances(firstPadRef.current, assets.padsByVariant[0]);
    fillInstances(secondPadRef.current, assets.padsByVariant[1]);
    fillInstances(thirdPadRef.current, assets.padsByVariant[2]);
    fillInstances(outerPetalRef.current, assets.outerPetals);
    fillInstances(innerPetalRef.current, assets.innerPetals);
    fillInstances(flowerCentreRef.current, assets.centres);
    fillInstances(budRef.current, assets.buds);
  }, [assets]);

  useEffect(
    () => () => {
      assets.padGeometries.forEach((geometry) => geometry.dispose());
      assets.padMaterials.forEach((material) => material.dispose());
      assets.petalGeometry.dispose();
      assets.outerPetalMaterial.dispose();
      assets.innerPetalMaterial.dispose();
      assets.flowerCentreGeometry.dispose();
      assets.flowerCentreMaterial.dispose();
      assets.budGeometry.dispose();
      assets.budMaterial.dispose();
    },
    [assets],
  );

  return (
    <group>
      <instancedMesh
        ref={firstPadRef}
        args={[
          assets.padGeometries[0],
          assets.padMaterials[0],
          assets.padsByVariant[0].length,
        ]}
      />
      <instancedMesh
        ref={secondPadRef}
        args={[
          assets.padGeometries[1],
          assets.padMaterials[1],
          assets.padsByVariant[1].length,
        ]}
      />
      <instancedMesh
        ref={thirdPadRef}
        args={[
          assets.padGeometries[2],
          assets.padMaterials[2],
          assets.padsByVariant[2].length,
        ]}
      />
      <instancedMesh
        ref={outerPetalRef}
        args={[
          assets.petalGeometry,
          assets.outerPetalMaterial,
          assets.outerPetals.length,
        ]}
      />
      <instancedMesh
        ref={innerPetalRef}
        args={[
          assets.petalGeometry,
          assets.innerPetalMaterial,
          assets.innerPetals.length,
        ]}
      />
      <instancedMesh
        ref={flowerCentreRef}
        args={[
          assets.flowerCentreGeometry,
          assets.flowerCentreMaterial,
          assets.centres.length,
        ]}
      />
      <instancedMesh
        ref={budRef}
        args={[assets.budGeometry, assets.budMaterial, assets.buds.length]}
      />
    </group>
  );
}
