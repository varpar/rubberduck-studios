import type { ReactNode } from "react";

/* Icon + title + outcome copy. Used for the services offer-ladder and for the
 * "how we work" promises. The icon sits in a yellow chip so it reads as a
 * signal, and the block works on any blue tone. */
export function ServiceBlock({
  icon,
  title,
  note,
}: {
  icon: ReactNode;
  title: string;
  note: string;
}) {
  return (
    <div className="flex gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/60 text-[#06263f] ring-1 ring-black/10">
        {icon}
      </span>
      <div>
        <h3 className="font-display text-xl tracking-tight text-[#06263f]">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-[#06263f]/75">{note}</p>
      </div>
    </div>
  );
}
