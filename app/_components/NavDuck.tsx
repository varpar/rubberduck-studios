"use client";

import { useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import gsap from "gsap";
import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
} from "react";
import * as THREE from "three";
import { useContentVisible, useView } from "../_state/navigation";
import { useDocumentVisible, useReducedMotion } from "./sceneActivity";

// px. The little duck's canvas is square; GAP is the breathing room between
// it and the active nav label it sits to the left of.
const SIZE = 52;
const GAP = 12;

// A single duck, centered in its own tiny canvas, turning slowly on its
// vertical axis. This is the "you are here" marker once a page has loaded.
function SpinningDuck({ reducedMotion }: { reducedMotion: boolean }) {
  const { scene } = useGLTF("/models/duck.glb");
  const ref = useRef<THREE.Group>(null);

  const cloned = useMemo(() => {
    const c = scene.clone(true);
    // Independent materials so the hero family's blur-out (which drives the
    // shared GLB materials' opacity to 0) can never dim this one.
    c.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((m) => m.clone())
        : mesh.material.clone();
    });
    c.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(c);
    const size = bbox.getSize(new THREE.Vector3());
    const center = bbox.getCenter(new THREE.Vector3());
    // Fit the largest dimension into ~1.7 units and recenter at the origin
    // so it spins in place rather than orbiting.
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const fit = 1.7 / maxDim;
    c.scale.setScalar(fit);
    c.position.set(-center.x * fit, -center.y * fit, -center.z * fit);
    return c;
  }, [scene]);

  useEffect(() => () => {
    cloned.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) material.dispose();
    });
  }, [cloned]);

  useFrame((_, delta) => {
    if (ref.current && !reducedMotion) ref.current.rotation.y += delta * 0.9;
  });

  return (
    <group ref={ref}>
      <primitive object={cloned} dispose={null} />
    </group>
  );
}

// Persistent (always-mounted) badge. It reads which page is active and pins
// itself immediately to the LEFT of that page's nav label by measuring the
// label's live position — robust to the label widths and the nav's layout.
// It only fades in once `contentVisible` is set (page fully loaded), which
// is the same beat the hero family blurs out — so the duck reads as moving
// from the water up into the navbar.
export function NavDuck() {
  const view = useView();
  const docked = useContentVisible() !== null;
  const documentVisible = useDocumentVisible();
  const reducedMotion = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);

  // Hidden + off-screen before first paint so it never flashes at the corner
  // while un-positioned. left/top/opacity/filter/scale are owned imperatively
  // (GSAP + place()), never by the React style object below — otherwise a
  // re-render on every view change would clobber the animation mid-flight.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (el) {
      gsap.set(el, { opacity: 0, left: -200, top: -200, filter: "blur(10px)" });
    }
  }, []);

  // Blur hand-off. `contentVisible` passes through null between pages (the
  // swim), so this fires twice per navigation: blur OUT in place as the old
  // page leaves, then blur IN pinned to the new active label. The reposition
  // happens while faded out — so the badge never visibly jumps between labels.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Leaving a page (or home): blur out where it currently sits.
    if (!docked || view === "home") {
      if (reduce) gsap.set(el, { opacity: 0 });
      else
        gsap.to(el, {
          opacity: 0,
          filter: "blur(10px)",
          scale: 0.85,
          duration: 0.35,
          ease: "power2.in",
          overwrite: true,
        });
      return;
    }

    // Docked on a page: pin to the LEFT of the active label, then blur in.
    function place(): boolean {
      if (!el) return false;
      const target = document.querySelector(
        `[data-nav-item="${view}"]`,
      ) as HTMLElement | null;
      if (!target) return false;
      const r = target.getBoundingClientRect();
      el.style.left = `${r.left - SIZE - GAP}px`;
      el.style.top = `${r.top + r.height / 2 - SIZE / 2}px`;
      return true;
    }

    // Next frame so the nav's Flip travel has settled before we measure.
    const raf = requestAnimationFrame(() => {
      if (!place()) return;
      if (reduce) {
        gsap.set(el, { opacity: 1, filter: "blur(0px)", scale: 1 });
        return;
      }
      gsap.fromTo(
        el,
        { opacity: 0, filter: "blur(12px)", scale: 0.78 },
        {
          opacity: 1,
          filter: "blur(0px)",
          scale: 1,
          duration: 0.55,
          ease: "power2.out",
          // Let the hero family start dissolving before this arrives.
          delay: 0.2,
          overwrite: true,
        },
      );
    });

    window.addEventListener("resize", place);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
    };
  }, [docked, view]);

  const style: CSSProperties = {
    position: "fixed",
    width: SIZE,
    height: SIZE,
    pointerEvents: "none",
    zIndex: 30,
    willChange: "transform, filter, opacity",
  };

  return (
    <div ref={wrapRef} style={style} aria-hidden>
      {view !== "home" ? <Canvas
        frameloop={!documentVisible ? "never" : docked && !reducedMotion ? "always" : "demand"}
        camera={{ position: [0, 0.12, 3], fov: 30 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.75} />
        <directionalLight position={[3, 4, 3]} intensity={1.3} />
        <directionalLight position={[-3, 1, 2]} intensity={0.35} />
        <Suspense fallback={null}>
          <SpinningDuck reducedMotion={reducedMotion} />
        </Suspense>
      </Canvas> : null}
    </div>
  );
}
