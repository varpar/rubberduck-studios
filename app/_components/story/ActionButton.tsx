"use client";

import type { ReactNode } from "react";
import { IconArrowRight } from "../icons";

/* The 21st "Motion Button", light theme: an ink circle on the left holding the
 * arrow, expanding to fill the pill on hover while the label flips to light.
 * Ink on light blue — no yellow. Pure CSS. Centers itself in the column. */
export function ActionButton({
  href,
  onClick,
  children,
}: {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const shell =
    "group/btn relative inline-flex items-center self-center overflow-hidden rounded-full bg-[#06263f]/82 p-1 " +
    "shadow-[0_12px_28px_-18px_rgba(0,0,0,0.82)] ring-1 ring-white/25 transition-[box-shadow,background-color] duration-200 hover:bg-[#06263f] hover:shadow-[0_16px_34px_-18px_rgba(0,0,0,0.9)] " +
    "focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none";

  const inner = (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute top-1 bottom-1 left-1 w-10 rounded-full bg-white/14 transition-[width] duration-500 ease-out group-hover/btn:w-[calc(100%-0.5rem)] motion-reduce:transition-none"
      />
      <span
        aria-hidden
        className="relative z-10 flex h-10 w-10 items-center justify-center text-[#facc15] transition-transform duration-500 ease-out group-hover/btn:translate-x-1 motion-reduce:transition-none"
      >
        <IconArrowRight size={20} />
      </span>
      <span className="relative z-10 pr-5 pl-2 text-sm font-semibold tracking-tight whitespace-nowrap text-white motion-reduce:transition-none">
        {children}
      </span>
    </>
  );

  return onClick ? (
    <button type="button" onClick={onClick} className={shell}>
      {inner}
    </button>
  ) : (
    <a href={href} className={shell}>
      {inner}
    </a>
  );
}
