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

    // The constrained tier is fully procedural and static. It retains a soft
    // pool-light cue without loading the desktop normal texture or making a
    // second animated texture pass compete with the water surface.
    #ifdef LOW_POWER_CAUSTICS
      float fieldA = sin(vUv.x * 27.0 + vUv.y * 9.0);
      float fieldB = sin(vUv.y * 23.0 - vUv.x * 11.0 + 1.7);
      float fieldC = cos((vUv.x + vUv.y) * 18.0 - 0.8);
      float caustics = pow(
        clamp((fieldA * fieldB + fieldC) * 0.35 + 0.48, 0.0, 1.0),
        7.0
      );
    #else
      vec2 uv0 = vUv * 5.5 + vec2(uTime * 0.07, uTime * 0.045);
      vec2 n0 = texture2D(uNormalMap, uv0).rg;
      vec2 uv1 = vUv * 7.3 + vec2(-uTime * 0.052, uTime * 0.063);
      vec2 n1 = texture2D(uNormalMap, uv1).bg;
      float ridgeA = 1.0 - abs(n0.x - n1.x) * 3.0;
      float ridgeB = 1.0 - abs(n0.y - n1.y) * 3.0;
      float caustics = pow(clamp(ridgeA * ridgeB, 0.0, 1.0), 5.0);
    #endif

    // Moderate peak so it shimmers, not blinds.
    float brightness = caustics * falloff * uIntensity * 1.4;

    gl_FragColor = vec4(uColor * brightness, brightness);
  }
`;

type CausticsProps = {
  lowPower?: boolean;
};

type CausticLayerProps = {
  lowPower: boolean;
  normalMap: THREE.Texture | null;
};

function CausticLayer({ lowPower, normalMap }: CausticLayerProps) {
  const submerged = useView() !== "home";
  // The mobile shader's normal-map branch is compiled out. Retain a tiny
  // neutral texture for its unused uniform, avoiding a network request and
  // another Suspense dependency during a phone's first paint.
  const neutralTexture = useMemo(() => {
    const texture = new THREE.DataTexture(
      new Uint8Array([128, 128, 255, 255]),
      1,
      1,
      THREE.RGBAFormat,
    );
    texture.colorSpace = THREE.NoColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, []);
  const activeNormalMap = normalMap ?? neutralTexture;

  useEffect(() => {
    if (!normalMap) return;
    normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.colorSpace = THREE.NoColorSpace;
    normalMap.needsUpdate = true;
  }, [normalMap]);

  useEffect(
    () => () => {
      neutralTexture.dispose();
    },
    [neutralTexture],
  );

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
        ...(lowPower ? { defines: { LOW_POWER_CAUSTICS: 1 } } : {}),
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 0 },
          uColor: { value: COLOR },
          uNormalMap: { value: activeNormalMap },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [activeNormalMap, lowPower],
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

    // Keep the mobile version still. A static pool-light cue feels intentional
    // and frees a full-screen shader from continuous texture scrolling.
    if (!lowPower && !reducedMotion) {
      u.uTime.value += delta * SPEED;
    }

    // Keep the transition smooth, but make constrained devices use a dim,
    // stable sheet rather than animating another visual layer alongside the
    // water surface.
    const target = submerged ? (lowPower ? 0.44 : 1) : 0;
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

function DesktopCaustics() {
  const normalMap = useTexture("/textures/waternormals.jpg");
  return <CausticLayer lowPower={false} normalMap={normalMap} />;
}

function MobileCaustics() {
  return <CausticLayer lowPower normalMap={null} />;
}

export function Caustics({ lowPower = false }: CausticsProps) {
  // Keep useTexture inside the desktop-only branch. A coarse-pointer device
  // receives its visual cue immediately instead of blocking the pond behind a
  // normal-map download it never samples.
  return lowPower ? <MobileCaustics /> : <DesktopCaustics />;
}
