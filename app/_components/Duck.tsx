"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import * as THREE from "three";
import { waterLevel } from "../_state/waterLevel";
import {
  WAKE_IMPULSES_PER_DUCK,
  waterInteractors,
  waterWakeImpulses,
} from "../_state/waterInteraction";
import { useView } from "../_state/navigation";

// Keep the paddle rhythm visibly alive without turning the pond into a busy
// animation. The travel controller supplies the actual glide; this is only a
// small, local stroke layered on top of it.
const STROKE_HZ = 1.35;
const STROKE_FORWARD_AMP_WORLD = 0.024;
const STROKE_PITCH_AMP = 0.032; // radians, ~2° forward tilt during thrust
const MOTION_FILTER_RESPONSE = 11;
const FACING_TURN_RESPONSE = 5.2;
const HEADING_SPEED_EPSILON = 0.06;
const TAP_BOUNCE_SECONDS = 0.56;
const TAP_BOUNCE_HEIGHT_LOCAL = 0.085;

// The Sketchfab GLB has nested transforms — `Sketchfab_model` and
// `GLTF_SceneRootNode` cancel to identity, but the body mesh node
// (`Cube.001_0`) carries a non-axis-aligned rotation matrix that maps the
// modeled "forward" to world ≈ (0.87, -0.24, 0.43). Solving R_y(α) · that
// = +Z gives α ≈ -1.114 rad; -π/3 (-1.047) is within ~4° of ideal which is
// well within the small idle yaw waddle (±2°) and visually face-on. If you
// swap the GLB, re-tune this empirically by trying a few values.
const MODEL_BASE_ROTATION_Y = -Math.PI / 3;

// Must stay in sync with WATER_Y in Water.tsx.
const WATER_Y_WORLD = -0.1;
// Fraction of the duck's height that should sit below the water surface at
// rest. A real rubber duck's waterline sits around its lower belly — a
// bit under a third of the body dips in. At 0.12 the duck rode almost
// entirely above the surface and read as "hovering over a mirror"; ~0.30
// pulls the waterline up onto the belly so it looks genuinely IN the
// water. Lower = duck rides higher. This is the default (mom); ducklings
// pass a smaller value so the little ones ride noticeably higher on the
// surface instead of looking half-drowned.
const TARGET_SUBMERGED_FRACTION = 0.38;

export type DuckHandle = {
  // The outer "travel" group — what GSAP timelines mutate during swim sequences.
  readonly group: THREE.Group;
  // The visual heading is retained as a duck slows down, which gives the
  // first-person camera a stable direction to follow rather than snapping
  // back to the model's default orientation at rest.
  readonly heading: number;
  readonly scale: number;
  // A lightweight local visual reaction used for direct pointer hits and the
  // four-duck proximity check in DuckFamily. It deliberately does not affect
  // the travel group, movement controller, or water interaction data.
  bounce: () => void;
};

type DuckProps = {
  basePosition: [number, number, number];
  scale?: number;
  bobPhase?: number;
  bobAmplitude?: number;
  bobFrequency?: number;
  // Roll (z) + yaw (y) amplitudes for the per-frame body sway (radians).
  swayAmplitude?: number;
  yawAmplitude?: number;
  // When true, the model dissolves (material opacity → 0) so the family can
  // "blur out" of the water once a page has fully loaded and the little
  // rotating duck takes over up in the navbar.
  hidden?: boolean;
  // Fraction of the duck's height that rests below the waterline. Defaults
  // to the mom value; ducklings override it lower so they sit higher.
  submergedFraction?: number;
  // Slot in the shared water interaction uniforms (mom + three ducklings).
  rippleIndex?: number;
  rippleRadius?: number;
};

// One reusable Duck for mom + ducklings. Sizing comes from `scale`.
//
// Structure (outer → inner):
//   <group travelRef>     ← GSAP / keyboard physics write x/z position
//     <group bobRef>      ← per-frame water bob + restrained body waddle
//       <group facingRef> ← persistent heading; turns gently only while moving
//         <group strokeRef> ← local paddle surge / pitch, aligned to heading
//           <group model-base> ← fixes the source GLB's native forward axis
//             <DuckModel>     ← cloned GLB, auto-fit to the old placeholder
//                                sphere's 1.0 unit height
export const Duck = forwardRef<DuckHandle, DuckProps>(function Duck(
  {
    basePosition,
    scale = 1,
    bobPhase = 0,
    bobAmplitude = 0.08,
    bobFrequency = 1.6,
    swayAmplitude = 0.05,
    yawAmplitude = 0.035,
    hidden = false,
    submergedFraction = TARGET_SUBMERGED_FRACTION,
    rippleIndex = 0,
    rippleRadius = 0.4,
  },
  ref,
) {
  const travelRef = useRef<THREE.Group>(null);
  const bobRef = useRef<THREE.Group>(null);
  const tapBounceRef = useRef<THREE.Group>(null);
  const facingRef = useRef<THREE.Group>(null);
  const strokeRef = useRef<THREE.Group>(null);
  const frameTimeRef = useRef(0);
  const tappedAtRef = useRef(-Infinity);
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  // Track position imperatively so the duck can use the same heading / wake
  // behavior for keyboard coasting and the authored GSAP family swims.
  const prevXRef = useRef(basePosition[0]);
  const prevZRef = useRef(basePosition[2]);
  const velocityRef = useRef({ x: 0, z: 0 });
  // Heading is deliberately independent from current speed. When a duck
  // finishes gliding left, it remains facing left instead of springing back to
  // its default +Z pose as soon as its velocity reaches zero.
  const headingRef = useRef(0);
  const triggerBounce = useCallback(() => {
    tappedAtRef.current = frameTimeRef.current;
  }, []);

  useImperativeHandle(ref, () => ({
    get group() {
      return travelRef.current as THREE.Group;
    },
    get heading() {
      return facingRef.current?.rotation.y ?? headingRef.current;
    },
    get scale() {
      return scale;
    },
    bounce() {
      triggerBounce();
    },
  }));

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    frameTimeRef.current = t;
    const phase = bobPhase;
    const omega = bobFrequency;

    // Derive a planar velocity from the outer travel group. This covers both
    // piloted movement and GSAP choreography while keeping the frame loop
    // fully imperative (no React state churn). Timeline teleports are ignored
    // so they cannot create a giant wake or whip the model around.
    const travel = travelRef.current;
    const facing = facingRef.current;
    const stroke = strokeRef.current;
    let isMoving = false;
    let speed = 0;
    if (travel) {
      // The camera can go under the surface, but the ducks stay buoyant. Their
      // model-specific `submergedFraction` supplies the visible waterline;
      // this group only tracks the shared surface height.
      travel.position.y = waterLevel.y - WATER_Y_WORLD;
      const dx = travel.position.x - prevXRef.current;
      const dz = travel.position.z - prevZRef.current;
      prevXRef.current = travel.position.x;
      prevZRef.current = travel.position.z;
      const dt = Math.max(delta, 1 / 240);
      const validStep = Math.abs(dx) < 0.5 && Math.abs(dz) < 0.5;
      const velocity = velocityRef.current;
      if (validStep) {
        const rawX = dx / dt;
        const rawZ = dz / dt;
        const motionBlend = 1 - Math.exp(-MOTION_FILTER_RESPONSE * dt);
        velocity.x += (rawX - velocity.x) * motionBlend;
        velocity.z += (rawZ - velocity.z) * motionBlend;
      } else {
        velocity.x = 0;
        velocity.z = 0;
      }
      speed = Math.hypot(velocity.x, velocity.z);
      isMoving = speed > HEADING_SPEED_EPSILON;
      if (isMoving) {
        // `atan2(x, z)` describes a world direction relative to the model's
        // corrected +Z forward axis: +X is right, -X is left, and the value is
        // retained once the duck coasts to rest.
        headingRef.current = Math.atan2(velocity.x, velocity.z);
      }

      // Feed the surface shader without causing React renders. Ignore large
      // timeline teleports so they do not create a frame-wide shock wave.
      const interactor = waterInteractors[rippleIndex];
      if (interactor) {
        const vx = validStep ? dx / dt : 0;
        const vz = validStep ? dz / dt : 0;
        const rawSpeed = Math.min(Math.hypot(vx, vz), 4);
        interactor.x = travel.position.x;
        interactor.z = travel.position.z;
        interactor.vx = THREE.MathUtils.lerp(interactor.vx, vx, 0.18);
        interactor.vz = THREE.MathUtils.lerp(interactor.vz, vz, 0.18);
        interactor.speed = THREE.MathUtils.lerp(
          interactor.speed,
          rawSpeed,
          0.16,
        );
        interactor.radius = rippleRadius;
        interactor.active = Math.abs(travel.position.x) < 18 ? 1 : 0;

        // Leave sparse, world-space impulses at the stern while swimming.
        // The surface shader expands and damps these over time, so the water
        // remembers a real path instead of pinning an animated V to the duck.
        if (
          validStep &&
          rawSpeed > 0.18 &&
          t - interactor.lastWakeAt >= 0.24
        ) {
          const invSpeed = 1 / Math.max(rawSpeed, 0.001);
          const impulse =
            waterWakeImpulses[
              rippleIndex * WAKE_IMPULSES_PER_DUCK + interactor.wakeCursor
            ];
          impulse.x = travel.position.x - vx * invSpeed * rippleRadius * 0.42;
          impulse.z = travel.position.z - vz * invSpeed * rippleRadius * 0.42;
          impulse.emittedAt = t;
          impulse.strength =
            rippleRadius * THREE.MathUtils.smoothstep(rawSpeed, 0.18, 1.6);
          interactor.wakeCursor =
            (interactor.wakeCursor + 1) % WAKE_IMPULSES_PER_DUCK;
          interactor.lastWakeAt = t;
        }
      }
    }
    if (facing) {
      // Shortest-path yaw damping stops the common 359° spin when an angle
      // crosses ±π. Crucially the target is the *last motion heading*, not a
      // velocity-scaled offset, so stopping while looking left leaves it left.
      const deltaYaw = Math.atan2(
        Math.sin(headingRef.current - facing.rotation.y),
        Math.cos(headingRef.current - facing.rotation.y),
      );
      facing.rotation.y +=
        deltaYaw * (1 - Math.exp(-FACING_TURN_RESPONSE * Math.min(delta, 0.1)));
    }

    // Body motion on the bob group, layered macro-bezier (outer) + micro-
    // sine (here). Two timescales:
    //   • Slow ambient bob/sway at `omega` — visible at rest.
    //   • Faster per-stroke pulse at STROKE_HZ — only when moving.
    //
    // Phase relationships from procedural-gait writeups: lateral roll
    // (rotation.z) peaks when vertical position is at mid-cycle; pitch
    // leads the x-surge by ~45° so the "thrust" reads as a forward push,
    // not a back-and-forth shimmy.
    const bob = bobRef.current;
    if (bob) {
      if (reducedMotion) {
        // The composition remains available, but no ambient bob, sway, or
        // elastic feedback keeps moving when a visitor asks for stillness.
        bob.position.y = 0;
        bob.rotation.set(0, 0, 0);
        if (stroke) {
          stroke.position.z = 0;
          stroke.rotation.x = 0;
        }
      } else {
        bob.position.y = bobAmplitude * Math.sin(t * omega + phase);
        bob.rotation.z = swayAmplitude * Math.cos(t * omega + phase);
        bob.rotation.y = yawAmplitude * Math.sin(t * omega * 0.5 + phase);

        // The local stroke group is nested inside facingRef, so the very small
        // surge follows the duck's retained heading rather than always sliding
        // along world X. It fades with speed to avoid an idle fidget.
        if (stroke) {
          const strokeOmega = STROKE_HZ * 2 * Math.PI;
          const strokePhase = t * strokeOmega + phase * 1.7;
          const strokeStrength = THREE.MathUtils.smoothstep(
            speed,
            HEADING_SPEED_EPSILON,
            0.7,
          );
          const surgeAmpLocal =
            (STROKE_FORWARD_AMP_WORLD * strokeStrength) / scale;
          stroke.position.z = surgeAmpLocal * Math.sin(strokePhase);
          stroke.rotation.x =
            STROKE_PITCH_AMP *
            strokeStrength *
            Math.sin(strokePhase + Math.PI / 4);
        }
      }
    }

    const tapBounce = tapBounceRef.current;
    if (tapBounce) {
      const elapsed = t - tappedAtRef.current;
      if (!reducedMotion && elapsed >= 0 && elapsed < TAP_BOUNCE_SECONDS) {
        const progress = elapsed / TAP_BOUNCE_SECONDS;
        const arc = Math.sin(progress * Math.PI);
        // A tiny squash-and-stretch makes the hit read as rubber, while the
        // group remains entirely local to this duck. It does not change its
        // travel position, heading, keyboard physics, or water wake.
        tapBounce.position.y = TAP_BOUNCE_HEIGHT_LOCAL * arc;
        tapBounce.rotation.z = Math.sin(progress * Math.PI * 2) * 0.035;
        tapBounce.scale.set(
          1 + arc * 0.026,
          1 - arc * 0.075,
          1 + arc * 0.026,
        );
      } else {
        tapBounce.position.y = 0;
        tapBounce.rotation.z = 0;
        tapBounce.scale.setScalar(1);
      }
    }
  });

  function bounceFromTap(event: ThreeEvent<PointerEvent>) {
    // Stop here so a tap on a duck cannot also select scenery behind it.
    event.stopPropagation();
    triggerBounce();
  }

  return (
    <group
      ref={travelRef}
      position={basePosition}
      scale={scale}
      onPointerDown={bounceFromTap}
    >
      <group ref={bobRef}>
        <group ref={tapBounceRef}>
          <group ref={facingRef}>
            <group ref={strokeRef}>
              <group rotation-y={MODEL_BASE_ROTATION_Y}>
                <DuckModel
                  scale={scale}
                  hidden={hidden}
                  submergedFraction={submergedFraction}
                />
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
});

// Loads the GLB once (cached by drei's useGLTF) and per-instance clones it
// so multiple Ducks don't share the same scene graph. Auto-fits the cloned
// model so its HEIGHT equals 1.0 world unit — matching the previous
// 0.5-radius sphere's diameter — and lifts it so its belly sits with
// TARGET_SUBMERGED_FRACTION of the height below WATER_Y_WORLD.
//
// Because the outer travelRef applies the `scale` prop, the lift needed to
// land at a consistent submersion fraction depends on `scale`. Given a
// duck with height=1 centered at (0,0,0) in its local frame, its world
// bottom is (localBottom + lift) × scale, and we want that to equal
// WATER_Y − fraction × scale. Solving:
//   lift = 0.5 + WATER_Y_WORLD/scale − TARGET_SUBMERGED_FRACTION
// which is larger for smaller ducks (so ducklings ride proportionally
// higher above the fixed water plane) and smaller for larger ducks. All
// four ducks end up with the same visual submersion fraction.
function DuckModel({
  scale,
  hidden,
  submergedFraction,
}: {
  scale: number;
  hidden: boolean;
  submergedFraction: number;
}) {
  const { scene } = useGLTF("/models/duck.glb");
  const underwater = useView() !== "home";
  const { cloned, materials } = useMemo(() => {
    const c = scene.clone(true);
    const materialClones = new Map<THREE.Material, THREE.Material>();
    // THREE's clone() shares material *instances* across every clone (and
    // with the navbar duck, which loads the same cached GLB). We animate
    // opacity per-duck for the blur-out, so give each clone its own
    // materials — otherwise fading one duck fades them all.
    c.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // Clone materials (see above) and flag them transparent up front so the
      // blur-out can animate their opacity at runtime.
      const dup = (m: THREE.Material) => {
        const existing = materialClones.get(m);
        if (existing) return existing;
        const cm = m.clone();
        cm.transparent = true;
        // "Wet" the submerged part of the duck directly on its own material,
        // in world space — this is what actually sells "half in the water"
        // from directly overhead, not the water plane. Relying on the water
        // plane alone to tint what's behind it doesn't work here: the duck
        // material is ALSO transparent (for the blur-out above), so both are
        // in three.js's transparent render queue, sorted by per-object
        // distance every frame — that ordering can flip as the camera moves,
        // which either wipes out the tint entirely (duck draws on top of
        // water) or makes it flicker. Tinting the duck's own fragments by
        // world Y is immune to draw order and always correct.
        const wetMaterial = cm as THREE.Material & {
          userData: {
            duckWaterShader?: THREE.WebGLProgramParametersWithUniforms;
          };
        };
        cm.onBeforeCompile = (shader) => {
          shader.uniforms.uWaterY = { value: WATER_Y_WORLD };
          shader.uniforms.uUnderwater = { value: 0 };
          wetMaterial.userData.duckWaterShader = shader;
          shader.vertexShader = shader.vertexShader
            .replace(
              "#include <common>",
              "#include <common>\nvarying vec3 vWetWorldPos;",
            )
            .replace(
              "#include <begin_vertex>",
              "#include <begin_vertex>\nvWetWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;",
            );
          shader.fragmentShader = shader.fragmentShader
            .replace(
              "#include <common>",
              "#include <common>\nvarying vec3 vWetWorldPos;\nuniform float uWaterY;\nuniform float uUnderwater;",
            )
            .replace(
              "#include <dithering_fragment>",
              `
              // Soft meniscus band around the waterline, not a hard cutoff —
              // real wet material darkens and cools over a few centimeters,
              // it doesn't switch instantly.
              float wet = 1.0 - smoothstep(uWaterY - 0.05, uWaterY + 0.02, vWetWorldPos.y);
              gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * vec3(0.5, 0.64, 0.74), wet * 0.82);
              // Looking up through the surface should still reveal the sunny
              // top of a floating duck. Keep the blue volume mostly in the
              // genuinely wet part instead of tinting every fragment whenever
              // the camera goes underwater.
              float duckLight = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
              // Re-map the material's brightness into a cyan-blue volume
              // instead of merely multiplying yellow (which produces olive).
              vec3 underwaterColor = vec3(0.12, 0.52, 0.82)
                * (0.52 + duckLight * 0.48);
              float underwaterTint = uUnderwater * mix(0.12, 0.56, wet);
              gl_FragColor.rgb = mix(gl_FragColor.rgb, underwaterColor, underwaterTint);
              #include <dithering_fragment>`,
            );
        };
        materialClones.set(m, cm);
        return cm;
      };
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(dup)
        : dup(mesh.material);
    });
    c.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(c);
    const size = bbox.getSize(new THREE.Vector3());
    const center = bbox.getCenter(new THREE.Vector3());
    if (size.y > 0) {
      const fitScale = 1.0 / size.y;
      c.scale.setScalar(fitScale);
      const yLift = 0.5 + WATER_Y_WORLD / scale - submergedFraction;
      c.position.x = -center.x * fitScale;
      c.position.y = -center.y * fitScale + yLift;
      c.position.z = -center.z * fitScale;
    }
    return { cloned: c, materials: Array.from(materialClones.values()) };
  }, [scene, scale, submergedFraction]);

  const materialsRef = useRef(materials);
  useEffect(() => {
    materialsRef.current = materials;
    return () => {
      // Only the materials belong to this instance. Geometry and textures are
      // loader-cached and still shared with every other duck.
      for (const material of materials) material.dispose();
    };
  }, [materials]);

  // Smoothly lerp opacity toward the target (0 when hidden) for the blur-out.
  // Keep the material list from construction, rather than traversing four
  // complete model graphs and allocating arrays on every animation frame.
  // Once fully dissolved we flip `visible` off so the duck also drops out of
  // the water's reflection pass and stops costing draw time.
  const rootRef = useRef<THREE.Group>(null);
  const opacityRef = useRef(1);
  useFrame((_, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const target = hidden ? 0 : 1;
    opacityRef.current = THREE.MathUtils.lerp(
      opacityRef.current,
      target,
      1 - Math.exp(-5.66 * Math.min(delta, 0.1)),
    );
    if (Math.abs(opacityRef.current - target) < 0.001) opacityRef.current = target;
    const o = opacityRef.current;
    root.visible = o > 0.02;
    const blend = 1 - Math.pow(0.002, delta);
    for (const mm of materialsRef.current) {
      // Three.js materials are intentionally animated outside React's render.
      // eslint-disable-next-line react-hooks/immutability
      mm.opacity = o;
      const duckMaterial = mm as THREE.Material & {
        userData: {
          duckWaterShader?: THREE.WebGLProgramParametersWithUniforms;
        };
      };
      const tint = duckMaterial.userData.duckWaterShader?.uniforms
        .uUnderwater;
      if (tint) {
        tint.value += ((underwater ? 1 : 0) - tint.value) * blend;
      }
    }
  });

  return (
    <group ref={rootRef}>
      <primitive object={cloned} dispose={null} />
    </group>
  );
}
