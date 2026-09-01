import type { ReactNode } from "react";
import { BlurInText } from "../BlurInText";
import { ActionButton } from "./ActionButton";

/* The book-a-call conversion band. Repeated (with different copy) at the end of
 * every page. Availability marker is optional. Meant for a deep/ink tone so the
 * yellow button and white label carry contrast. */
export function CTABand({
  headline,
  sub,
  mailto,
  cta = "Book a call",
  availability,
}: {
  headline: ReactNode;
  sub?: ReactNode;
  mailto: string;
  cta?: string;
  availability?: string;
}) {
  return (
    <div className="rd-route-copy mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
      <h2 className="text-balance font-heading text-4xl leading-[0.9] font-semibold tracking-[-0.055em] text-white sm:text-6xl">
        {typeof headline === "string" ? (
          <BlurInText text={headline} trigger="inview" />
        ) : (
          headline
        )}
      </h2>
      {sub && <p className="max-w-xl text-lg leading-relaxed text-white/74">{sub}</p>}
      <ActionButton href={mailto}>{cta}</ActionButton>
      {availability && (
        <span className="flex items-center gap-2 text-sm text-white/74">
          <span className="h-2 w-2 rounded-full bg-[#facc15]" />
          {availability}
        </span>
      )}
    </div>
  );
}
