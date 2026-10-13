"use client";

/* R3F render-loop code intentionally mutates Three.js objects and uniforms. */
/* eslint-disable react-hooks/immutability */

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

const MOBILE_HOME_CAMERA = {
  // A portrait phone needs to see the bank, water and companion together.
  // This gentle diorama angle gives the pond enough breathing room that the
  // narrow viewport does not reduce the scene to a single floating model.
  position: new THREE.Vector3(-0.8, 4.6, 15.2),
  lookAt: new THREE.Vector3(-0.8, -0.35, -0.9),
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
const MOBILE_HOME_FOV = 42;
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

function lowPowerPixelRatioCap() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const constrained =
    (navigator.hardwareConcurrency ?? 8) <= 4 ||
    (nav.deviceMemory ?? 8) <= 4;
  // Modern phone GPUs can afford a crisp 2x cap once the capture pass,
  // shadows and HDRI are gone. Hold the most constrained devices at 1.5x.
  return constrained ? 1.5 : 2;
}

/**
 * Owns the camera dive and, on desktop, one scene capture used for refraction.
 * A full Evan-Wallace style simulation needs several float-target passes plus
 * ray tracing. Phones deliberately use StylizedWater's single-pass optical
 * fallback instead: it keeps the pond's sky, depth and wake cues without a
 * second render of every GLB in the scene.
 */
type WaterSurfaceProps = {
  /** Fired after the water material has mounted and its source is resolved. */
  onReady?: () => void;
};

export function WaterSurface({ onReady }: WaterSurfaceProps) {
  const view = useView();
  const explorerActive = useDuckExplorerActive();
  const { camera, scene, gl, size, setDpr } = useThree();
  const lowPower = useMemo(() => detectLowPowerDevice(gl), [gl]);
  const pixelRatio = Math.min(gl.getPixelRatio(), lowPower ? 1 : 1.5);
  // Refraction is a second full scene render. It is valuable on desktop, but
  // even a compact capture makes a phone load every model twice per refresh.
  // The mobile shader has a deliberately art-directed, stable fallback, so it
  // needs no FBO allocation or capture pass at all.
  const captureScale = 1;
  const captureCap = 2048;
  const minCaptureWidth = 192;
  const minCaptureHeight = 128;
  const captureWidth = Math.max(
    minCaptureWidth,
    Math.min(captureCap, Math.round(size.width * pixelRatio * captureScale)),
  );
  const captureHeight = Math.max(
    minCaptureHeight,
    Math.min(captureCap, Math.round(size.height * pixelRatio * captureScale)),
  );
  const sceneTarget = useMemo(() => {
    if (lowPower) return null;

    // Keep one target/texture identity across resizes. Replacing it used to
    // rebuild the water geometry and recompile its material on every resize.
    const target = new THREE.WebGLRenderTarget(1, 1, {
      depthBuffer: true,
      stencilBuffer: false,
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
    });
    target.texture.colorSpace = THREE.SRGBColorSpace;
    return target;
  }, [lowPower]);

  const captureStaleRef = useRef(true);
  useEffect(() => {
    sceneTarget?.setSize(captureWidth, captureHeight);
    captureStaleRef.current = true;
  }, [captureHeight, captureWidth, sceneTarget]);

  useEffect(
    () => () => {
      sceneTarget?.dispose();
    },
    [sceneTarget],
  );

  const waterRef = useRef<WaterHandle>(null);
  const homeCamera = lowPower ? MOBILE_HOME_CAMERA : CAMERA.home;
  const homeFov = lowPower ? MOBILE_HOME_FOV : HOME_FOV;
  const lookRef = useRef(homeCamera.lookAt.clone());
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const submergedRef = useRef(0);
  const frameRef = useRef(0);
  const captureEveryRef = useRef(2);
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
    if (lowPower) {
      // A small Retina-quality cap removes the conspicuous 1x shimmer on
      // phone displays without returning to the 3x full-resolution workload.
      setDpr(Math.min(window.devicePixelRatio || 1, lowPowerPixelRatioCap()));
    }
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
    const destination = diving ? CAMERA.underwater : homeCamera;
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
  }, [camera, homeCamera, scene, view]);

  useFrame((_, delta) => {
    if (!lowPower) {
      const performanceWindow = performanceWindowRef.current;
      performanceWindow.elapsed += Math.min(delta, 0.1);
      performanceWindow.frames += 1;
      if (performanceWindow.elapsed >= 1.5) {
        const fps = performanceWindow.frames / performanceWindow.elapsed;
        captureEveryRef.current = fps < 48 ? 3 : fps > 58 ? 1 : 2;
        performanceWindow.elapsed = 0;
        performanceWindow.frames = 0;
      }
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
        camera.position.lerp(homeCamera.position, returnBlend);
        lookRef.current.lerp(homeCamera.lookAt, returnBlend);
        dampFov(camera, homeFov, delta, EXPLORER_HOME_RETURN_RESPONSE);

        if (
          camera.position.distanceToSquared(homeCamera.position) < 0.0004 &&
          lookRef.current.distanceToSquared(homeCamera.lookAt) < 0.0004
        ) {
          camera.position.copy(homeCamera.position);
          lookRef.current.copy(homeCamera.lookAt);
          explorerWasActiveRef.current = false;
        }
      } else {
        const hasSandboxZoom =
          sandboxZoomRef.current > 0.0001 ||
          sandboxZoomTargetRef.current > 0.0001;
        const activeView = viewRef.current;
        const baseCamera =
          activeView === "home" ? homeCamera : CAMERA.underwater;
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
              homeFov,
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
          dampFov(camera, homeFov, delta, EXPLORER_HOME_RETURN_RESPONSE);
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

  }, -10);

  // Render after every animation callback has updated its transforms. Both
  // passes share the very same current-frame shadows and world matrices.
  // A positive priority replaces R3F's default render, so there is no third
  // main-scene draw after this callback.
  useFrame(() => {
    const mesh = waterRef.current?.mesh;
    const previousTarget = gl.getRenderTarget();
    const previousAutoUpdate = gl.shadowMap.autoUpdate;
    const previousMatrixAutoUpdate = scene.matrixWorldAutoUpdate;
    const wasVisible = mesh?.visible ?? false;

    scene.updateMatrixWorld();
    scene.matrixWorldAutoUpdate = false;
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;

    try {
      // At the exact overhead endpoint aboveWater() gives refraction zero
      // weight (bedVeil = 1). Its sky reflections and wakes still render in
      // full, while the scene capture would produce no visible contribution.
      const needsRefraction = submergedRef.current >= 0.02 || camera.position.y < 7.5;
      if (!needsRefraction) captureStaleRef.current = true;
      if (
        sceneTarget && mesh && needsRefraction &&
        (captureStaleRef.current || frameRef.current % captureEveryRef.current === 0)
      ) {
        mesh.visible = false;
        gl.setRenderTarget(sceneTarget);
        // The renderer already clears the target before render; a separate
        // clear repeated the full framebuffer operation for no visual change.
        gl.render(scene, camera);
        captureStaleRef.current = false;
      }
      frameRef.current += 1;
      if (mesh) mesh.visible = wasVisible;
      gl.setRenderTarget(previousTarget);
      gl.render(scene, camera);
    } finally {
      if (mesh) mesh.visible = wasVisible;
      gl.setRenderTarget(previousTarget);
      gl.shadowMap.autoUpdate = previousAutoUpdate;
      scene.matrixWorldAutoUpdate = previousMatrixAutoUpdate;
    }
  }, 1);

  return (
    <StylizedWater
      ref={waterRef}
      sceneTexture={sceneTarget?.texture ?? null}
      lowPower={lowPower}
      onReady={onReady}
    />
  );
}
