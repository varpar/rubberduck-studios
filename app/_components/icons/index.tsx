import type { ReactNode } from "react";

/* ==========================================================================
 * Local inline SVG icon family. One 24px grid, one stroke weight, rounded
 * caps — so the whole set reads as a family, not clip-art. stroke="currentColor"
 * means every icon inherits ink / white / yellow from its context. width/height
 * attributes are always set so icons never cause layout shift (CLS-safe).
 *
 * No icon dependency, no emoji (both project + research constraints).
 * ======================================================================== */

export type IconProps = {
  className?: string;
  /** px; also drives the intrinsic width/height so there's no CLS. */
  size?: number;
};

function IconBase({
  className,
  size = 24,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconArrowRight = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </IconBase>
);

export const IconChevronDown = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M6 9l6 6 6-6" />
  </IconBase>
);

export const IconCheck = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M20 6L9 17l-5-5" />
  </IconBase>
);

export const IconMail = (p: IconProps) => (
  <IconBase {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </IconBase>
);

export const IconCalendar = (p: IconProps) => (
  <IconBase {...p}>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M3 9h18M8 2v4M16 2v4" />
  </IconBase>
);

export const IconUser = (p: IconProps) => (
  <IconBase {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
  </IconBase>
);

export const IconClock = (p: IconProps) => (
  <IconBase {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </IconBase>
);

// AI / spark — a four-point sparkle with a small companion star.
export const IconSpark = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
    <path d="M18.5 15.5l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6.6-1.7z" />
  </IconBase>
);

// WhatsApp / chat — a generic speech bubble (avoids the trademarked glyph).
export const IconChat = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M21 11.5a8.4 8.4 0 01-12.3 7.4L3 21l2.2-5.5A8.4 8.4 0 1121 11.5z" />
    <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" />
  </IconBase>
);

// Workflow — two nodes joined by an elbow connector.
export const IconWorkflow = (p: IconProps) => (
  <IconBase {...p}>
    <rect x="3" y="3" width="6" height="6" rx="1.5" />
    <rect x="15" y="15" width="6" height="6" rx="1.5" />
    <path d="M9 6h5a2 2 0 012 2v5" />
  </IconBase>
);

export const IconCode = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M8 6l-6 6 6 6M16 6l6 6-6 6" />
  </IconBase>
);

// Trigger.
export const IconBolt = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M13 2L4 14h7l-2 8 9-12h-7l2-8z" />
  </IconBase>
);

export const IconGear = (p: IconProps) => (
  <IconBase {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
  </IconBase>
);

export const IconLoop = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M17 2l4 4-4 4" />
    <path d="M3 11V9a4 4 0 014-4h14" />
    <path d="M7 22l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 01-4 4H3" />
  </IconBase>
);

export const IconSend = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M22 2L11 13" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </IconBase>
);

export const IconTrendUp = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M3 3v18h18" />
    <path d="M7 14l4-4 3 3 5-6" />
    <path d="M18 7h2v2" />
  </IconBase>
);

export const IconDatabase = (p: IconProps) => (
  <IconBase {...p}>
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
  </IconBase>
);

export const IconPlug = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M9 2v6M15 2v6M7 8h10v2a5 5 0 01-10 0V8zM12 15v7" />
  </IconBase>
);

export const IconQuote = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M6 12H4a1 1 0 01-1-1V8a2 2 0 012-2h2a1 1 0 011 1v7c0 2-1 3.5-3 4M15 12h-2a1 1 0 01-1-1V8a2 2 0 012-2h2a1 1 0 011 1v7c0 2-1 3.5-3 4" />
  </IconBase>
);

// The studio mark — a simple friendly duck head.
export const IconDuck = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M4 13.5a6.5 6.5 0 0111.9-3.6H20a1 1 0 01.8 1.6L18.5 14a6.5 6.5 0 01-12.9 1" />
    <path d="M16 8.2h.01" />
    <path d="M6 17c1.6 1.3 4 2 6.5 2S17 18.3 18 17" />
  </IconBase>
);
