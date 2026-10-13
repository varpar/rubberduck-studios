"use client";

import { Environment, useEnvironment, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Caustics } from "./Caustics";
import { DuckFamily } from "./DuckFamily";
import { GodRays } from "./GodRays";
import { PondEnvironment } from "./PoolEnvironment";
import { WaterSurface } from "./Water";
import { SceneClock, useDocumentVisible } from "./sceneActivity";

function DuckStage({ onReady }: { onReady: () => void }) {
  // Duck.tsx owns the presentation of the shared model. This gate is mounted
  // only after the water and HDR environment have settled, so its first frame
  // is already lit and seated in the finished surface.
  const { scene } = useGLTF("/models/duck.glb");

  useEffect(() => {
    onReady();
  }, [onReady, scene]);

  return <DuckFamily />;
}

function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);

  return null;
}

/**
 * A Suspense boundary around this component makes the HDRI a genuine gate.
 * The deliberate first-load order is water → HDRI → duck → scenery.
 */
function HDRIStage({
  enabled,
  onReady,
}: {
  enabled: boolean;
  onReady: () => void;
}) {
  if (!enabled) return <ReadySignal onReady={onReady} />;

  return <LoadedHDRI onReady={onReady} />;
}

function LoadedHDRI({ onReady }: { onReady: () => void }) {
  const map = useEnvironment({ files: "/hdr/pond_1k.hdr" });

  useEffect(() => {
    onReady();
  }, [map, onReady]);

  return (
    <>
      <Environment map={map} environmentIntensity={0.72} />
    </>
  );
}

export default function DuckScene() {
  const documentVisible = useDocumentVisible();
  const [duckReady, setDuckReady] = useState(false);
  const [waterReady, setWaterReady] = useState(false);
  const [hdrReady, setHdrReady] = useState(false);
  const lowPower = useMemo(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia("(pointer: coarse)").matches ||
        (navigator.hardwareConcurrency ?? 8) <= 4 ||
        ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ??
          8) <= 4),
    [],
  );
  const compactAssets = useMemo(() => {
    if (typeof window === "undefined") return false;
    const nav = navigator as Navigator & { deviceMemory?: number };
    // Touch input alone should not permanently downgrade a current iPhone or
    // Android flagship to the placeholder tree line. Those phones keep the
    // same staged, authored scenery as desktop; only genuinely constrained
    // devices stay on the compact asset tier.
    return (
      (navigator.hardwareConcurrency ?? 8) <= 4 ||
      (nav.deviceMemory ?? 8) <= 4
    );
  }, []);
  useEffect(() => {
    // Fetch the three essential assets together, while retaining their
    // ordered visual reveal. Previously every request waited for the prior
    // stage to mount, adding a network round trip before the duck could load.
    useGLTF.preload("/models/duck.glb");
    if (!compactAssets) useEnvironment.preload({ files: "/hdr/pond_1k.hdr" });
  }, [compactAssets]);
  const markDuckReady = useCallback(() => {
    setDuckReady(true);
  }, []);
  const markWaterReady = useCallback(() => {
    setWaterReady(true);
  }, []);
  const markHdrReady = useCallback(() => {
    setHdrReady(true);
  }, []);
  // Portrait touch screens use a quiet diorama view instead of trying to crop
  // the desktop eye-level composition into a tall frame. It lets visitors
  // immediately read the pond, its shoreline and the ducks as one world.
  const homeCamera = lowPower
    ? { position: [-0.8, 4.6, 15.2] as [number, number, number], fov: 42 }
    : { position: [-1.3, 0.62, 6.5] as [number, number, number], fov: 28 };

  return (
    <>
      <Canvas
        frameloop={documentVisible ? "always" : "never"}
        role="img"
        aria-label="A sunlit pond with Rubberduck's family of ducks."
        // Eye-level camera — y ≈ duck eye height (mom's eyes sit at
        // y ≈ 0.17, this puts the lens just at that horizon). The 6.5
        // dolly distance keeps mom at ~40% of viewport. Lookat origin
        // gives a barely-perceptible 1.8° downward tilt so the centered
        // duck reads at frame center rather than the bottom third.
        camera={homeCamera}
        onCreated={({ camera, gl }) => {
          camera.lookAt(-0.8, lowPower ? -0.35 : -0.02, lowPower ? -0.9 : 0);
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
          gl.shadowMap.type = THREE.PCFShadowMap;
          // Tree root meshes are clipped at the grass level. This renderer
          // switch makes those per-material planes apply equally to the main
          // render and Water.tsx's scene-to-FBO refraction capture.
          gl.localClippingEnabled = true;
        }}
        // The phone path caps sharpness below native 3x rather than rendering
        // a full Retina framebuffer. It can afford 2x on modern devices
        // because it has already removed the expensive FBO, normal-map
        // sampling, shadows, HDRI and god rays; constrained devices stay 1.5x.
        dpr={compactAssets ? [1, 1.5] : [1, 2]}
        // `alpha: false` makes the canvas opaque so the scene background
        // (set below) actually paints. The water shader uses planar
        // reflection — when "above the water" is transparent void, the
        // reflection samples black and the water reads as ominous. Giving
        // the scene a bright sky color fixes both the look behind/above
        // the water AND what the surface reflects.
        // MSAA has a disproportionate memory and resolve cost on phones. At
        // 1× DPR the pond's deliberately soft material language still reads
        // cleanly without it, and keeping that work out of every frame leaves
        // room for direct touch interactions.
        gl={{ antialias: !lowPower, alpha: false }}
        // R3F's boolean `true` selects Three's deprecated soft-shadow mode.
        // The percentage mode is the same restrained quality we configure in
        // `onCreated`, without a console warning on current Three releases.
        shadows={lowPower ? false : "percentage"}
      >
        <>
          <SceneClock />
          <color attach="background" args={["#9edbed"]} />
          {/* Keep the fill restrained so the bank, foliage, and ducks gain shape
              from the sun rather than collapsing into one evenly-lit layer. */}
          <hemisphereLight args={["#dff6ff", "#345736", 0.56]} />
          <ambientLight intensity={0.14} />
          <directionalLight
            position={[7, 12, 7]}
            intensity={2}
            castShadow={!lowPower}
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-near={0.5}
            shadow-camera-far={38}
            shadow-camera-left={-15}
            shadow-camera-right={15}
            shadow-camera-top={12}
            shadow-camera-bottom={-10}
            shadow-bias={-0.0002}
            shadow-normalBias={0.015}
          />
          <directionalLight position={[-4, 2, 3]} intensity={0.24} />
          <directionalLight
            position={[0, -2, 4]}
            intensity={0.1}
            color="#a9dded"
          />
          {/* Water establishes the visual context before the duck is allowed
              to appear. That prevents a visible lighting or waterline shift
              beneath an already-rendered duck. */}
          <Suspense fallback={null}>
            <WaterSurface onReady={markWaterReady} />
            {/* Phones keep one static, low-cost caustic sheet for underwater
                depth. The additive shaft stack is desktop-only: six
                transparent planes are visually nice but expensive on small
                mobile GPUs and compete with the water capture. */}
            <Caustics lowPower={lowPower} />
          </Suspense>
          {/* The 1.8 MB HDR follows the water and finishes the lighting before
              a duck or any decorative model asks to render. */}
          {waterReady ? (
            <Suspense fallback={null}>
              <HDRIStage enabled={!compactAssets} onReady={markHdrReady} />
            </Suspense>
          ) : null}
          {hdrReady ? (
            <Suspense fallback={null}>
              <DuckStage onReady={markDuckReady} />
            </Suspense>
          ) : null}
          {duckReady ? (
            <>
              {!lowPower ? <GodRays /> : null}
              <PondEnvironment lowPower={compactAssets} />
            </>
          ) : null}
        </>
      </Canvas>
    </>
  );
}
