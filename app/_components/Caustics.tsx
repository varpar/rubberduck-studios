"use client";

/* R3F render-loop code intentionally mutates Three.js textures and uniforms. */
/* eslint-disable react-hooks/immutability */

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useView } from "../_state/navigation";

// Animated underwater caustics — the shimmering rippled light pattern cast on/
// through a water surface, seen from below. The submerged camera sits low and
// looks UP, so this large horizontal plane sits right under the water surface
// and the crawling bright filaments read as sunlight refracting overhead. This
// is the key "real water" cue; on the hero (view === "home") it fades to zero.

// The water surface plane lives at y = WATER_REST_Y (-0.1). Sit a hair below it
// so the additive filaments don't z-fight the existing water plane.
const CAUSTICS_Y = -0.12;
const PLANE_SIZE = 40;

// How fast the caustics crawl. The shader's noise field is advanced by uTime;
// this multiplies delta so the pattern visibly shimmers rather than freezing.
const SPEED = 0.16;

const COLOR = new THREE.Color("#bfeaff");

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Cheap texture-driven caustics. Two moving samples from the shared water
// normal map are crossed into narrow ridges. This preserves the refracted-light
// cue while avoiding the multi-octave procedural field that was expensive on
// low-power fragment shaders.
const FRAGMENT = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;
  uniform float uIntensity;
  uniform vec3  uColor;
  uniform sampler2D uNormalMap;

  void main() {
    // Radial falloff so the sheet melts to nothing at the plane edges instead
    // of ending on a hard square border in the periphery of the up-look.
    vec2 c = vUv - 0.5;
    float falloff = smoothstep(0.6, 0.15, length(c));

    vec2 uv0 = vUv * 5.5 + vec2(uTime * 0.07, uTime * 0.045);
    vec2 uv1 = vUv * 7.3 + vec2(-uTime * 0.052, uTime * 0.063);
    vec2 n0 = texture2D(uNormalMap, uv0).rg;
    vec2 n1 = texture2D(uNormalMap, uv1).bg;
    float ridgeA = 1.0 - abs(n0.x - n1.x) * 3.0;
    float ridgeB = 1.0 - abs(n0.y - n1.y) * 3.0;
    float caustics = pow(clamp(ridgeA * ridgeB, 0.0, 1.0), 5.0);

    // Moderate peak so it shimmers, not blinds.
    float brightness = caustics * falloff * uIntensity * 1.4;

    gl_FragColor = vec4(uColor * brightness, brightness);
  }
`;

export function Caustics() {
  const submerged = useView() !== "home";
  const normalMap = useTexture("/textures/waternormals.jpg");

  useEffect(() => {
    normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.colorSpace = THREE.NoColorSpace;
    normalMap.needsUpdate = true;
  }, [normalMap]);

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  // ONE plane geometry, laid flat.
  const geometry = useMemo(
    () => new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE),
    [],
  );

  // ONE shader material. Additive + transparent + no depth write so the bright
  // filaments add as light streaks over whatever's behind, double-sided so the
  // upward-looking camera sees the underside.
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 0 },
          uColor: { value: COLOR },
          uNormalMap: { value: normalMap },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [normalMap],
  );

  // Dispose GPU resources on unmount / hot-reload so nothing leaks.
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    const u = material.uniforms;

    // Crawl the noise field. Hold still under reduced-motion (fade only).
    if (!reducedMotion) {
      u.uTime.value += delta * SPEED;
    }

    // Frame-rate-independent lerp toward 1 underwater / 0 on the hero.
    const target = submerged ? 1 : 0;
    const k = 1 - Math.pow(0.001, delta); // ~1s smooth approach
    u.uIntensity.value += (target - u.uIntensity.value) * k;
  });

  return (
    <mesh
      visible={submerged}
      geometry={geometry}
      material={material}
      position={[0, CAUSTICS_Y, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={1}
    />
  );
}
