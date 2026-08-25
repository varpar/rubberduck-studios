"use client";

import { useState } from "react";
import { IconChevronDown } from "../icons";

/* Accordion. Height animates via the grid-rows 1fr/0fr trick (no JS height
 * measuring, no layout jank), and the chevron rotates. First item open. */
export function FAQ({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <ul className="mx-auto max-w-xl divide-y divide-black/10">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 py-5 text-left"
            >
              <span className="font-display text-xl tracking-tight text-[#06263f] sm:text-2xl">
                {it.q}
              </span>
              <IconChevronDown
                size={22}
                className={
                  "shrink-0 text-[#06263f] transition-transform duration-300 " +
                  (isOpen ? "rotate-180" : "")
                }
              />
            </button>
            <div
              className={
                "grid transition-all duration-300 ease-out " +
                (isOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0")
              }
            >
              <div className="overflow-hidden">
                <p className="pr-8 pb-5 text-base leading-relaxed text-[#06263f]/75">
                  {it.a}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
