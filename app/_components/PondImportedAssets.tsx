"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  Suspense,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";

type PondAssetProps = {
  src: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale: number | [number, number, number];
  modelOffset?: [number, number, number];
  castShadow?: boolean;
};

type AssetEntranceProps = {
  children: ReactNode;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  dropDistance: number;
  delay?: number;
};

const OLD_TREE = "/models/pond/old-tree.glb";
const MOSSY_LOG = "/models/pond/mossy-log.glb";
const MOSSY_LOG_LOD = "/models/pond/mossy-log-lod.glb";
const CATTAIL = "/models/pond/cattail-plant.glb";
const PARK_BENCH = "/models/pond/park-bench.glb";
const WATER_LILY = "/models/pond/bright-water-lily.glb";
const RIVER_ROCK = "/models/pond/river-rock/scene.gltf";
// The tree's source origin is higher than the flare of its exposed roots. At
// the display scales below this pushes the root mass 38–44 cm beneath the
// `BANK_LEVEL` ground plane, so it reads as a planted tree rather than an
// object placed on top of the lawn.
const PLANTED_TREE_ROOT_OFFSET: [number, number, number] = [0, -1.05, 0];
// The grass bank itself is a thin surface at y = 0.027. Trees can safely have
// roots beneath that surface, but those buried triangles must not be visible
// through transparent water from a duck-height camera. This world-space plane
// removes only the portion below the lawn; it does not add a visible retaining
// wall or otherwise change the pond's shoreline silhouette.
const TREE_GROUND_CLIP_PLANE = new THREE.Plane(
  new THREE.Vector3(0, 1, 0),
  -0.027,
);
const cattailMaterialCache = new WeakMap<
  THREE.Material,
  THREE.MeshStandardMaterial
>();
const groundClippedTreeMaterialCache = new WeakMap<
  THREE.Material,
  THREE.Material
>();

// Do not `preload` every GLB here. This module is imported with the scene, so
// module-level preloads made the browser start roughly 6 MB of models,
// textures, and HDR-adjacent work at the same time as the lead duck. The pond
// now asks for one visual tier at a time below: water + duck first, then the
// mature tree, hero log, bloom, and finally the supporting bank dressing.

type RockPlacement = {
  position: [number, number, number];
  yaw: number;
  scale: [number, number, number];
};

// The source mesh is a single, optimized 1.9k-triangle photogrammetry rock.
// These static transforms vary its silhouette without loading or drawing a
// second model. They sit just beyond the water mask, breaking up the shoreline
// in small, natural clusters instead of reading as a continuous stone border.
const RIVER_ROCK_PLACEMENTS: readonly RockPlacement[] = [
  {
    position: [-9.68, 0.056, -5.31],
    yaw: -0.74,
    scale: [0.104, 0.094, 0.118],
  },
  {
    position: [-8.66, 0.056, -4.78],
    yaw: 0.46,
    scale: [0.071, 0.059, 0.087],
  },
  {
    position: [4.36, 0.056, -7.74],
    yaw: 1.16,
    scale: [0.128, 0.112, 0.101],
  },
  {
    position: [11.55, 0.056, -1.74],
    yaw: -0.38,
    scale: [0.09, 0.075, 0.126],
  },
  {
    position: [9, 0.056, 4.9],
    yaw: 0.82,
    scale: [0.114, 0.098, 0.083],
  },
  {
    position: [-9.44, 0.056, 4.52],
    yaw: -1.12,
    scale: [0.076, 0.064, 0.104],
  },
];

type NormalizedRock = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
};

/**
 * Bakes the source scene's nested export transforms into one local geometry,
 * recentres it horizontally, and aligns its lowest point with y = 0. The
 * resulting geometry is safe to instance at the bank level even though the
 * original Sketchfab scene has an offset root and non-standard axis transform.
 */
function normalizeRiverRock(scene: THREE.Group): NormalizedRock | null {
  scene.updateMatrixWorld(true);

  const sourceMeshes: THREE.Mesh[] = [];
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) sourceMeshes.push(child);
  });
  const sourceMesh = sourceMeshes[0];

  if (!sourceMesh) return null;

  const geometry = sourceMesh.geometry.clone();
  geometry.applyMatrix4(sourceMesh.matrixWorld);
  geometry.computeBoundingBox();

  const bounds = geometry.boundingBox;
  if (!bounds) {
    geometry.dispose();
    return null;
  }

  const centre = bounds.getCenter(new THREE.Vector3());
  geometry.translate(-centre.x, -bounds.min.y, -centre.z);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return {
    geometry,
    material: Array.isArray(sourceMesh.material)
      ? sourceMesh.material[0]
      : sourceMesh.material,
  };
}

function PondRiverRocks() {
  const { scene } = useGLTF(RIVER_ROCK);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const rock = useMemo(() => normalizeRiverRock(scene), [scene]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!rock || !mesh) return;

    // These matrices are written once, then marked static: no per-frame work
    // and one shared geometry/material batch for every visible shore rock.
    const dummy = new THREE.Object3D();
    RIVER_ROCK_PLACEMENTS.forEach((placement, index) => {
      dummy.position.set(...placement.position);
      dummy.rotation.set(0, placement.yaw, 0);
      dummy.scale.set(...placement.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [rock]);

  useEffect(
    () => () => {
      // The geometry was cloned solely to bake the source scene transform. The
      // glTF material and its textures remain loader-cached and shared.
      rock?.geometry.dispose();
    },
    [rock],
  );

  if (!rock) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[rock.geometry, rock.material, RIVER_ROCK_PLACEMENTS.length]}
      castShadow
      receiveShadow
      frustumCulled
      dispose={null}
    />
  );
}

function makeMatteCattailMaterial(source: THREE.Material) {
  const cached = cattailMaterialCache.get(source);
  if (cached) return cached;

  // The source was authored with legacy spec/gloss values that are converted
  // to a very high-IOR physical material. It turns the leaf cluster pale in
  // our HDRI. A shared matte Standard material gives the plants their proper
  // marsh-green silhouette while retaining their texture and alpha details.
  const physical = source as THREE.MeshStandardMaterial;
  const top = source.name.includes("top");
  const material = new THREE.MeshStandardMaterial({
    name: source.name,
    color: top ? "#694733" : "#6c9855",
    map: physical.map,
    normalMap: physical.normalMap,
    alphaMap: physical.alphaMap,
    roughnessMap: physical.roughnessMap,
    roughness: top ? 0.72 : 0.88,
    metalness: 0,
    transparent: physical.transparent,
    opacity: physical.opacity,
    alphaTest: physical.alphaTest,
    side: physical.side,
    depthWrite: physical.depthWrite,
    depthTest: physical.depthTest,
  });
  if (physical.normalScale) material.normalScale.copy(physical.normalScale);
  material.envMapIntensity = 0;
  cattailMaterialCache.set(source, material);
  return material;
}

function makeGroundClippedTreeMaterial(source: THREE.Material) {
  const cached = groundClippedTreeMaterialCache.get(source);
  if (cached) return cached;

  // Keep one derived material per source material, rather than cloning one for
  // every tree instance. The GLTF geometry, textures, and this clipped material
  // therefore remain shared across the scene and the water-refraction capture.
  const material = source.clone();
  material.clippingPlanes = [TREE_GROUND_CLIP_PLANE];
  material.clipShadows = true;
  material.needsUpdate = true;
  groundClippedTreeMaterialCache.set(source, material);
  return material;
}

function arrivalSeed(position: [number, number, number]) {
  const value = Math.sin(position[0] * 12.9898 + position[2] * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * New props never appear at their final transform. They take a small,
 * deterministic gravity drop and settle once, so the staged loader feels
 * like the pond is assembling rather than revealing a succession of pop-ins.
 */
function AssetEntrance({
  children,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  dropDistance,
  delay = 0,
}: AssetEntranceProps) {
  const groupRef = useRef<THREE.Group>(null);
  const startedAtRef = useRef<number | null>(null);
  const settledRef = useRef(false);
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const targetScale = useMemo<[number, number, number]>(
    () => (Array.isArray(scale) ? scale : [scale, scale, scale]),
    [scale],
  );
  const initialScale = useMemo<[number, number, number]>(
    () =>
      reducedMotion
        ? targetScale
        : [targetScale[0] * 0.91, targetScale[1] * 0.91, targetScale[2] * 0.91],
    [reducedMotion, targetScale],
  );
  const initialPosition = useMemo<[number, number, number]>(
    () =>
      reducedMotion
        ? position
        : [position[0], position[1] + dropDistance, position[2]],
    [dropDistance, position, reducedMotion],
  );

  useFrame((state) => {
    const group = groupRef.current;
    if (!group || reducedMotion || settledRef.current) return;

    const startedAt = startedAtRef.current ?? state.clock.elapsedTime;
    startedAtRef.current = startedAt;
    const elapsed = Math.max(0, state.clock.elapsedTime - startedAt - delay);
    const progress = Math.min(1, elapsed / 0.78);

    // A lightly underdamped settling curve: one small, soft landing bounce,
    // never a cartoon spring or a per-frame React update.
    const settled =
      progress >= 1
        ? 1
        : 1 -
          Math.exp(-6.2 * progress) *
            (Math.cos(13.5 * progress) + 0.28 * Math.sin(13.5 * progress));
    const scaleFactor = 0.91 + settled * 0.09;

    group.position.set(
      position[0],
      position[1] + (1 - settled) * dropDistance,
      position[2],
    );
    group.scale.set(
      targetScale[0] * scaleFactor,
      targetScale[1] * scaleFactor,
      targetScale[2] * scaleFactor,
    );
    if (progress >= 1) settledRef.current = true;
  });

  return (
    <group
      ref={groupRef}
      position={initialPosition}
      rotation={rotation}
      scale={initialScale}
    >
      {children}
    </group>
  );
}

function PondAsset({
  src,
  position,
  rotation = [0, 0, 0],
  scale,
  modelOffset = [0, 0, 0],
  castShadow = false,
}: PondAssetProps) {
  const { scene } = useGLTF(src);
  const instance = useMemo(() => {
    // `clone(true)` creates a distinct graph for transform/culling while
    // retaining the cached source geometry and materials between duplicates.
    // That is important because the water capture renders this scenery twice.
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = castShadow;
      child.receiveShadow = true;
      child.frustumCulled = true;
      if (src === OLD_TREE) {
        child.material = Array.isArray(child.material)
          ? child.material.map(makeGroundClippedTreeMaterial)
          : makeGroundClippedTreeMaterial(child.material);
      } else if (src === CATTAIL) {
        child.material = Array.isArray(child.material)
          ? child.material.map(makeMatteCattailMaterial)
          : makeMatteCattailMaterial(child.material);
      }
    });
    return clone;
  }, [castShadow, scene, src]);

  const seed = arrivalSeed(position);
  const dropDistance =
    src === OLD_TREE
      ? 0.92
      : src === WATER_LILY
        ? 0.24
        : src === CATTAIL
          ? 0.34
          : src === PARK_BENCH
            ? 0.48
            : 0.58;

  return (
    <AssetEntrance
      position={position}
      rotation={rotation}
      scale={scale}
      dropDistance={dropDistance}
      delay={seed * 0.18}
    >
      <primitive object={instance} position={modelOffset} dispose={null} />
    </AssetEntrance>
  );
}

function PondTrees() {
  return (
    <group>
      {/* Three mature trees make a loose, deliberately uneven backdrop. Their
          open centre keeps the pond readable from the sandbox camera. */}
      <PondAsset
        src={OLD_TREE}
        position={[-5.25, 0.63, -10.7]}
        rotation={[0, 0.34, 0]}
        scale={0.42}
        modelOffset={PLANTED_TREE_ROOT_OFFSET}
        castShadow
      />
      <PondAsset
        src={OLD_TREE}
        position={[-10.85, 0.54, -5.65]}
        rotation={[0, -0.42, 0]}
        scale={0.36}
        modelOffset={PLANTED_TREE_ROOT_OFFSET}
        castShadow
      />
      <PondAsset
        src={OLD_TREE}
        position={[9.25, 0.57, -9.3]}
        rotation={[0, 0.72, 0]}
        scale={0.38}
        modelOffset={PLANTED_TREE_ROOT_OFFSET}
        castShadow
      />
    </group>
  );
}

function HeroLog() {
  return (
    <group>

      {/* The detailed hero log is enlarged so its bark can read at close range.
          The offset preserves the bank contact point as its scale changes. */}
      <PondAsset
        src={MOSSY_LOG}
        position={[1.53, 0.084, -8.05]}
        rotation={[0, -0.38, 0]}
        scale={1.65}
        modelOffset={[-0.245, -0.053, -1.884]}
        castShadow
      />
    </group>
  );
}

function SupportingLogs() {
  return (
    <group>
      {/* Larger 2.2k-triangle log LODs extend the bank without spending hero
          detail in every water reflection capture. */}
      <PondAsset
        src={MOSSY_LOG_LOD}
        position={[-8.15, 0.078, 4.16]}
        rotation={[0, 0.28, 0]}
        scale={1.85}
        modelOffset={[-0.245, -0.053, -1.884]}
      />
      <PondAsset
        src={MOSSY_LOG_LOD}
        position={[7.91, 0.079, -7.52]}
        rotation={[0, -0.38, 0]}
        scale={1.7}
        modelOffset={[-0.245, -0.053, -1.884]}
      />
      {/* A half-sunk log sits just below the -0.1 waterline. It is deliberately
          unshadowed: the water material receives it again in its reflection
          pass, while its angled placement makes it feel caught in the shallows. */}
      <PondAsset
        src={MOSSY_LOG_LOD}
        position={[5.9, -0.12, -4]}
        rotation={[0, 1.05, 0]}
        scale={1.5}
        modelOffset={[-0.245, -0.053, -1.884]}
      />
    </group>
  );
}

function CattailClumps() {
  return (
    <group>
      {/* The repeated asset is cached, but the small rotations/scales prevent
          the bank from reading like a copied prop strip. */}
      <PondAsset
        src={CATTAIL}
        position={[-8.62, -0.1, -4.96]}
        rotation={[0, -0.35, 0]}
        scale={1.16}
      />
      <PondAsset
        src={CATTAIL}
        position={[-7.88, -0.1, -5.22]}
        rotation={[0, 0.42, 0]}
        scale={0.88}
      />
      <PondAsset
        src={CATTAIL}
        position={[-1.55, -0.1, -7.61]}
        rotation={[0, 0.65, 0]}
        scale={1.28}
      />
      <PondAsset
        src={CATTAIL}
        position={[5.45, -0.1, -6.54]}
        rotation={[0, -0.52, 0]}
        scale={1.08}
      />
      <PondAsset
        src={CATTAIL}
        position={[-10.34, -0.1, 3.02]}
        rotation={[0, 0.94, 0]}
        scale={1.36}
      />
    </group>
  );
}

function SupportingBankAssets() {
  return (
    <group>
      <AssetEntrance dropDistance={0.26} delay={0.08}>
        <PondRiverRocks />
      </AssetEntrance>
      <CattailClumps />

      <PondAsset
        src={PARK_BENCH}
        position={[3.9, 0.063, -8.75]}
        rotation={[0, -0.12, 0]}
        scale={0.008}
        castShadow
      />
      <PondAsset
        src={PARK_BENCH}
        position={[-6.7, 0.063, -9.45]}
        rotation={[0, 0.18, 0]}
        scale={0.0072}
        castShadow
      />
      <PondAsset
        src={PARK_BENCH}
        position={[10.9, 0.063, 4.25]}
        rotation={[0, -1.84, 0]}
        scale={0.0075}
        castShadow
      />
    </group>
  );
}

function WaterLily() {
  return (
    <group>
      {/* One oversized, near-camera bloom is the fever-dream accent. Its native
          pad grounds it in the water without reintroducing a second flora style. */}
      <PondAsset
        src={WATER_LILY}
        position={[4.1, 0.331, 1.8]}
        rotation={[0, -0.74, 0]}
        scale={10.2}
      />
    </group>
  );
}

type AssetStageProps = {
  src: string;
  onReady: () => void;
  children: ReactNode;
};

/**
 * A one-resource Suspense gate. Descendants mount only after this source has
 * settled, so tiered scenery cannot turn into a single competing request wave.
 */
function AssetStage({ src, onReady, children }: AssetStageProps) {
  const { scene } = useGLTF(src);

  useEffect(() => {
    onReady();
  }, [onReady, scene]);

  return <>{children}</>;
}

type PondImportedAssetsProps = {
  onComplete?: () => void;
  /**
   * Keep genuinely constrained devices readable without downloading desktop-
   * only hero art. Current phones still receive the complete visual world in
   * the calm staged sequence below.
   */
  lowPower?: boolean;
};

/**
 * Procedural water, shore, and the lead duck render first. Decorative GLBs
 * then arrive as an intentional sequence: tree → hero log → bloom → supporting
 * logs → remaining small shoreline props. Desktop retains the complete scene;
 * first-time visitors avoid a 6 MB asset/parse surge at first paint, while
 * constrained devices use the compact tier below.
 */
export function PondImportedAssets({
  lowPower = false,
  onComplete,
}: PondImportedAssetsProps) {
  const [stage, setStage] = useState(0);
  const completeOnceRef = useRef(false);

  useEffect(() => {
    // PondImportedAssets itself only mounts after the HDRI's Suspense gate.
    // Starting this first GLB right on mount is therefore already strictly
    // ordered after duck → water → HDRI, without introducing a visible gap.
    // The next task lets React finish committing the resolved HDR environment
    // before it begins parsing the first decorative model.
    const start = window.setTimeout(() => setStage(1), 0);
    return () => window.clearTimeout(start);
  }, []);

  const advanceTo = useCallback((nextStage: number) => {
    setStage((currentStage) => Math.max(currentStage, nextStage));
  }, []);

  const complete = useCallback(() => {
    if (completeOnceRef.current) return;
    completeOnceRef.current = true;
    onComplete?.();
  }, [onComplete]);

  if (lowPower) {
    return (
      <group>
        {stage >= 1 ? (
          <Suspense fallback={null}>
            <AssetStage src={MOSSY_LOG_LOD} onReady={() => advanceTo(2)}>
              <SupportingLogs />
            </AssetStage>
          </Suspense>
        ) : null}
        {stage >= 2 ? (
          <Suspense fallback={null}>
            <AssetStage src={CATTAIL} onReady={complete}>
              <CattailClumps />
            </AssetStage>
          </Suspense>
        ) : null}
      </group>
    );
  }

  return (
    <group>
      {stage >= 1 ? (
        <Suspense fallback={null}>
          <AssetStage src={OLD_TREE} onReady={() => advanceTo(2)}>
            <PondTrees />
          </AssetStage>
        </Suspense>
      ) : null}
      {stage >= 2 ? (
        <Suspense fallback={null}>
          <AssetStage src={MOSSY_LOG} onReady={() => advanceTo(3)}>
            <HeroLog />
          </AssetStage>
        </Suspense>
      ) : null}
      {stage >= 3 ? (
        <Suspense fallback={null}>
          <AssetStage src={WATER_LILY} onReady={() => advanceTo(4)}>
            <WaterLily />
          </AssetStage>
        </Suspense>
      ) : null}
      {stage >= 4 ? (
        <Suspense fallback={null}>
          <AssetStage src={MOSSY_LOG_LOD} onReady={() => advanceTo(5)}>
            <SupportingLogs />
          </AssetStage>
        </Suspense>
      ) : null}
      {stage >= 5 ? (
        <Suspense fallback={null}>
          <AssetStage src={CATTAIL} onReady={complete}>
            <SupportingBankAssets />
          </AssetStage>
        </Suspense>
      ) : null}
    </group>
  );
}
