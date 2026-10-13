"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { pondBoundaryScale, POND_DIMENSIONS } from "../_state/pool";
import { PondBankFoliage } from "./PondBankFoliage";
import { PondImportedAssets } from "./PondImportedAssets";
import { PondLilyPads } from "./PondLilyPads";

const {
  radiusX: POND_RADIUS_X,
  radiusZ: POND_RADIUS_Z,
  centreZ: POND_CENTRE_Z,
} = POND_DIMENSIONS;
const POND_ASPECT = POND_RADIUS_Z / POND_RADIUS_X;
const WATER_LEVEL = -0.1;
const BANK_LEVEL = 0.055;

function seeded(value: number) {
  const hash = Math.sin(value * 127.1 + 311.7) * 43758.5453;
  return hash - Math.floor(hash);
}

function createTerrainTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Texture();

  context.fillStyle = "#6c8e4f";
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < 1800; index++) {
    const x = seeded(index * 3 + 1) * canvas.width;
    const y = seeded(index * 3 + 2) * canvas.height;
    const radius = 1 + seeded(index * 3 + 3) * 3.8;
    context.fillStyle = [
      "rgba(50, 91, 48, 0.42)",
      "rgba(121, 143, 70, 0.38)",
      "rgba(180, 153, 90, 0.26)",
      "rgba(224, 194, 126, 0.18)",
    ][index % 4];
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

type TerrainRing = {
  radius: number;
  height: number;
};

type TerrainPalette = {
  deep: THREE.Color;
  mid: THREE.Color;
  shallow: THREE.Color;
  wetSilt: THREE.Color;
  bank: THREE.Color;
};

// This profile is one continuous piece of terrain. `radius === 1` is the
// actual, horizontal waterline; the two rings around it deliberately cross the
// water level so the shoreline reads as a shallow, wet shelf rather than a
// flat disc clipped into a field. The centre remains broad and deep enough to
// give an underwater camera a real floor to look towards.
const TERRAIN_RINGS: readonly TerrainRing[] = [
  { radius: 0.14, height: -2.36 },
  { radius: 0.3, height: -2.34 },
  { radius: 0.44, height: -2.23 },
  { radius: 0.56, height: -2.01 },
  { radius: 0.66, height: -1.7 },
  { radius: 0.75, height: -1.32 },
  { radius: 0.83, height: -0.94 },
  { radius: 0.89, height: -0.62 },
  { radius: 0.935, height: -0.38 },
  { radius: 0.965, height: -0.22 },
  { radius: 0.985, height: -0.126 },
  { radius: 1, height: WATER_LEVEL + 0.008 },
  { radius: 1.018, height: -0.026 },
  { radius: 1.048, height: 0.009 },
  // Match the adjacent terrain ring at the outer edge so the basin has no
  // visible seam or hovering grass at its transition into the meadow.
  { radius: 1.09, height: BANK_LEVEL - 0.028 },
];

const TERRAIN_PALETTE: TerrainPalette = {
  deep: new THREE.Color("#306f72"),
  mid: new THREE.Color("#4c8a82"),
  shallow: new THREE.Color("#809d70"),
  wetSilt: new THREE.Color("#6e7658"),
  bank: new THREE.Color("#5f7d49"),
};

function basinSurfaceVariation(angle: number, radius: number) {
  // Correlated, low-frequency relief avoids the faceted speckle produced by
  // per-vertex random grain. It is strongest through the slope and fades at
  // both the deep bowl and the dry bank, so the waterline remains coherent.
  const slope = THREE.MathUtils.smoothstep(radius, 0.24, 0.96);
  const shore = THREE.MathUtils.smoothstep(radius, 0.78, 1.04);
  const bankFade = 1 - THREE.MathUtils.smoothstep(radius, 1, 1.09);
  const broad =
    Math.sin(angle * 3 - 0.75) * 0.018 +
    Math.sin(angle * 6 + 1.4) * 0.009;
  return broad * slope * (1 - shore * 0.58) * bankFade;
}

function basinVertexColor(radius: number, angle: number, palette: TerrainPalette) {
  const depthBlend = THREE.MathUtils.smoothstep(radius, 0.16, 0.82);
  const shallowBlend = THREE.MathUtils.smoothstep(radius, 0.64, 0.985);
  const shorelineBlend = THREE.MathUtils.smoothstep(radius, 0.93, 1.055);
  const color = palette.deep.clone().lerp(palette.mid, depthBlend);

  color.lerp(palette.shallow, shallowBlend);
  color.lerp(palette.wetSilt, shorelineBlend * 0.78);
  color.lerp(palette.bank, THREE.MathUtils.smoothstep(radius, 1.01, 1.09));

  // Gentle, contiguous pigment variation gives the shelf a soft sediment cue
  // without turning it into repeated concentric graphic rings.
  const pigment =
    Math.sin(angle * 4 + radius * 9.5) * 0.012 +
    Math.sin(angle * 7 - radius * 4.2) * 0.006;
  return color.offsetHSL(pigment * 0.22, pigment * 0.14, pigment);
}

function createPondBasin() {
  const segments = 192;
  const positions: number[] = [0, -2.36, POND_CENTRE_Z];
  const colors: number[] = [];
  const indices: number[] = [];
  const ringStarts: number[] = [];
  const centreColor = TERRAIN_PALETTE.deep;
  colors.push(centreColor.r, centreColor.g, centreColor.b);

  TERRAIN_RINGS.forEach((ring) => {
    ringStarts.push(positions.length / 3);
    const shoreInfluence = THREE.MathUtils.smoothstep(ring.radius, 0.68, 1.09);

    for (let segment = 0; segment < segments; segment++) {
      const angle = (segment / segments) * Math.PI * 2;
      const radialScale = 1 + (pondBoundaryScale(angle) - 1) * shoreInfluence;
      const x = Math.cos(angle) * POND_RADIUS_X * ring.radius * radialScale;
      const z =
        POND_CENTRE_Z +
        Math.sin(angle) * POND_RADIUS_Z * ring.radius * radialScale;
      positions.push(x, ring.height + basinSurfaceVariation(angle, ring.radius), z);

      const color = basinVertexColor(ring.radius, angle, TERRAIN_PALETTE);
      colors.push(color.r, color.g, color.b);
    }
  });

  const firstRing = ringStarts[0];
  for (let segment = 0; segment < segments; segment++) {
    const next = (segment + 1) % segments;
    indices.push(0, firstRing + next, firstRing + segment);
  }

  for (let ring = 0; ring < ringStarts.length - 1; ring++) {
    const inner = ringStarts[ring];
    const outer = ringStarts[ring + 1];
    for (let segment = 0; segment < segments; segment++) {
      const next = (segment + 1) % segments;
      indices.push(inner + segment, outer + segment, outer + next);
      indices.push(inner + segment, outer + next, inner + next);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return {
    geometry,
    material: new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.97,
      metalness: 0,
    }),
  };
}

function createIrregularGroundRing() {
  const segments = 160;
  const innerRadius = 1.09;
  const outerRadius = 28;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let segment = 0; segment < segments; segment++) {
    const angle = (segment / segments) * Math.PI * 2;
    const boundary = pondBoundaryScale(angle);
    const innerX = Math.cos(angle) * POND_RADIUS_X * innerRadius * boundary;
    const innerZ =
      POND_CENTRE_Z +
      Math.sin(angle) * POND_RADIUS_Z * innerRadius * boundary;
    const outerX = Math.cos(angle) * outerRadius;
    const outerZ = POND_CENTRE_Z + Math.sin(angle) * outerRadius * POND_ASPECT;

    positions.push(
      innerX,
      BANK_LEVEL - 0.028,
      innerZ,
      outerX,
      BANK_LEVEL - 0.028,
      outerZ,
    );
    uvs.push(
      innerX / (outerRadius * 2) + 0.5,
      (innerZ - POND_CENTRE_Z) / (outerRadius * POND_ASPECT * 2) + 0.5,
      outerX / (outerRadius * 2) + 0.5,
      (outerZ - POND_CENTRE_Z) / (outerRadius * POND_ASPECT * 2) + 0.5,
    );
  }

  for (let segment = 0; segment < segments; segment++) {
    const next = (segment + 1) % segments;
    const inner = segment * 2;
    const outer = inner + 1;
    const nextInner = next * 2;
    const nextOuter = nextInner + 1;
    indices.push(inner, nextOuter, outer, inner, nextInner, nextOuter);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function PondBasin() {
  const { geometry, material } = useMemo(() => createPondBasin(), []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return <mesh geometry={geometry} material={material} receiveShadow />;
}

type Rock = {
  x: number;
  z: number;
  y: number;
  size: number;
  rotation: number;
  stretch: [number, number, number];
};

function ShoreRocks() {
  const meshRefs = useRef<Array<THREE.InstancedMesh | null>>([]);
  const { geometries, materials, rocksByShape } = useMemo(() => {
    const clusters = [
      { angle: -2.35, spread: 0.32, count: 12, radius: 1.045 },
      { angle: -1.18, spread: 0.24, count: 9, radius: 1.035 },
      { angle: 0.52, spread: 0.2, count: 7, radius: 1.045 },
      { angle: 2.68, spread: 0.25, count: 8, radius: 1.04 },
    ];
    const rocksByShape: Rock[][] = [[], [], []];
    const stretches: [number, number, number][] = [
      [1.36, 0.7, 1.02],
      [0.9, 0.92, 1.26],
      [1.55, 0.46, 1.08],
    ];
    let seedIndex = 0;

    clusters.forEach((cluster, clusterIndex) => {
      for (let index = 0; index < cluster.count; index++) {
        const angle =
          cluster.angle +
          (seeded(seedIndex * 7 + 1) - 0.5) * cluster.spread;
        const radius =
          cluster.radius + (seeded(seedIndex * 7 + 2) - 0.5) * 0.12;
        const size =
          0.12 + seeded(seedIndex * 7 + 3) * 0.25 + (index === 0 ? 0.16 : 0);
        const shape = (seedIndex + clusterIndex * 2) % 3;
        const boundary = pondBoundaryScale(angle);
        rocksByShape[shape].push({
          x: Math.cos(angle) * POND_RADIUS_X * radius * boundary,
          z:
            POND_CENTRE_Z +
            Math.sin(angle) * POND_RADIUS_Z * radius * boundary,
          y: -0.015 + size * 0.38,
          size,
          rotation: seeded(seedIndex * 7 + 4) * Math.PI,
          stretch: stretches[shape],
        });
        seedIndex += 1;
      }
    });

    [
      { angle: -1.72, radius: 1.04, size: 0.64 },
      { angle: 2.12, radius: 1.06, size: 0.54 },
      { angle: 0.18, radius: 1.05, size: 0.46 },
    ].forEach((rock, index) => {
      const shape = (index + 1) % 3;
      const boundary = pondBoundaryScale(rock.angle);
      rocksByShape[shape].push({
        x: Math.cos(rock.angle) * POND_RADIUS_X * rock.radius * boundary,
        z:
          POND_CENTRE_Z +
          Math.sin(rock.angle) * POND_RADIUS_Z * rock.radius * boundary,
        y: -0.015 + rock.size * 0.34,
        size: rock.size,
        rotation: index * 0.85 + 0.2,
        stretch: stretches[shape],
      });
    });

    return {
      geometries: [
        new THREE.SphereGeometry(1, 18, 12),
        new THREE.SphereGeometry(1, 16, 12),
        new THREE.SphereGeometry(1, 14, 10),
      ],
      materials: [
        new THREE.MeshStandardMaterial({ color: "#788575", roughness: 0.84 }),
        new THREE.MeshStandardMaterial({ color: "#958c74", roughness: 0.86 }),
        new THREE.MeshStandardMaterial({ color: "#6f8170", roughness: 0.82 }),
      ],
      rocksByShape,
    };
  }, []);

  useEffect(() => {
    const dummy = new THREE.Object3D();
    rocksByShape.forEach((rocks, shape) => {
      const mesh = meshRefs.current[shape];
      if (!mesh) return;
      rocks.forEach((rock, index) => {
        dummy.position.set(rock.x, rock.y, rock.z);
        dummy.rotation.set(0, rock.rotation, rock.rotation * 0.35);
        dummy.scale.set(
          rock.size * rock.stretch[0],
          rock.size * rock.stretch[1],
          rock.size * rock.stretch[2],
        );
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }, [rocksByShape]);

  useEffect(
    () => () => {
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
    },
    [geometries, materials],
  );

  return (
    <group>
      {rocksByShape.map((rocks, shape) => (
        <instancedMesh
          key={shape}
          ref={(mesh) => {
            meshRefs.current[shape] = mesh;
          }}
          args={[geometries[shape], materials[shape], rocks.length]}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}

type Reed = {
  x: number;
  z: number;
  rootY: number;
  height: number;
  tilt: number;
  yaw: number;
};

function ShoreReeds() {
  const stemRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);
  const { stemGeometry, headGeometry, stemMaterial, headMaterial, reeds, heads } =
    useMemo(() => {
      const clusters = [
        { angle: -2.42, spread: 0.22, count: 12, radius: 1.0 },
        { angle: -1.7, spread: 0.28, count: 15, radius: 1.01 },
        { angle: -1.08, spread: 0.23, count: 12, radius: 1.0 },
        { angle: 2.65, spread: 0.14, count: 8, radius: 1.03 },
      ];
      const reeds: Reed[] = [];
      let seedIndex = 0;

      clusters.forEach((cluster) => {
        for (let index = 0; index < cluster.count; index++) {
          const angle =
            cluster.angle +
            (seeded(seedIndex * 11 + 1) - 0.5) * cluster.spread;
          const radius =
            cluster.radius + (seeded(seedIndex * 11 + 2) - 0.5) * 0.11;
          const boundary = pondBoundaryScale(angle);
          reeds.push({
            x: Math.cos(angle) * POND_RADIUS_X * radius * boundary,
            z:
              POND_CENTRE_Z +
              Math.sin(angle) * POND_RADIUS_Z * radius * boundary,
            rootY: radius > 1.02 ? BANK_LEVEL - 0.01 : WATER_LEVEL + 0.005,
            height: 0.52 + seeded(seedIndex * 11 + 3) * 0.94,
            tilt: (seeded(seedIndex * 11 + 4) - 0.5) * 0.24,
            yaw: seeded(seedIndex * 11 + 5) * Math.PI * 2,
          });
          seedIndex += 1;
        }
      });

      return {
        stemGeometry: new THREE.CylinderGeometry(0.014, 0.028, 1, 8),
        headGeometry: new THREE.SphereGeometry(0.055, 12, 8),
        stemMaterial: new THREE.MeshStandardMaterial({
          color: "#315d36",
          roughness: 0.88,
        }),
        headMaterial: new THREE.MeshStandardMaterial({
          color: "#513d25",
          roughness: 0.95,
        }),
        heads: reeds.filter((_, index) => index % 3 === 1 || index % 7 === 0),
        reeds,
      };
    }, []);

  useEffect(() => {
    const mesh = stemRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    reeds.forEach((reed, index) => {
      dummy.position.set(reed.x, reed.rootY + reed.height / 2, reed.z);
      dummy.rotation.set(reed.tilt * 0.45, reed.yaw, reed.tilt);
      dummy.scale.set(1, reed.height, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [reeds]);

  useEffect(() => {
    const mesh = headRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    heads.forEach((reed, index) => {
      dummy.position.set(reed.x, reed.rootY + reed.height * 0.76, reed.z);
      dummy.rotation.set(reed.tilt * 0.45, reed.yaw, reed.tilt);
      dummy.scale.set(0.74, 1.72, 0.74);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [heads]);

  useEffect(
    () => () => {
      stemGeometry.dispose();
      headGeometry.dispose();
      stemMaterial.dispose();
      headMaterial.dispose();
    },
    [headGeometry, headMaterial, stemGeometry, stemMaterial],
  );

  return (
    <group>
      <instancedMesh
        ref={stemRef}
        args={[stemGeometry, stemMaterial, reeds.length]}
        castShadow
      />
      <instancedMesh
        ref={headRef}
        args={[headGeometry, headMaterial, heads.length]}
        castShadow
      />
    </group>
  );
}

const PATH_POINTS = [
  new THREE.Vector3(-14, BANK_LEVEL + 0.008, -9.2),
  new THREE.Vector3(-7, BANK_LEVEL + 0.008, -9.82),
  new THREE.Vector3(0, BANK_LEVEL + 0.008, -9.36),
  new THREE.Vector3(7, BANK_LEVEL + 0.008, -10.12),
  new THREE.Vector3(14, BANK_LEVEL + 0.008, -9.3),
];

function PondPath() {
  const { geometry, material } = useMemo(() => {
    const halfWidth = 0.34;
    const positions: number[] = [];
    const indices: number[] = [];

    PATH_POINTS.forEach((point, index) => {
      const previous = PATH_POINTS[Math.max(0, index - 1)];
      const next = PATH_POINTS[Math.min(PATH_POINTS.length - 1, index + 1)];
      const direction = new THREE.Vector3().subVectors(next, previous).normalize();
      const side = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(
        halfWidth,
      );
      positions.push(
        point.x + side.x,
        point.y,
        point.z + side.z,
        point.x - side.x,
        point.y,
        point.z - side.z,
      );
    });

    for (let index = 0; index < PATH_POINTS.length - 1; index++) {
      const offset = index * 2;
      indices.push(offset, offset + 1, offset + 3, offset, offset + 3, offset + 2);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return {
      geometry,
      material: new THREE.MeshStandardMaterial({
        color: "#ae9367",
        roughness: 0.98,
      }),
    };
  }, []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return <mesh geometry={geometry} material={material} receiveShadow />;
}

function SmoothTree({
  position,
  scale = 1,
  foliage = "#427e4c",
  accent = "#629a5d",
}: {
  position: [number, number, number];
  scale?: number;
  foliage?: string;
  accent?: string;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.14, 1.45, 12]} />
        <meshStandardMaterial color="#685039" roughness={0.86} />
      </mesh>
      <mesh position={[0, 1.8, 0]} scale={[1.05, 0.92, 0.9]} castShadow>
        <sphereGeometry args={[1, 18, 14]} />
        <meshStandardMaterial color={foliage} roughness={0.72} />
      </mesh>
      <mesh position={[-0.58, 1.55, 0.16]} scale={[0.68, 0.62, 0.62]} castShadow>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color={accent} roughness={0.74} />
      </mesh>
      <mesh position={[0.62, 1.45, -0.1]} scale={[0.66, 0.6, 0.62]} castShadow>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color="#3d7647" roughness={0.76} />
      </mesh>
    </group>
  );
}

function SmoothShrub({
  position,
  scale = 1,
  color = "#5b914f",
}: {
  position: [number, number, number];
  scale?: number;
  color?: string;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[-0.34, 0.33, 0.03]} castShadow>
        <sphereGeometry args={[0.48, 14, 10]} />
        <meshStandardMaterial color={color} roughness={0.78} />
      </mesh>
      <mesh position={[0.22, 0.38, -0.05]} scale={[1.05, 1.12, 0.9]} castShadow>
        <sphereGeometry args={[0.48, 14, 10]} />
        <meshStandardMaterial color="#4d8148" roughness={0.8} />
      </mesh>
    </group>
  );
}

type TreeInstance = {
  x: number;
  z: number;
  scale: number;
};

function DenseTreeLine() {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const canopyRef = useRef<THREE.InstancedMesh>(null);
  const accentRef = useRef<THREE.InstancedMesh>(null);
  const { trees, trunkGeometry, canopyGeometry, trunkMaterial, canopyMaterial, accentMaterial } =
    useMemo(() => {
      const trees: TreeInstance[] = [
        { x: -10.6, z: -14.1, scale: 0.39 },
        { x: -7.6, z: -14.7, scale: 0.46 },
        { x: -4.1, z: -14.1, scale: 0.38 },
        { x: -0.9, z: -14.75, scale: 0.48 },
        { x: 2.4, z: -14.15, scale: 0.44 },
        { x: 5.7, z: -14.7, scale: 0.48 },
        { x: 9.1, z: -14.0, scale: 0.42 },
        { x: -10.8, z: -6.8, scale: 0.53 },
        { x: -7.3, z: -8.85, scale: 0.5 },
        { x: -2.8, z: -8.65, scale: 0.57 },
        { x: 1.0, z: -8.85, scale: 0.45 },
        { x: 5.2, z: -8.55, scale: 0.54 },
        { x: 9.3, z: -7.9, scale: 0.52 },
      ];

      return {
        trees,
        trunkGeometry: new THREE.CylinderGeometry(0.09, 0.14, 1.45, 12),
        canopyGeometry: new THREE.SphereGeometry(1, 18, 12),
        trunkMaterial: new THREE.MeshStandardMaterial({
          color: "#5d4733",
          roughness: 0.92,
        }),
        canopyMaterial: new THREE.MeshStandardMaterial({
          color: "#4f8d50",
          roughness: 0.72,
        }),
        accentMaterial: new THREE.MeshStandardMaterial({
          color: "#78aa67",
          roughness: 0.74,
        }),
      };
    }, []);

  useEffect(() => {
    const trunk = trunkRef.current;
    const canopy = canopyRef.current;
    const accent = accentRef.current;
    if (!trunk || !canopy || !accent) return;
    const dummy = new THREE.Object3D();

    trees.forEach((tree, index) => {
      dummy.position.set(tree.x, BANK_LEVEL + 0.72 * tree.scale, tree.z);
      dummy.rotation.set(0, index * 0.61, 0);
      dummy.scale.setScalar(tree.scale);
      dummy.updateMatrix();
      trunk.setMatrixAt(index, dummy.matrix);

      dummy.position.set(tree.x, BANK_LEVEL + 1.8 * tree.scale, tree.z);
      dummy.rotation.set(0, index * 0.61, 0);
      dummy.scale.set(1.05 * tree.scale, 0.92 * tree.scale, 0.9 * tree.scale);
      dummy.updateMatrix();
      canopy.setMatrixAt(index, dummy.matrix);

      dummy.position.set(
        tree.x - 0.55 * tree.scale,
        BANK_LEVEL + 1.52 * tree.scale,
        tree.z + 0.15 * tree.scale,
      );
      dummy.rotation.set(0, index * 0.61 + 0.28, 0);
      dummy.scale.set(0.68 * tree.scale, 0.62 * tree.scale, 0.62 * tree.scale);
      dummy.updateMatrix();
      accent.setMatrixAt(index, dummy.matrix);
    });

    [trunk, canopy, accent].forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }, [trees]);

  useEffect(
    () => () => {
      trunkGeometry.dispose();
      canopyGeometry.dispose();
      trunkMaterial.dispose();
      canopyMaterial.dispose();
      accentMaterial.dispose();
    },
    [accentMaterial, canopyGeometry, canopyMaterial, trunkGeometry, trunkMaterial],
  );

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[trunkGeometry, trunkMaterial, trees.length]} castShadow />
      <instancedMesh ref={canopyRef} args={[canopyGeometry, canopyMaterial, trees.length]} castShadow />
      <instancedMesh ref={accentRef} args={[canopyGeometry, accentMaterial, trees.length]} castShadow />
    </group>
  );
}

function PondBench({
  position,
  rotation = 0,
  scale = 1,
}: {
  position: [number, number, number];
  rotation?: number;
  scale?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <mesh position={[0, 0.36, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.1, 0.28]} />
        <meshStandardMaterial color="#866248" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.69, 0.09]} rotation={[0.13, 0, 0]} castShadow>
        <boxGeometry args={[1.1, 0.42, 0.08]} />
        <meshStandardMaterial color="#76553f" roughness={0.92} />
      </mesh>
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 0.16, 0]} castShadow>
          <boxGeometry args={[0.08, 0.34, 0.08]} />
          <meshStandardMaterial color="#493c31" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function PondBackdrop() {
  return (
    <group>
      <PondPath />
    </group>
  );
}

function PondDock() {
  return (
    <group position={[8.4, BANK_LEVEL - 0.02, 3.75]} rotation={[0, -0.35, 0]}>
      {[0, 0.62, 1.24, 1.86].map((z) => (
        <mesh key={z} position={[0, 0.12, z]} castShadow receiveShadow>
          <boxGeometry args={[1.55, 0.12, 0.5]} />
          <meshStandardMaterial color="#8c5f3f" roughness={0.86} />
        </mesh>
      ))}
      {[-0.58, 0.58].flatMap((x) => [
        <mesh key={`${x}-near`} position={[x, -0.27, 0.72]} castShadow>
          <cylinderGeometry args={[0.07, 0.09, 0.9, 7]} />
          <meshStandardMaterial color="#5a4231" roughness={0.92} />
        </mesh>,
        <mesh key={`${x}-far`} position={[x, -0.27, 2.02]} castShadow>
          <cylinderGeometry args={[0.07, 0.09, 0.9, 7]} />
          <meshStandardMaterial color="#5a4231" roughness={0.92} />
        </mesh>,
      ])}
    </group>
  );
}

type FallenLogInstance = {
  x: number;
  z: number;
  rotation: number;
  length: number;
  radius: number;
};

function FallenLogs() {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const branchRef = useRef<THREE.InstancedMesh>(null);
  const { logs, trunkGeometry, branchGeometry, trunkMaterial, branchMaterial } = useMemo(
    () => ({
      logs: [
        { x: -8.45, z: 3.35, rotation: 0.28, length: 2.3, radius: 0.18 },
        { x: -10.9, z: -4.75, rotation: -0.62, length: 1.8, radius: 0.14 },
        { x: -3.4, z: -9.2, rotation: 0.85, length: 1.5, radius: 0.13 },
        { x: 7.8, z: -8.35, rotation: -0.38, length: 2.1, radius: 0.16 },
        { x: 10.8, z: 2.4, rotation: 0.58, length: 1.85, radius: 0.15 },
      ] satisfies FallenLogInstance[],
      trunkGeometry: new THREE.CylinderGeometry(1, 1.08, 1, 16),
      branchGeometry: new THREE.CylinderGeometry(1, 0.82, 1, 12),
      trunkMaterial: new THREE.MeshStandardMaterial({
        color: "#765137",
        roughness: 0.88,
      }),
      branchMaterial: new THREE.MeshStandardMaterial({
        color: "#60412e",
        roughness: 0.9,
      }),
    }),
    [],
  );

  useEffect(() => {
    const trunk = trunkRef.current;
    const branch = branchRef.current;
    if (!trunk || !branch) return;
    const dummy = new THREE.Object3D();

    logs.forEach((log, index) => {
      const groundY = BANK_LEVEL + log.radius * 0.72;
      dummy.position.set(log.x, groundY, log.z);
      dummy.rotation.set(0, log.rotation, Math.PI / 2);
      dummy.scale.set(log.radius, log.length, log.radius);
      dummy.updateMatrix();
      trunk.setMatrixAt(index, dummy.matrix);

      const branchOffset = log.length * 0.28;
      dummy.position.set(
        log.x + Math.cos(log.rotation) * branchOffset,
        groundY + log.radius * 0.76,
        log.z + Math.sin(log.rotation) * branchOffset,
      );
      dummy.rotation.set(0, log.rotation - 0.48, Math.PI / 2.5);
      dummy.scale.set(log.radius * 0.48, log.length * 0.36, log.radius * 0.48);
      dummy.updateMatrix();
      branch.setMatrixAt(index, dummy.matrix);
    });

    [trunk, branch].forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }, [logs]);

  useEffect(
    () => () => {
      trunkGeometry.dispose();
      branchGeometry.dispose();
      trunkMaterial.dispose();
      branchMaterial.dispose();
    },
    [branchGeometry, branchMaterial, trunkGeometry, trunkMaterial],
  );

  return (
    <group>
      <instancedMesh
        ref={trunkRef}
        args={[trunkGeometry, trunkMaterial, logs.length]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={branchRef}
        args={[branchGeometry, branchMaterial, logs.length]}
        castShadow
        receiveShadow
      />
    </group>
  );
}

type PondEnvironmentProps = {
  /** Fires after the last deferred decorative GLB tier has settled. */
  onImportedAssetsReady?: () => void;
  /** Genuinely constrained devices use procedural silhouettes first. */
  lowPower?: boolean;
};

/** A staged, low-draw-call pond landscape that remains readable in the sandbox. */
export function PondEnvironment({
  onImportedAssetsReady,
  lowPower = false,
}: PondEnvironmentProps) {
  const { terrain, grassGeometry, grassMaterial } = useMemo(() => {
    const terrain = createTerrainTexture();
    return {
      terrain,
      grassGeometry: createIrregularGroundRing(),
      grassMaterial: new THREE.MeshStandardMaterial({
        map: terrain,
        color: "#6e894d",
        roughness: 0.96,
      }),
    };
  }, []);

  useEffect(
    () => () => {
      terrain.dispose();
      grassGeometry.dispose();
      grassMaterial.dispose();
    },
    [grassGeometry, grassMaterial, terrain],
  );

  return (
    <group>
      <mesh
        geometry={grassGeometry}
        material={grassMaterial}
        receiveShadow
      />
      <PondBasin />
      <PondLilyPads />
      <PondBankFoliage />
      {/* The procedural tree line keeps the mobile silhouette lush without
          asking a phone to download + decode the 2.3 MB desktop tree GLB. */}
      {lowPower ? <DenseTreeLine /> : null}
      <PondImportedAssets
        lowPower={lowPower}
        onComplete={onImportedAssetsReady}
      />
      <PondBackdrop />
    </group>
  );
}
