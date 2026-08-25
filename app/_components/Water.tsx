"use client";

/* R3F render-loop code intentionally mutates Three.js objects and uniforms. */
/* eslint-disable react-hooks/immutability */

import { useFBO } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  duckExplorer,
  getSelectedDuckExplorerTarget,
  useDuckExplorerActive,
} from "../_state/duckExplorer";
import { useView } from "../_state/navigation";
import {
  waterInteractors,
  waterWakeImpulses,
} from "../_state/waterInteraction";
import { duckDive } from "../_state/waterLevel";
import { StylizedWater, type WaterHandle } from "./StylizedWater";

const CAMERA = {
  home: {
    position: new THREE.Vector3(0, 0.62, 6.5),
    lookAt: new THREE.Vector3(0, -0.02, 0),
  },
  underwater: {
    // Keep the viewer inside the pool volume (above its tiled floor) so the
    // waterline, ducks, walls, and caustics share a believable space.
    position: new THREE.Vector3(-1.1, -1.55, 2.3),
    lookAt: new THREE.Vector3(-1.3, -0.1, -0.4),
  },
};

// The home camera begins at duck height, then deliberately opens into a
// readable overhead view of the whole pool. Keeping this as a second endpoint
// (rather than adding free orbit controls) preserves the composed hero and
// prevents users from looking beyond the pool shell.
const SANDBOX_CAMERA = {
  position: new THREE.Vector3(0, 12.6, 17),
  lookAt: new THREE.Vector3(0, -0.66, -0.35),
  fov: 43,
};
const HOME_FOV = 28;
const SANDBOX_WHEEL_SENSITIVITY = 0.00115;

// The duck camera sits just ahead of and above the selected duck's head. It
// is a true duck-eye view instead of a close third-person shot that would
// leave the rubber duck filling half the frame. Keeping it guided (rather
// than OrbitControls) keeps the shoreline in view and steering unambiguous.
const EXPLORER_FOV = 48;
const EXPLORER_MIN_LEAD_DISTANCE = 0.15;
const EXPLORER_LEAD_DISTANCE_SCALE = 0.18;
const EXPLORER_MIN_EYE_HEIGHT = 0.46;
const EXPLORER_EYE_HEIGHT_SCALE = 0.82;
const EXPLORER_LOOK_AHEAD = 3.15;
const EXPLORER_POSITION_RESPONSE = 8.5;
const EXPLORER_LOOK_RESPONSE = 10;
const EXPLORER_HOME_RETURN_RESPONSE = 5;

function clampUnit(value: number) {
  return Math.min(1, Math.max(0, value));
}

function dampFactor(response: number, delta: number) {
  return 1 - Math.exp(-response * Math.min(delta, 0.1));
}

function dampFov(
  camera: THREE.Camera,
  targetFov: number,
  delta: number,
  response: number,
) {
  if (!(camera instanceof THREE.PerspectiveCamera)) return;
  const nextFov = THREE.MathUtils.lerp(
    camera.fov,
    targetFov,
    dampFactor(response, delta),
  );
  if (Math.abs(camera.fov - nextFov) <= 0.001) return;
  camera.fov = nextFov;
  camera.updateProjectionMatrix();
}

const BACKGROUND_HOME = new THREE.Color("#9edbed");
// A sunlit lagoon rather than an abyss. The shader still adds depth through
// absorption and fog, but the scene never begins from a muddy blue-green base.
const BACKGROUND_UNDERWATER = new THREE.Color("#43bed5");
const UV_BIAS = new THREE.Matrix4().set(
  0.5, 0, 0, 0.5,
  0, 0.5, 0, 0.5,
  0, 0, 0.5, 0.5,
  0, 0, 0, 1,
);

function detectLowPowerDevice(renderer: THREE.WebGLRenderer): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const context = renderer.getContext();
  const debugInfo = context.getExtension("WEBGL_debug_renderer_info");
  const rendererName = debugInfo
    ? String(context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
    : "";
  return (
    /swiftshader|software|llvmpipe/i.test(rendererName) ||
    window.matchMedia("(pointer: coarse)").matches ||
    (nav.hardwareConcurrency ?? 8) <= 4 ||
    (nav.deviceMemory ?? 8) <= 4
  );
}

/**
 * Owns the camera dive and one reduced-resolution scene capture used for
 * refraction. A full Evan-Wallace style simulation needs several float-target
 * passes plus ray tracing; this hybrid spends a single inexpensive pass and
 * puts the remaining water cues in the surface shader.
 */
export function WaterSurface() {
  const view = useView();
  const explorerActive = useDuckExplorerActive();
  const { camera, scene, gl, size, setDpr } = useThree();
  const lowPower = useMemo(() => detectLowPowerDevice(gl), [gl]);
  const pixelRatio = Math.min(gl.getPixelRatio(), lowPower ? 1 : 1.5);
  // Refraction is a screen-space texture. The old 768px desktop cap was being
  // magnified across high-DPR displays, which made the underwater world look
  // pixelated. Desktop GPUs get a sharper target; phones retain a compact
  // target and slower update cadence below.
  // Desktop refraction is sampled at the renderer's effective resolution so
  // a close duck reflection stays smooth on a retina display. Phones retain
  // the compact half-resolution target below, where visual stability matters
  // more than a costly full-size second scene render.
  const captureScale = lowPower ? 0.5 : 1;
  const captureCap = lowPower ? 640 : 2048;
  const captureWidth = Math.max(
    192,
    Math.min(captureCap, Math.round(size.width * pixelRatio * captureScale)),
  );
  const captureHeight = Math.max(
    128,
    Math.min(captureCap, Math.round(size.height * pixelRatio * captureScale)),
  );
  const sceneTarget = useFBO(captureWidth, captureHeight, {
    samples: 0,
    depthBuffer: true,
    stencilBuffer: false,
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    colorSpace: THREE.SRGBColorSpace,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: false,
  });

  const waterRef = useRef<WaterHandle>(null);
  const lookRef = useRef(CAMERA.home.lookAt.clone());
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const submergedRef = useRef(0);
  const frameRef = useRef(0);
  const captureEveryRef = useRef(lowPower ? 4 : 2);
  const performanceWindowRef = useRef({ elapsed: 0, frames: 0 });
  const viewRef = useRef(view);
  // Wheel input is deliberately held in refs: a scroll tick must not trigger a
  // React render in the middle of the WebGL loop.
  const sandboxZoomRef = useRef(0);
  const sandboxZoomTargetRef = useRef(0);
  const explorerWasActiveRef = useRef(false);
  const explorerCameraScratch = useMemo(
    () => ({
      forward: new THREE.Vector3(),
      cameraGoal: new THREE.Vector3(),
      lookGoal: new THREE.Vector3(),
    }),
    [],
  );
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const textureMatrix = useMemo(() => new THREE.Matrix4(), []);

  useEffect(() => {
    if (lowPower) setDpr(1);
  }, [lowPower, setDpr]);

  useEffect(() => {
    viewRef.current = view;
    // The sandbox is intentionally a home-only affordance. Returning from a
    // page begins again with the duck-level composition instead of preserving
    // a surprising aerial camera state.
    if (view !== "home") {
      sandboxZoomRef.current = 0;
      sandboxZoomTargetRef.current = 0;
      // A page transition takes the viewer underwater. Clear first-person
      // mode before the dive starts, rather than leaving two camera intents
      // alive for a frame during a nav click.
      duckExplorer.exit();
    }
  }, [view]);

  useEffect(() => {
    if (!explorerActive) return;

    // Exploration is intentionally mutually exclusive with the wheel sandbox.
    // Resetting both refs also means Escape returns to the composed hero rather
    // than an unexpected half-aerial view.
    sandboxZoomRef.current = 0;
    sandboxZoomTargetRef.current = 0;
    timelineRef.current?.kill();
  }, [explorerActive]);

  useEffect(() => {
    const canvas = gl.domElement;

    function onWheel(event: WheelEvent) {
      if (
        viewRef.current !== "home" ||
        duckExplorer.getState().active ||
        event.deltaY === 0
      ) {
        return;
      }

      const lineScale = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 18 : 1;
      const previous = sandboxZoomTargetRef.current;
      sandboxZoomTargetRef.current = clampUnit(
        previous + event.deltaY * lineScale * SANDBOX_WHEEL_SENSITIVITY,
      );

      // Home has no document scroll. Capturing this avoids the rubber-band
      // bounce and makes a trackpad's two-finger gesture feel like one calm,
      // continuous pull back through the pool.
      if (sandboxZoomTargetRef.current !== previous) {
        event.preventDefault();
      }
    }

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [gl]);

  useEffect(() => {
    const previousFog = scene.fog;
    const fog = new THREE.FogExp2(BACKGROUND_UNDERWATER, 0);
    scene.fog = fog;
    return () => {
      scene.fog = previousFog;
    };
  }, [scene]);

  useEffect(() => {
    const diving = view !== "home";
    const destination = diving ? CAMERA.underwater : CAMERA.home;
    const background = diving
      ? BACKGROUND_UNDERWATER
      : BACKGROUND_HOME;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    timelineRef.current?.kill();

    if (reducedMotion) {
      camera.position.copy(destination.position);
      lookRef.current.copy(destination.lookAt);
      duckDive.y = diving ? -0.38 : 0;
      if (scene.background instanceof THREE.Color) {
        scene.background.copy(background);
      }
      return;
    }

    const timeline = gsap.timeline();
    timelineRef.current = timeline;
    timeline.to(
      camera.position,
      {
        x: destination.position.x,
        y: destination.position.y,
        z: destination.position.z,
        duration: 1.35,
        ease: "power2.inOut",
      },
      0,
    );
    timeline.to(
      lookRef.current,
      {
        x: destination.lookAt.x,
        y: destination.lookAt.y,
        z: destination.lookAt.z,
        duration: 1.25,
        ease: "power2.inOut",
      },
      0,
    );
    timeline.to(
      duckDive,
      {
        y: diving ? -0.38 : 0,
        duration: 1.18,
        ease: "power2.inOut",
      },
      0,
    );
    if (scene.background instanceof THREE.Color) {
      timeline.to(
        scene.background,
        {
          r: background.r,
          g: background.g,
          b: background.b,
          duration: 1.15,
          ease: "power1.inOut",
        },
        0,
      );
    }

    return () => {
      timeline.kill();
    };
  }, [camera, scene, view]);

  useFrame((_, delta) => {
    const performanceWindow = performanceWindowRef.current;
    performanceWindow.elapsed += Math.min(delta, 0.1);
    performanceWindow.frames += 1;
    if (performanceWindow.elapsed >= 1.5) {
      const fps = performanceWindow.frames / performanceWindow.elapsed;
      captureEveryRef.current = lowPower
        ? fps < 42
          ? 4
          : 3
        : fps < 48
          ? 3
          : fps > 58
            ? 1
            : 2;
      performanceWindow.elapsed = 0;
      performanceWindow.frames = 0;
    }

    const isExploringHome =
      viewRef.current === "home" && duckExplorer.getState().active;
    const explorerTarget = isExploringHome
      ? getSelectedDuckExplorerTarget()
      : null;

    if (explorerTarget) {
      const { forward, cameraGoal, lookGoal } = explorerCameraScratch;
      const duckScale = explorerTarget.scale;
      const leadDistance = Math.max(
        EXPLORER_MIN_LEAD_DISTANCE,
        duckScale * EXPLORER_LEAD_DISTANCE_SCALE,
      );
      const eyeHeight = Math.max(
        EXPLORER_MIN_EYE_HEIGHT,
        duckScale * EXPLORER_EYE_HEIGHT_SCALE,
      );

      // Duck.tsx retains this heading after a glide settles, so both the view
      // and the duck keep facing the same direction while stationary.
      forward.set(
        Math.sin(explorerTarget.heading),
        0,
        Math.cos(explorerTarget.heading),
      );
      cameraGoal
        .copy(explorerTarget.group.position)
        .addScaledVector(forward, leadDistance);
      cameraGoal.y += eyeHeight;
      lookGoal
        .copy(explorerTarget.group.position)
        .addScaledVector(forward, EXPLORER_LOOK_AHEAD);
      lookGoal.y += Math.max(0.07, duckScale * 0.14);

      const positionBlend = reducedMotion
        ? 1
        : dampFactor(EXPLORER_POSITION_RESPONSE, delta);
      const lookBlend = reducedMotion
        ? 1
        : dampFactor(EXPLORER_LOOK_RESPONSE, delta);
      camera.position.lerp(cameraGoal, positionBlend);
      lookRef.current.lerp(lookGoal, lookBlend);
      dampFov(camera, EXPLORER_FOV, delta, EXPLORER_POSITION_RESPONSE);
      explorerWasActiveRef.current = true;
    } else {
      if (viewRef.current !== "home") {
        explorerWasActiveRef.current = false;
      }

      // When Escape closes the duck view, ease back to the familiar hero
      // composition. The old camera implementation assumed it was already at
      // HOME, which would leave the lens stranded over the pond after exit.
      if (explorerWasActiveRef.current && viewRef.current === "home") {
        const returnBlend = reducedMotion
          ? 1
          : dampFactor(EXPLORER_HOME_RETURN_RESPONSE, delta);
        camera.position.lerp(CAMERA.home.position, returnBlend);
        lookRef.current.lerp(CAMERA.home.lookAt, returnBlend);
        dampFov(camera, HOME_FOV, delta, EXPLORER_HOME_RETURN_RESPONSE);

        if (
          camera.position.distanceToSquared(CAMERA.home.position) < 0.0004 &&
          lookRef.current.distanceToSquared(CAMERA.home.lookAt) < 0.0004
        ) {
          camera.position.copy(CAMERA.home.position);
          lookRef.current.copy(CAMERA.home.lookAt);
          explorerWasActiveRef.current = false;
        }
      } else {
        const hasSandboxZoom =
          sandboxZoomRef.current > 0.0001 ||
          sandboxZoomTargetRef.current > 0.0001;
        if (viewRef.current === "home" && hasSandboxZoom) {
          const zoom = sandboxZoomRef.current;
          const target = sandboxZoomTargetRef.current;
          const cameraBlend = reducedMotion
            ? 1
            : 1 - Math.pow(0.0008, Math.min(delta, 0.1));
          sandboxZoomRef.current += (target - zoom) * cameraBlend;

          const easedZoom = THREE.MathUtils.smootherstep(
            sandboxZoomRef.current,
            0,
            1,
          );
          camera.position.lerpVectors(
            CAMERA.home.position,
            SANDBOX_CAMERA.position,
            easedZoom,
          );
          lookRef.current.lerpVectors(
            CAMERA.home.lookAt,
            SANDBOX_CAMERA.lookAt,
            easedZoom,
          );

          if (camera instanceof THREE.PerspectiveCamera) {
            const fov = THREE.MathUtils.lerp(
              HOME_FOV,
              SANDBOX_CAMERA.fov,
              easedZoom,
            );
            if (Math.abs(camera.fov - fov) > 0.001) {
              camera.fov = fov;
              camera.updateProjectionMatrix();
            }
          }
        } else if (
          camera instanceof THREE.PerspectiveCamera &&
          Math.abs(camera.fov - HOME_FOV) > 0.001
        ) {
          camera.fov +=
            (HOME_FOV - camera.fov) * (1 - Math.pow(0.002, delta));
          camera.updateProjectionMatrix();
        }
      }
    }

    camera.lookAt(lookRef.current);
    camera.updateMatrixWorld();

    const mesh = waterRef.current?.mesh;
    const material = waterRef.current?.material;
    if (!mesh || !material) return;

    const submergedTarget = viewRef.current === "home" ? 0 : 1;
    const blend = 1 - Math.pow(0.002, delta);
    submergedRef.current +=
      (submergedTarget - submergedRef.current) * blend;
    material.uniforms.uSubmerged.value = submergedRef.current;

    const fog = scene.fog;
    if (fog instanceof THREE.FogExp2) {
      fog.density +=
        ((submergedTarget ? 0.028 : 0) - fog.density) * blend;
    }

    const positions = material.uniforms.uInteractorPosition
      .value as THREE.Vector4[];
    const motions = material.uniforms.uInteractorMotion
      .value as THREE.Vector4[];
    for (let index = 0; index < waterInteractors.length; index++) {
      const source = waterInteractors[index];
      positions[index].set(
        source.x,
        source.z,
        source.radius,
        source.active,
      );
      motions[index].set(
        source.vx,
        source.vz,
        source.speed,
        source.phase,
      );
    }

    const wakeImpulses = material.uniforms.uWakeImpulse
      .value as THREE.Vector4[];
    for (let index = 0; index < waterWakeImpulses.length; index++) {
      const impulse = waterWakeImpulses[index];
      wakeImpulses[index].set(
        impulse.x,
        impulse.z,
        impulse.emittedAt,
        impulse.strength,
      );
    }

    mesh.updateMatrixWorld();
    textureMatrix
      .copy(UV_BIAS)
      .multiply(camera.projectionMatrix)
      .multiply(camera.matrixWorldInverse)
      .multiply(mesh.matrixWorld);
    material.uniforms.uTextureMatrix.value.copy(textureMatrix);

    frameRef.current += 1;
    if (frameRef.current % captureEveryRef.current !== 0) return;

    const previousTarget = gl.getRenderTarget();
    mesh.visible = false;
    gl.setRenderTarget(sceneTarget);
    gl.clear(true, true, true);
    gl.render(scene, camera);
    gl.setRenderTarget(previousTarget);
    mesh.visible = true;
  }, -10);

  return (
    <StylizedWater
      ref={waterRef}
      sceneTexture={sceneTarget.texture}
      lowPower={lowPower}
    />
  );
}
