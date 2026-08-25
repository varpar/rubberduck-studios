"use client";

/* R3F render-loop code intentionally mutates Three.js meshes and materials. */
/* eslint-disable react-hooks/immutability */

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useView } from "../_state/navigation";

// Underwater light shafts (god rays) descending from the water surface (y ≈ 0)
// into the depths (y ≈ -6). The submerged camera sits low and looks UP, so
// these tall additive planes cross the frame it stares into and make the water
// read as a living, lit volume instead of flat blue. Ambience only — kept slow
// and low-opacity so shafts STACK softly rather than blowing out to white.

const SHAFT_COUNT = 6; // ≤7 for perf
const SHAFT_WIDTH = 0.6;
const SHAFT_HEIGHT = 8;

// A shaft rendered as an elongated plane. Values are seeded once (deterministic,
// no Math.random in render output) so SSR and client agree — no hydration drift.
type Shaft = {
  basePosition: THREE.Vector3;
  baseRotation: THREE.Euler;
  baseOpacity: number;
  // Per-shaft animation seeds so each ray sways/pulses out of phase.
  swayPhase: number;
  swaySpeed: number;
  driftPhase: number;
  driftSpeed: number;
  pulsePhase: number;
  pulseSpeed: number;
};

// Simple deterministic hash → pseudo-random in [0,1). Seeded by shaft index so
// the layout is stable across reloads and between server/client.
function seeded(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// Builds a vertical gradient: bright soft core at the top (near the surface),
// fading to fully transparent at the bottom and feathered at the horizontal
// edges. Additive blending turns the soft core into a glow.
function makeShaftTexture(): THREE.CanvasTexture {
  const w = 64;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Vertical fade: strongest near the top (the surface), gone by the bottom.
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "rgba(255,255,255,0.0)");
  grad.addColorStop(0.12, "rgba(220,240,255,0.9)");
  grad.addColorStop(0.5, "rgba(190,225,255,0.45)");
  grad.addColorStop(1, "rgba(160,205,255,0.0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Horizontal feather: multiply by a soft-edged core so the sides melt away
  // and the shaft has no hard vertical borders.
  const edge = ctx.createLinearGradient(0, 0, w, 0);
  edge.addColorStop(0, "rgba(0,0,0,1)");
  edge.addColorStop(0.5, "rgba(0,0,0,0)");
  edge.addColorStop(1, "rgba(0,0,0,1)");
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

export function GodRays() {
  const submerged = useView() !== "home";

  // Meshes we drive each frame. Kept in a ref so useFrame never allocates.
  const groupRef = useRef<THREE.Group>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);
  // Lerped fade factor: 0 on the hero, 1 underwater.
  const intensityRef = useRef(0);

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  // ONE shared texture across every shaft (perf + single dispose).
  const texture = useMemo(() => makeShaftTexture(), []);

  // ONE shared geometry across every shaft.
  const geometry = useMemo(
    () => new THREE.PlaneGeometry(SHAFT_WIDTH, SHAFT_HEIGHT),
    [],
  );

  // Per-shaft placement + animation seeds, computed once. Shafts descend from
  // just below the surface (top of the plane near y ≈ 0) spread across the
  // volume the upward-looking camera sees.
  const shafts = useMemo<Shaft[]>(() => {
    const out: Shaft[] = [];
    for (let i = 0; i < SHAFT_COUNT; i++) {
      const rx = seeded(i * 3 + 1);
      const rz = seeded(i * 3 + 2);
      const rr = seeded(i * 3 + 3);

      // Spread across the framed volume: x ∈ [-4, 4], z ∈ [-4, 3].
      const x = -4 + rx * 8;
      const z = -4 + rz * 7;
      // Center the tall plane so its top sits near the surface (y ≈ 0) and it
      // trails down to the depths.
      const y = -SHAFT_HEIGHT / 2 + 0.3;

      // A few degrees of tilt so the shafts fan out from the surface instead of
      // hanging perfectly parallel.
      const tiltZ = (rr - 0.5) * 0.35; // ~±10°
      const tiltX = (seeded(i * 3 + 4) - 0.5) * 0.2;

      out.push({
        basePosition: new THREE.Vector3(x, y, z),
        baseRotation: new THREE.Euler(tiltX, 0, tiltZ),
        baseOpacity: 0.08 + rr * 0.06, // ~0.08–0.14 each
        swayPhase: seeded(i * 5 + 11) * Math.PI * 2,
        swaySpeed: 0.15 + seeded(i * 5 + 12) * 0.15,
        driftPhase: seeded(i * 5 + 13) * Math.PI * 2,
        driftSpeed: 0.1 + seeded(i * 5 + 14) * 0.12,
        pulsePhase: seeded(i * 5 + 15) * Math.PI * 2,
        pulseSpeed: 0.25 + seeded(i * 5 + 16) * 0.25,
      });
    }
    return out;
  }, []);

  // One material per shaft (each needs its own opacity), all sharing the single
  // texture and additive blending.
  const materials = useMemo(
    () =>
      shafts.map(
        () =>
          new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            opacity: 0,
            toneMapped: false,
          }),
      ),
    [shafts, texture],
  );

  // Dispose all GPU resources on unmount / hot-reload so nothing leaks.
  useEffect(() => {
    return () => {
      texture.dispose();
      geometry.dispose();
      for (const m of materials) m.dispose();
    };
  }, [texture, geometry, materials]);

  useFrame((state, delta) => {
    // Lerp fade toward the target with a frame-rate-independent factor.
    const target = submerged ? 1 : 0;
    const k = 1 - Math.pow(0.001, delta); // ~smooth ~1s approach
    intensityRef.current += (target - intensityRef.current) * k;
    const intensity = intensityRef.current;

    const t = state.clock.elapsedTime;
    const meshes = meshesRef.current;

    for (let i = 0; i < shafts.length; i++) {
      const s = shafts[i];
      const mesh = meshes[i];
      const mat = materials[i];
      if (!mesh) continue;

      if (reducedMotion) {
        // Static but present: no sway, no drift, no pulse — just fade.
        mat.opacity = s.baseOpacity * intensity;
        continue;
      }

      // Slow rotational sway around Z + a touch on X so shafts shimmer.
      mesh.rotation.z = s.baseRotation.z + Math.sin(t * s.swaySpeed + s.swayPhase) * 0.08;
      mesh.rotation.x = s.baseRotation.x + Math.cos(t * s.swaySpeed * 0.7 + s.swayPhase) * 0.04;

      // Gentle horizontal drift so the shafts slide like moving caustics.
      mesh.position.x = s.basePosition.x + Math.sin(t * s.driftSpeed + s.driftPhase) * 0.25;

      // Subtle opacity pulse (never below ~60% of base) so it breathes, not flickers.
      const pulse = 0.8 + Math.sin(t * s.pulseSpeed + s.pulsePhase) * 0.2;
      mat.opacity = s.baseOpacity * pulse * intensity;
    }
  });

  return (
    <group ref={groupRef} renderOrder={2} visible={submerged}>
      {shafts.map((s, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) meshesRef.current[i] = el;
          }}
          geometry={geometry}
          material={materials[i]}
          position={s.basePosition}
          rotation={s.baseRotation}
        />
      ))}
    </group>
  );
}
