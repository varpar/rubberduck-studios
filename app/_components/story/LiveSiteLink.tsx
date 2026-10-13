import type { FeaturedProject } from "../../_data/work";

/** A separate, ordinary link keeps the destination available without JavaScript. */
export function LiveSiteLink({ project }: { project: FeaturedProject }) {
  return (
    <a
      href={project.website}
      target="_blank"
      rel="noopener noreferrer"
      className="rd-project-action rd-project-action--live"
      aria-label={`Visit ${project.title} live website (opens in a new tab)`}
    >
      Visit live website
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 4h6v6M20 4l-9 9" />
        <path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" />
      </svg>
    </a>
  );
}
