"use client";

import { useSyncExternalStore } from "react";

export type View = "home" | "projects" | "about" | "contact";
export type PageView = Exclude<View, "home">;
export type HoverTarget = PageView | null;

export const PAGE_VIEWS: readonly PageView[] = ["projects", "about", "contact"];

type State = {
  view: View;
  hover: HoverTarget;
  contentVisible: PageView | null;
};

const initialState: State = {
  view: "home",
  hover: null,
  contentVisible: null,
};

// Single source of truth lives in module scope so it can be read from both
// outside (Nav, content overlays) and inside the R3F Canvas (DuckFamily)
// without bridging React contexts across renderers.
let state: State = initialState;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const nav = {
  getState: (): State => state,

  setView(view: View) {
    if (state.view === view) return;
    state = { ...state, view };
    emit();
  },

  setHover(hover: HoverTarget) {
    if (state.hover === hover) return;
    state = { ...state, hover };
    emit();
  },

  setContentVisible(contentVisible: PageView | null) {
    if (state.contentVisible === contentVisible) return;
    state = { ...state, contentVisible };
    emit();
  },

  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    nav.subscribe,
    () => selector(state),
    () => selector(initialState),
  );
}

export const useView = () => useStore((s) => s.view);
export const useHover = () => useStore((s) => s.hover);
export const useContentVisible = () => useStore((s) => s.contentVisible);

export function duckIndexFor(view: PageView): 0 | 1 | 2 {
  if (view === "projects") return 0;
  if (view === "about") return 1;
  return 2;
}
