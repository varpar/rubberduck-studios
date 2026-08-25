import { BlurInText } from "../BlurInText";

/* A full-bleed punch line — huge Anton, pushed to one side (not centered) so it
 * breaks the rhythm between split rows and uses the horizontal space. Blurs in
 * per-character. `align` decides which side it hugs. */
export function Statement({
  eyebrow,
  children,
  align = "left",
}: {
  eyebrow?: string;
  children: string;
  align?: "left" | "right";
}) {
  const sideCls =
    align === "right"
      ? "mr-0 ml-auto items-end text-right"
      : "ml-0 mr-auto items-start text-left";

  return (
    <div className={`flex max-w-3xl flex-col ${sideCls}`}>
      {eyebrow && (
        <span className="mb-5 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase text-[#06263f]/70">
          <span className="h-1.5 w-1.5 rounded-full bg-[#06263f]" />
          {eyebrow}
        </span>
      )}
      <p className="font-display text-5xl leading-[0.95] tracking-tight text-[#06263f] sm:text-7xl">
        <BlurInText text={children} trigger="inview" />
      </p>
    </div>
  );
}
