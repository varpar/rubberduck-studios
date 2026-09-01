"use client";

import Link from "next/link";
import { nav, useView } from "../_state/navigation";

/**
 * `routeMode` is used by the shareable story URLs. It preserves the same
 * wordmark treatment as the in-scene UI, while keeping the browser URL and
 * history truthful instead of only changing the local overlay state.
 */
export function HomeLink({ routeMode = false }: { routeMode?: boolean }) {
  const view = useView();
  const shell =
    "font-heading inline-flex min-h-11 items-center rounded-full bg-[#06263f]/86 px-3 py-1.5 text-3xl font-bold tracking-tight text-white shadow-[0_12px_28px_-20px_rgba(0,0,0,0.82)] ring-1 ring-white/25 sm:text-4xl";

  return (
    <div className="pointer-events-none absolute left-[max(1.25rem,env(safe-area-inset-left))] top-[max(1.25rem,env(safe-area-inset-top))] z-20 sm:left-10 sm:top-10">
      {routeMode ? (
        <Link
          href="/"
          aria-label="Back to the Rubberduck home page"
          className={
            shell +
            " pointer-events-auto transition-colors duration-200 hover:bg-[#06263f] focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b5270] focus-visible:outline-none motion-reduce:transition-none"
          }
        >
          rubberduck
        </Link>
      ) : view === "home" ? (
        <span className={shell}>rubberduck</span>
      ) : (
        <button
          type="button"
          onClick={() => nav.setView("home")}
          aria-label="Back to home"
          className={
            shell +
            " pointer-events-auto transition-colors duration-200 hover:bg-[#06263f] focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b5270] focus-visible:outline-none motion-reduce:transition-none"
          }
        >
          rubberduck
        </button>
      )}
    </div>
  );
}
