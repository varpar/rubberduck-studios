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
import { StylizedWater, type WaterHandle } from "./StylizedWater";

const CAMERA = {
  home: {
    // Mama is deliberately parked at x = -1.3 for the passing-ducks story.
    // A landscape screen has enough horizontal field of view to accommodate
    // that offset, but a portrait phone crops her out entirely when the lens
    // stays at the pond origin. Centre the resting camera on the lead duck so
    // every visitor meets the pond's character before choosing a view.
    position: new THREE.Vector3(-1.3, 0.62, 6.5),
    lookAt: new THREE.Vector3(-1.3, -0.02, 0),
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

// Desktop pilot mode sits just ahead of and above the selected duck's head.
// On low-power / coarse-pointer devices, the same camera becomes a calm
// third-person follow: it keeps the companion visible in-frame without asking
// a phone visitor to steer with a virtual D-pad.
const EXPLORER_FOV = 48;
const EXPLORER_MIN_LEAD_DISTANCE = 0.15;
const EXPLORER_LEAD_DISTANCE_SCALE = 0.18;
const EXPLORER_MIN_EYE_HEIGHT = 0.46;
const EXPLORER_EYE_HEIGHT_SCALE = 0.82;
const EXPLORER_LOOK_AHEAD = 3.15;
const FOLLOW_MIN_DISTANCE = 1.7;
const FOLLOW_DISTANCE_SCALE = 2.7;
const FOLLOW_MIN_HEIGHT = 0.82;
const FOLLOW_HEIGHT_SCALE = 1.15;
const FOLLOW_LOOK_AHEAD = 0.72;
const FOLLOW_FOV = 40;
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
  // Refraction is a second render of the scene. On touch/low-power devices it
  // deliberately uses a compact target and updates less often: the surface
  // shader still moves continuously, while the captured world is calm enough
  // that a 10–15fps refresh is visually stable. This keeps the pond from
  // spending most of its mobile frame budget rendering itself twice.
  const captureScale = lowPower ? 0.4 : 1;
  const captureCap = lowPower ? 448 : 2048;
  const minCaptureWidth = lowPower ? 160 : 192;
  const minCaptureHeight = lowPower ? 112 : 128;
  const captureWidth = Math.max(
    minCaptureWidth,
    Math.min(captureCap, Math.round(size.width * pixelRatio * captureScale)),
  );
  const captureHeight = Math.max(
    minCaptureHeight,
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
    function readingSurfaceIsAtTop(target: EventTarget | null) {
      const element = target instanceof Element ? target : null;
      const storyScroller = element?.closest<HTMLElement>("[data-story-scroll]");
      return storyScroller ? storyScroller.scrollTop <= 1 : window.scrollY <= 1;
    }

    function onWheel(event: WheelEvent) {
      const atHome = viewRef.current === "home";
      if (
        duckExplorer.getState().active ||
        event.deltaY === 0
      ) {
        return;
      }

      const lineScale = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 18 : 1;
      const previous = sandboxZoomTargetRef.current;
      const atTop = atHome || readingSurfaceIsAtTop(event.target);
      // On a reading route, only take the wheel at the very top: scroll up
      // reveals the entire pond, scroll down returns to the story. The page
      // itself keeps its ordinary scroll behaviour everywhere else.
      const canAdjust =
        atTop && (atHome || event.deltaY < 0 || previous > 0.0001);
      if (!canAdjust) return;

      sandboxZoomTargetRef.current = clampUnit(
        previous - event.deltaY * lineScale * SANDBOX_WHEEL_SENSITIVITY,
      );

      // Capturing only a genuine overview adjustment avoids rubber-band bounce
      // on home and lets the same calm pull-back work from an underwater page.
      if (sandboxZoomTargetRef.current !== previous) {
        event.preventDefault();
      }
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
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

    // Route changes take the camera and water optics below the surface, not
    // the ducks. Each Duck already has its own physical waterline via
    // `submergedFraction`; dropping the whole family here hid it completely.
    if (reducedMotion) {
      camera.position.copy(destination.position);
      lookRef.current.copy(destination.lookAt);
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
        ? fps < 34
          ? 6
          : fps < 50
            ? 5
            : 4
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
      if (lowPower) {
        const followDistance = Math.max(
          FOLLOW_MIN_DISTANCE,
          duckScale * FOLLOW_DISTANCE_SCALE,
        );
        const followHeight = Math.max(
          FOLLOW_MIN_HEIGHT,
          duckScale * FOLLOW_HEIGHT_SCALE,
        );
        cameraGoal
          .copy(explorerTarget.group.position)
          .addScaledVector(forward, -followDistance);
        cameraGoal.y += followHeight;
      } else {
        cameraGoal
          .copy(explorerTarget.group.position)
          .addScaledVector(forward, leadDistance);
        cameraGoal.y += eyeHeight;
      }
      lookGoal
        .copy(explorerTarget.group.position)
        .addScaledVector(
          forward,
          lowPower ? FOLLOW_LOOK_AHEAD : EXPLORER_LOOK_AHEAD,
        );
      lookGoal.y += Math.max(0.07, duckScale * 0.14);

      const positionBlend = reducedMotion
        ? 1
        : dampFactor(EXPLORER_POSITION_RESPONSE, delta);
      const lookBlend = reducedMotion
        ? 1
        : dampFactor(EXPLORER_LOOK_RESPONSE, delta);
      camera.position.lerp(cameraGoal, positionBlend);
      lookRef.current.lerp(lookGoal, lookBlend);
      dampFov(
        camera,
        lowPower ? FOLLOW_FOV : EXPLORER_FOV,
        delta,
        EXPLORER_POSITION_RESPONSE,
      );
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
        const activeView = viewRef.current;
        const baseCamera =
          activeView === "home" ? CAMERA.home : CAMERA.underwater;
        const cameraBlend = reducedMotion
          ? 1
          : 1 - Math.pow(0.0008, Math.min(delta, 0.1));

        if (hasSandboxZoom) {
          const zoom = sandboxZoomRef.current;
          const target = sandboxZoomTargetRef.current;
          sandboxZoomRef.current += (target - zoom) * cameraBlend;

          const easedZoom = THREE.MathUtils.smootherstep(
            sandboxZoomRef.current,
            0,
            1,
          );
          camera.position.lerpVectors(
            baseCamera.position,
            SANDBOX_CAMERA.position,
            easedZoom,
          );
          lookRef.current.lerpVectors(
            baseCamera.lookAt,
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
        } else if (!timelineRef.current?.isActive()) {
          // If the user returns the overview to zero, settle precisely back at
          // whichever composed camera the current view owns (hero or
          // underwater), rather than leaving the lens stranded in between.
          camera.position.lerp(baseCamera.position, cameraBlend);
          lookRef.current.lerp(baseCamera.lookAt, cameraBlend);
          dampFov(camera, HOME_FOV, delta, EXPLORER_HOME_RETURN_RESPONSE);
        }
      }
    }

    camera.lookAt(lookRef.current);
    camera.updateMatrixWorld();

    const mesh = waterRef.current?.mesh;
    const material = waterRef.current?.material;
    if (!mesh || !material) return;

    // Scroll-up on a reading surface can pull the viewer back through the
    // waterline into the whole pond. The visual treatment follows that camera
    // continuously rather than leaving an aerial view tinted as underwater.
    const overviewProgress =
      viewRef.current === "home"
        ? 0
        : THREE.MathUtils.smootherstep(sandboxZoomRef.current, 0.08, 0.55);
    const submergedTarget =
      viewRef.current === "home" ? 0 : 1 - overviewProgress;
    const blend = 1 - Math.pow(0.002, delta);
    submergedRef.current +=
      (submergedTarget - submergedRef.current) * blend;
    material.uniforms.uSubmerged.value = submergedRef.current;

    if (!timelineRef.current?.isActive()) {
      if (scene.background instanceof THREE.Color) {
        scene.background.lerpColors(
          BACKGROUND_HOME,
          BACKGROUND_UNDERWATER,
          submergedTarget,
        );
      }
    }

    const fog = scene.fog;
    if (fog instanceof THREE.FogExp2) {
      fog.density +=
        (submergedTarget * 0.018 - fog.density) * blend;
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
