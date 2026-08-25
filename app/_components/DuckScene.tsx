"use client";

import { Environment } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { Caustics } from "./Caustics";
import { DuckExplorerControl } from "./DuckExplorerControl";
import { DuckFamily } from "./DuckFamily";
import { GodRays } from "./GodRays";
import { PondEnvironment } from "./PoolEnvironment";
import { WaterSurface } from "./Water";

function PondHDRI() {
  const lowPower = useMemo(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia("(pointer: coarse)").matches ||
        (navigator.hardwareConcurrency ?? 8) <= 4),
    [],
  );

  // A 1K CC0 HDRI adds believable summer reflections and ambient light on
  // desktops. Its tree canopy is intentionally not used as the literal sky:
  // the bright art-directed sky stays readable behind the type. Coarse-pointer
  // / lower-core devices avoid the PMREM setup cost and keep the fallback.
  if (lowPower) return null;
  return (
    <Environment
      files="/hdr/pond_1k.hdr"
      environmentIntensity={0.72}
    />
  );
}

export default function DuckScene() {
  const lowPower = useMemo(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia("(pointer: coarse)").matches ||
        (navigator.hardwareConcurrency ?? 8) <= 4 ||
        ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ??
          8) <= 4),
    [],
  );

  return (
    <>
      <Canvas
        // Eye-level camera — y ≈ duck eye height (mom's eyes sit at
        // y ≈ 0.17, this puts the lens just at that horizon). The 6.5
        // dolly distance keeps mom at ~40% of viewport. Lookat origin
        // gives a barely-perceptible 1.8° downward tilt so the centered
        // duck reads at frame center rather than the bottom third.
        camera={{ position: [0, 0.62, 6.5], fov: 28 }}
        onCreated={({ camera, gl }) => {
          camera.lookAt(0, -0.02, 0);
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
          gl.shadowMap.type = THREE.PCFShadowMap;
          // Tree root meshes are clipped at the grass level. This renderer
          // switch makes those per-material planes apply equally to the main
          // render and Water.tsx's scene-to-FBO refraction capture.
          gl.localClippingEnabled = true;
        }}
        // Cap DPR lower — a 2× framebuffer on retina is a lot of GPU memory and
        // contributes to context loss. 1.5 is still crisp.
        dpr={lowPower ? 1 : [1, 1.5]}
        // `alpha: false` makes the canvas opaque so the scene background
        // (set below) actually paints. The water shader uses planar
        // reflection — when "above the water" is transparent void, the
        // reflection samples black and the water reads as ominous. Giving
        // the scene a bright sky color fixes both the look behind/above
        // the water AND what the surface reflects.
        gl={{ antialias: true, alpha: false }}
        shadows={!lowPower}
      >
        <>
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
          {/* The normal map, refraction target, and GLB all suspend while loading. */}
          <Suspense fallback={null}>
            <PondHDRI />
            <PondEnvironment />
            <WaterSurface />
            <Caustics />
            <GodRays />
            <DuckFamily />
          </Suspense>
        </>
      </Canvas>
      <DuckExplorerControl />
    </>
  );
}
