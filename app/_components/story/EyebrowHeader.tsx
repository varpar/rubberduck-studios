import type { ReactNode } from "react";
import { BlurInText } from "../BlurInText";

/* Eyebrow (yellow, uppercase) + editorial headline + optional subhead.
 * String titles retain semantic, whole-word wrapping through BlurInText; pass
 * "\n" for intentional line breaks. `level` sets the semantic tag so each
 * page has one h1. */
export function EyebrowHeader({
  eyebrow,
  title,
  sub,
  align = "left",
  size = "section",
  level = 2,
}: {
  eyebrow?: string;
  title: ReactNode;
  sub?: ReactNode;
  align?: "left" | "center";
  size?: "section" | "display";
  level?: 1 | 2;
}) {
  const Heading = level === 1 ? "h1" : "h2";
  const alignCls =
    align === "center" ? "items-center text-center" : "items-start text-left";
  const titleCls =
    size === "display"
      ? "text-[clamp(3.1rem,7.4vw,7.5rem)]"
      : "text-[clamp(2.45rem,5vw,5.35rem)]";

  return (
    <header className={`rd-route-copy flex flex-col ${alignCls}`}>
      {eyebrow && (
        <span className="mb-5 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-white/72 uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-[#facc15]" />
          {eyebrow}
        </span>
      )}
      <Heading
        tabIndex={level === 1 ? -1 : undefined}
        className={`text-balance break-normal hyphens-none font-heading leading-[0.88] font-semibold tracking-[-0.06em] text-white ${titleCls}`}
      >
        {typeof title === "string" ? (
          <BlurInText text={title} trigger="inview" />
        ) : (
          title
        )}
      </Heading>
      {sub && (
        <p className="mt-6 max-w-2xl text-lg leading-relaxed opacity-80 sm:text-xl">
          {sub}
        </p>
      )}
    </header>
  );
}
