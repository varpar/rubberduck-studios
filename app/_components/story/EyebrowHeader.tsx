import type { ReactNode } from "react";
import { BlurInText } from "../BlurInText";

/* Eyebrow (yellow, uppercase) + Anton display headline + optional subhead.
 * A string title blurs in per-character as it scrolls into view (BlurInText,
 * "inview"); pass "\n" for line breaks. JSX titles render as-is (still fade in
 * with their Section). `level` sets the semantic tag so each page has one h1. */
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
    size === "display" ? "text-6xl sm:text-8xl" : "text-4xl sm:text-6xl";

  return (
    <header className={`flex flex-col ${alignCls}`}>
      {eyebrow && (
        <span className="mb-5 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-white/72 uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-[#facc15]" />
          {eyebrow}
        </span>
      )}
      <Heading
        className={`font-display leading-[0.92] tracking-tight ${titleCls}`}
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
