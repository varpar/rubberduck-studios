import Image from "next/image";
import type { ReactNode } from "react";
import { IconDuck } from "../icons";

type AssetRatio = "square" | "portrait" | "landscape";

type AssetSlotProps = {
  /** A local public path, for example `/images/story/work-pond.png`. */
  src?: string;
  /** Required for meaningful images; leave empty only when the image is decorative. */
  alt?: string;
  /** Preloads the image. Reserve this for the single above-the-fold visual. */
  priority?: boolean;
  /** A small field-note label laid over the lower edge of the frame. */
  caption?: string;
  /** Additional classes for the outer frame. */
  className?: string;
  /** CSS object-position value used when the source is cropped to its frame. */
  objectPosition?: string;
  /** Kept for older story call sites and the no-image art fallback. */
  label?: string;
  ratio?: AssetRatio;
  children?: ReactNode;
};

const aspectClass: Record<AssetRatio, string> = {
  portrait: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
  square: "aspect-square",
};

/**
 * An editorial image frame for the story pages.
 *
 * Local sources use Next's responsive image pipeline (`fill` + `sizes`) so a
 * large pond render is not downloaded at full size on a phone. The fallback is
 * intentionally a finished field-note composition rather than a visual TODO,
 * which keeps older routes graceful while their artwork is being added.
 */
export function AssetSlot({
  src,
  alt = "",
  priority = false,
  caption,
  className,
  objectPosition = "center",
  label = "Pond study",
  ratio = "square",
  children,
}: AssetSlotProps) {
  const hasImage = Boolean(src);

  return (
    <div
      className={[
        "group relative isolate w-full max-w-md overflow-hidden rounded-[2rem] bg-[#0a5068] shadow-[0_28px_84px_-44px_rgba(6,38,63,0.82)] ring-1 ring-[#06263f]/15",
        aspectClass[ratio],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {hasImage ? (
        <>
          <Image
            src={src!}
            alt={alt}
            fill
            preload={priority}
            sizes="(min-width: 768px) 28rem, calc(100vw - 3rem)"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025] motion-reduce:transform-none motion-reduce:transition-none"
            style={{ objectPosition }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(6,38,63,0.06)_0%,rgba(6,38,63,0.02)_43%,rgba(6,38,63,0.56)_100%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-8 top-5 z-[2] h-px bg-white/60"
          />
        </>
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.28),transparent_24%),radial-gradient(circle_at_80%_72%,rgba(97,202,220,0.36),transparent_35%),linear-gradient(145deg,#0a4259_0%,#0a5368_50%,#06263f_100%)]"
        >
          <span className="absolute -top-12 -right-8 h-48 w-48 rounded-full border border-white/55 bg-white/15" />
          <span className="absolute top-[38%] -left-12 h-40 w-40 rounded-full border border-white/20 bg-[#facc15]/20" />
          <span className="absolute right-[12%] bottom-[14%] h-24 w-24 rounded-full border border-white/35 bg-white/10" />
          <span className="absolute right-8 bottom-9 h-1 w-28 rounded-full bg-white/50" />
        </div>
      )}

      {children ? (
        <div
          className={
            "absolute inset-0 z-10 flex items-center justify-center p-7 " +
            "text-white"
          }
        >
          {children}
        </div>
      ) : !hasImage ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-8 text-center text-white">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/14 shadow-[0_16px_38px_-22px_rgba(0,0,0,0.65)] ring-1 ring-white/45">
            <IconDuck size={34} />
          </span>
          <span className="mt-5 text-[0.65rem] font-semibold tracking-[0.22em] text-white/65 uppercase">
            Field note
          </span>
          <span className="mt-1 font-display text-2xl tracking-tight text-white">
            {label}
          </span>
        </div>
      ) : null}

      {caption ? (
        <p className="absolute right-5 bottom-5 left-5 z-20 text-xs font-semibold tracking-[0.16em] text-white uppercase drop-shadow-[0_1px_8px_rgba(6,38,63,0.45)]">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
