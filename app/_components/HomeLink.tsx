"use client";

import { nav, useView } from "../_state/navigation";

export function HomeLink() {
  const view = useView();
  return (
    <div className="pointer-events-none absolute left-8 top-8 z-20 sm:left-10 sm:top-10">
      <button
        type="button"
        onClick={() => nav.setView("home")}
        aria-label="Back to home"
        className={
          "font-heading pointer-events-auto text-3xl font-bold tracking-tight text-white transition-opacity sm:text-4xl " +
          // White in both states — the hero and the raised glass story stay
          // visually connected to the pond.
          (view === "home" ? "opacity-100" : "opacity-90 hover:opacity-100")
        }
      >
        rubberduck
      </button>
    </div>
  );
}
