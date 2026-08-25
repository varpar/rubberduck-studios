"use client";

import { useSyncExternalStore } from "react";
import type * as THREE from "three";

/**
 * A small bridge between the DOM controls, the duck family, and the R3F
 * camera. Navigation already uses this module-store pattern: keeping the
 * high-frequency target data outside React lets the render loop read it
 * without scheduling a component render every frame.
 */
export const DUCK_EXPLORER_KEYS = ["mom", "d1", "d2", "d3"] as const;

export type DuckExplorerKey = (typeof DUCK_EXPLORER_KEYS)[number];

export const DUCK_EXPLORER_LABELS: Record<DuckExplorerKey, string> = {
  mom: "Mother duck",
  d1: "Duckling 1",
  d2: "Duckling 2",
  d3: "Duckling 3",
};

type ExplorerState = {
  active: boolean;
  selected: DuckExplorerKey;
};

const initialState: ExplorerState = {
  active: false,
  selected: "mom",
};

let state: ExplorerState = initialState;
const listeners = new Set<() => void>();

function setState(next: ExplorerState) {
  if (next.active === state.active && next.selected === state.selected) return;
  state = next;
  for (const listener of listeners) listener();
}

export const duckExplorer = {
  getState: () => state,

  enter() {
    setState({ ...state, active: true });
  },

  exit() {
    setState({ ...state, active: false });
  },

  toggle() {
    setState({ ...state, active: !state.active });
  },

  select(selected: DuckExplorerKey) {
    setState({ ...state, selected });
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

function useStore<T>(selector: (snapshot: ExplorerState) => T): T {
  return useSyncExternalStore(
    duckExplorer.subscribe,
    () => selector(state),
    () => selector(initialState),
  );
}

export const useDuckExplorer = () => useStore((snapshot) => snapshot);
export const useDuckExplorerActive = () =>
  useStore((snapshot) => snapshot.active);

/**
 * Runtime-only camera target. DuckFamily registers its live refs once, then
 * Water reads the selected target imperatively inside useFrame. This is not
 * React state on purpose — object positions change sixty times per second.
 */
export type DuckExplorerTarget = {
  group: THREE.Group;
  heading: number;
  scale: number;
};

const targets: Partial<Record<DuckExplorerKey, DuckExplorerTarget>> = {};

export function registerDuckExplorerTarget(
  key: DuckExplorerKey,
  target: DuckExplorerTarget,
) {
  targets[key] = target;
}

export function unregisterDuckExplorerTarget(
  key: DuckExplorerKey,
  target: DuckExplorerTarget,
) {
  if (targets[key] === target) delete targets[key];
}

export function getSelectedDuckExplorerTarget() {
  return targets[state.selected] ?? null;
}
