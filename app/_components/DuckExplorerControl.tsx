"use client";

import { useEffect } from "react";
import {
  DUCK_EXPLORER_KEYS,
  DUCK_EXPLORER_LABELS,
  duckExplorer,
  useDuckExplorer,
} from "../_state/duckExplorer";
import { useView } from "../_state/navigation";

/**
 * The DOM counterpart to the R3F duck camera. Keeping this outside Canvas
 * gives it real buttons, keyboard semantics, and a dependable hit target on
 * touch devices without asking the WebGL scene to do UI work.
 */
export function DuckExplorerControl() {
  const view = useView();
  const explorer = useDuckExplorer();
  const isHome = view === "home";

  useEffect(() => {
    // A page transition owns the dive camera. Leaving exploration here means
    // no stale first-person state survives behind a content page.
    if (!isHome) {
      duckExplorer.exit();
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (!duckExplorer.getState().active) return;

      if (event.key === "Escape") {
        event.preventDefault();
        duckExplorer.exit();
        return;
      }

      const shortcutIndex = Number(event.key) - 1;
      const duckKey = DUCK_EXPLORER_KEYS[shortcutIndex];
      if (!duckKey) return;

      event.preventDefault();
      duckExplorer.select(duckKey);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isHome]);

  if (!isHome) return null;

  return (
    <aside
      aria-label="Duck exploration controls"
      className="fixed top-5 right-5 z-30 flex max-w-[calc(100vw-2.5rem)] flex-col items-end gap-2 sm:top-8 sm:right-8"
    >
      <button
        type="button"
        aria-pressed={explorer.active}
        onClick={() => duckExplorer.toggle()}
        className={
          "flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold tracking-[-0.01em] ring-1 backdrop-blur-md transition-colors motion-reduce:transition-none " +
          (explorer.active
            ? "bg-[#06263f] text-white ring-white/35"
            : "bg-[#06263f]/78 text-white ring-white/28 hover:bg-[#06263f]")
        }
      >
        <span aria-hidden className="text-base leading-none">
          {explorer.active ? "×" : "◉"}
        </span>
        {explorer.active ? "Exit duck view" : "Explore as duck"}
      </button>

      {explorer.active && (
        <div
          aria-live="polite"
          className="w-[min(18rem,calc(100vw-2.5rem))] rounded-2xl bg-[#06263f]/84 p-3 text-white shadow-[0_18px_38px_-24px_rgba(0,0,0,0.9)] ring-1 ring-white/28 backdrop-blur-md"
        >
          <p className="text-[0.68rem] font-bold tracking-[0.12em] text-white/60 uppercase">
            Following {DUCK_EXPLORER_LABELS[explorer.selected]}
          </p>
          <div className="mt-2 grid grid-cols-4 gap-1.5" role="group" aria-label="Choose duck">
            {DUCK_EXPLORER_KEYS.map((duckKey, index) => {
              const selected = explorer.selected === duckKey;
              return (
                <button
                  key={duckKey}
                  type="button"
                  onClick={() => duckExplorer.select(duckKey)}
                  aria-pressed={selected}
                  aria-label={`Follow ${DUCK_EXPLORER_LABELS[duckKey]} (${index + 1})`}
                  className={
                    "min-h-9 rounded-lg px-1 text-xs font-bold transition-colors motion-reduce:transition-none " +
                    (selected
                      ? "bg-white/20 text-white"
                      : "bg-white/8 text-white/72 hover:bg-white/14 hover:text-white")
                  }
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[0.7rem] leading-relaxed text-white/64">
            Arrow keys steer · 1–4 switch ducks · Esc exits
          </p>
        </div>
      )}
    </aside>
  );
}
