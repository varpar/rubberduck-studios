import Image from "next/image";
import type { ProjectVisual } from "../../_data/work";

/**
 * A single treatment for the proof images across the work index and case
 * studies. The dark matte and quiet water tint let real interfaces belong to
 * Rubberduck's world without turning them into decorative blue thumbnails.
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
    <figure className={`rd-media-stage relative ${className}`}>
      <Image
        fill
        preload={preload}
        loading={preload ? "eager" : "lazy"}
        sizes={sizes}
        src={image.src}
        alt={image.alt}
        className="rd-media-stage__image object-cover"
      />
      <span aria-hidden="true" className="rd-media-stage__tint" />
      {caption ? (
        <figcaption className="rd-media-stage__caption">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
