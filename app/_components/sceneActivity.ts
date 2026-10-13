"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useSyncExternalStore } from "react";

/** R3F resets its clock on frameloop changes; animation timestamps must not. */
export function SceneClock() {
  const elapsedRef = useRef(0);
  useFrame((state, delta) => {
    elapsedRef.current += delta;
    state.clock.elapsedTime = elapsedRef.current;
  }, -100);
  return null;
}

function subscribeToVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

function getVisibility() {
  return document.visibilityState !== "hidden";
}

export function useDocumentVisible() {
  return useSyncExternalStore(subscribeToVisibility, getVisibility, () => true);
}

function subscribeToMotion(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribeToMotion, getReducedMotion, () => false);
}
