import Image from "next/image";
import type { ProjectVisual } from "../../_data/work";

/**
 * Case-study screens keep their native proportions and original colours.
 * A full-size link lets visitors inspect the interface on smaller screens.
 */
export function ProjectMedia({
  image,
  className,
  caption,
  preload = false,
  sizes,
}: {
  image: ProjectVisual;
  className: string;
  caption?: string;
  preload?: boolean;
  sizes: string;
}) {
  return (
    <figure className={`rd-media-stage ${className}`}>
      <div className="rd-media-stage__viewport">
        <Image
          width={image.width}
          height={image.height}
          quality={90}
          preload={preload}
          loading={preload ? undefined : "lazy"}
          sizes={sizes}
          src={image.src}
          alt={image.alt}
          className="rd-media-stage__image block h-auto w-full"
        />
      </div>
      {caption ? (
        <figcaption className="rd-media-stage__caption flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
          <span>{caption}</span>
          <a
            href={image.src}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open full-size screenshot: ${caption} (opens in a new tab)`}
            className="inline-flex min-h-11 items-center gap-2 rounded-sm text-white underline decoration-white/45 underline-offset-4 hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#facc15]"
          >
            View full size <span aria-hidden="true">↗</span>
          </a>
        </figcaption>
      ) : null}
    </figure>
  );
}
