import type { ReactNode } from "react";
import { BlurInText } from "../BlurInText";

/* A narrative beat: eyebrow + display title + one or more paragraphs, with an
 * optional illustration/aside beside it (e.g. the big duck mark). */
export function StoryBlock({
  eyebrow,
  title,
  body,
  aside,
}: {
  eyebrow?: string;
  title: ReactNode;
  body: string[];
  aside?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-10 text-center">
      <div>
        {eyebrow && (
          <span className="mb-4 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-[#06263f]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#06263f]" />
            {eyebrow}
          </span>
        )}
        <h2 className="font-display text-4xl leading-[0.98] tracking-tight text-[#06263f] sm:text-6xl">
          {typeof title === "string" ? (
            <BlurInText text={title} trigger="inview" />
          ) : (
            title
          )}
        </h2>
        <div className="mt-6 space-y-4 text-lg leading-relaxed text-[#06263f]/75">
          {body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
      {aside && (
        <div className="flex items-center justify-center">{aside}</div>
      )}
    </div>
  );
}
