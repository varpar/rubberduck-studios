"use client";

import gsap from "gsap";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { nav, useContentVisible, type PageView } from "../_state/navigation";
import { BlurInText } from "./BlurInText";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ==========================================================================
 * PageContent — the full-bleed "reel".
 *
 * Once a page docks (the duck family blurs out of the water, the little
 * rotating duck takes over the navbar), the whole viewport below the nav is
 * free real estate. Each page is a horizontal REEL of tall panels you read
 * left → right like the chapters of a short story.
 *
 * Scroll model: the reel is a native horizontal scroller (so trackpad + touch
 * drag keep working), PLUS a wheel handler that turns *vertical* mouse-wheel
 * into horizontal motion, eased with GSAP. Scroll down → the story advances.
 * ======================================================================== */

export function PageContent() {
  // `visible` is the TARGET page (or null). Between two pages it passes through
  // null — matching the duck's swim — so the old page can blur out, the swim
  // plays, then the new page blurs in.
  const visible = useContentVisible();
  // `rendered` is what's actually MOUNTED. It lags `visible` during a blur-out
  // so the leaving reel stays on screen long enough to animate away (React
  // would otherwise unmount it instantly, which is why cards used to just
  // vanish).
  const [rendered, setRendered] = useState<PageView | null>(visible);
  const hostRef = useRef<HTMLDivElement>(null);

  // Blur the current reel OUT, then swap `rendered` to the target. If nothing
  // is mounted yet, swap straight away (the enter effect handles the blur-in).
  useEffect(() => {
    if (visible === rendered) return;
    const host = hostRef.current;

    if (rendered !== null && host) {
      const panels = host.querySelectorAll<HTMLElement>("[data-panel]");
      if (prefersReducedMotion() || panels.length === 0) {
        setRendered(visible);
        return;
      }
      // Staggered blur-out. overwrite guards against a fast re-navigation
      // interrupting a still-running enter.
      gsap.to(panels, {
        opacity: 0,
        filter: "blur(12px)",
        y: -14,
        duration: 0.4,
        ease: "power2.in",
        stagger: 0.05,
        overwrite: true,
        onComplete: () => setRendered(visible),
      });
    } else {
      setRendered(visible);
    }
  }, [visible, rendered]);

  // Blur the freshly-mounted reel IN, one card after another. useLayoutEffect
  // sets the hidden "from" state before paint so there's no flash.
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || rendered === null) return;
    const panels = host.querySelectorAll<HTMLElement>("[data-panel]");
    if (panels.length === 0) return;

    if (prefersReducedMotion()) {
      gsap.set(panels, { opacity: 1, filter: "blur(0px)", y: 0 });
      return;
    }
    gsap.fromTo(
      panels,
      { opacity: 0, filter: "blur(12px)", y: 16 },
      {
        opacity: 1,
        filter: "blur(0px)",
        y: 0,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.08,
      },
    );
  }, [rendered]);

  return (
    // Spans the viewport from just under the navbar to just above the footer.
    // pointer-events-none so the empty gaps never steal clicks from the scene;
    // the scroller itself re-enables them.
    <div className="pointer-events-none fixed inset-x-0 top-[5.75rem] bottom-6 z-10">
      <div ref={hostRef} aria-hidden={!rendered} className="h-full">
        {/* key remounts the reel per navigation so the entrance replays and the
            scroll position resets to the first chapter. */}
        {rendered === "projects" && <ProjectsReel key="projects" />}
        {rendered === "about" && <AboutReel key="about" />}
        {rendered === "contact" && <ContactReel key="contact" />}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Reel — the scroll engine                          */
/* -------------------------------------------------------------------------- */

function Reel({ children }: { children: ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  // Where GSAP is currently steering scrollLeft toward, so rapid wheel ticks
  // accumulate onto the intended target instead of the mid-tween position.
  const targetRef = useRef(0);
  const tweeningRef = useRef(false);

  useEffect(() => {
    // Typed non-null so the nested closures below keep the narrowing (flow
    // narrowing on `viewportRef.current` wouldn't survive into them).
    const vp: HTMLDivElement | null = viewportRef.current;
    if (!vp) return;
    const el: HTMLDivElement = vp;

    const maxScroll = () => el.scrollWidth - el.clientWidth;

    function onWheel(e: WheelEvent) {
      const max = maxScroll();
      if (max <= 1) return; // nothing to scroll — let the page be
      // Take whichever axis the user actually moved. A vertical wheel (mouse)
      // and a horizontal swipe (trackpad) both drive the reel forward.
      const delta =
        Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (!delta) return;
      e.preventDefault();
      const base = tweeningRef.current ? targetRef.current : el.scrollLeft;
      const next = Math.max(0, Math.min(max, base + delta * 1.15));
      targetRef.current = next;
      gsap.to(el, {
        scrollLeft: next,
        duration: 0.6,
        ease: "power2.out",
        overwrite: true,
        onStart: () => {
          tweeningRef.current = true;
        },
        onComplete: () => {
          tweeningRef.current = false;
        },
      });
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      gsap.killTweensOf(el);
    };
  }, []);

  return (
    <div
      ref={viewportRef}
      className="reel pointer-events-auto h-full overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {/* The big left gutter parks the first card on the RIGHT half at rest, so
          the duck docked at screen-left stays uncovered. Scrolling the reel
          slides the cards leftward over it — reinforcing that the duck is still
          sitting there in the water. */}
      <div className="flex h-full items-stretch gap-6 pr-[14vw] pl-[44vw]">
        {children}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Panel + content primitives                        */
/* -------------------------------------------------------------------------- */

type Tone = "glass" | "dark";
type Width = "cover" | "wide" | "normal";

// One tall chapter card. Three visual registers keep the reel from reading as
// an identical carousel: a `cover` opener, `glass` body cards with a giant
// ghosted chapter number, and a `dark` panel for the story beats + CTAs where
// the yellow accent gets to pop.
function Panel({
  index,
  ghost,
  tone = "glass",
  width = "normal",
  children,
}: {
  index: number;
  ghost?: string;
  tone?: Tone;
  width?: Width;
  children: ReactNode;
}) {
  const widthCls =
    width === "cover"
      ? "w-[86vw] max-w-[560px]"
      : width === "wide"
        ? "w-[84vw] max-w-[500px]"
        : "w-[80vw] max-w-[400px]";
  const toneCls =
    tone === "dark"
      ? "bg-zinc-900 text-white ring-white/10"
      : "bg-white/85 text-zinc-900 ring-white/60";

  return (
    <article
      // data-panel: the enter/exit choreography in PageContent queries these to
      // stagger the blur-in / blur-out. data-index is kept for debugging order.
      data-panel
      data-index={index}
      className={
        "group relative flex h-full shrink-0 flex-col overflow-hidden rounded-[2rem] p-9 shadow-[0_28px_80px_-28px_rgba(9,38,59,0.55)] ring-1 backdrop-blur-xl sm:p-10 " +
        widthCls +
        " " +
        toneCls
      }
    >
      {/* material highlight along the top edge — reads as light catching glass */}
      <span
        aria-hidden
        className={
          "pointer-events-none absolute inset-x-0 top-0 h-28 " +
          (tone === "dark"
            ? "bg-gradient-to-b from-white/10 to-transparent"
            : "bg-gradient-to-b from-white/60 to-transparent")
        }
      />
      {ghost && (
        <span
          aria-hidden
          className={
            "font-heading pointer-events-none absolute -top-8 -right-3 leading-none font-extrabold select-none " +
            "text-[11rem] " +
            (tone === "dark" ? "text-white/[0.06]" : "text-zinc-900/[0.05]")
          }
        >
          {ghost}
        </span>
      )}
      <div className="relative flex h-full flex-col">{children}</div>
    </article>
  );
}

function Dot({ className = "h-2.5 w-2.5" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={"inline-block shrink-0 rounded-full bg-yellow-400 " + className}
    />
  );
}

// Tiny uppercase role tag. The one place (besides eyebrows) uppercase is used
// on purpose — a deliberate typographic token, not the old forced-caps hack.
function Kicker({
  children,
  dark = false,
}: {
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <span
      className={
        "flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] uppercase " +
        (dark ? "text-white/60" : "text-zinc-500")
      }
    >
      <Dot className="h-1.5 w-1.5" />
      {children}
    </span>
  );
}

// A headline. When `reveal` is set and the children are a plain string, the
// text is handed to BlurInText for the per-character blur reveal — "mount" for
// on-screen cover headlines, "inview" for headlines that scroll in from the
// right of the reel. Anything non-string renders as-is.
function Title({
  children,
  className = "text-2xl",
  reveal,
  revealDelay = 0,
}: {
  children: ReactNode;
  className?: string;
  reveal?: "mount" | "inview";
  revealDelay?: number;
}) {
  return (
    <h3
      className={
        // Anton (the tall display face) for every card headline. It's already
        // heavy, so no bold class — that would only faux-bold it.
        "font-display tracking-tight text-[currentColor] " + className
      }
    >
      {reveal && typeof children === "string" ? (
        <BlurInText text={children} trigger={reveal} delay={revealDelay} />
      ) : (
        children
      )}
    </h3>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-900/[0.06] px-2.5 py-1 text-[11px] font-medium text-zinc-600 ring-1 ring-zinc-900/5">
      {children}
    </span>
  );
}

// PrimaryAction — the studio CTA, ported from 21st.dev's "Motion Button"
// (by Shatlyk1011) into this stack: a pill with an accent circle on the left
// holding the arrow, which expands to fill the whole button on hover while the
// label flips to the contrast colour. Pure CSS — no framer-motion / lucide /
// clsx from the original; just Tailwind + an inline arrow SVG. Mapped to the two
// site variants: dark-on-light-cards, and yellow-on-dark-panels.
function PrimaryAction({
  href,
  onClick,
  onDark = false,
  children,
}: {
  href?: string;
  onClick?: () => void;
  onDark?: boolean;
  children: ReactNode;
}) {
  const shell =
    "group/btn relative inline-flex items-center self-start overflow-hidden " +
    "rounded-full p-1 shadow-sm ring-1 transition-shadow duration-200 " +
    "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none " +
    (onDark
      ? "ring-white/15 hover:shadow-md focus-visible:ring-yellow-300 focus-visible:ring-offset-zinc-900"
      : "ring-zinc-900/10 hover:shadow-md focus-visible:ring-yellow-400 focus-visible:ring-offset-white");

  const fill = onDark ? "bg-yellow-400" : "bg-zinc-900";
  const arrow = onDark ? "text-zinc-900" : "text-white";
  const label = onDark
    ? "text-white group-hover/btn:text-zinc-900"
    : "text-zinc-900 group-hover/btn:text-white";

  const inner = (
    <>
      {/* Accent fill: a circle at the left that grows to cover the pill on hover. */}
      <span
        aria-hidden
        className={
          "pointer-events-none absolute top-1 bottom-1 left-1 w-10 rounded-full " +
          "transition-[width] duration-500 ease-out motion-reduce:transition-none " +
          "group-hover/btn:w-[calc(100%-0.5rem)] " +
          fill
        }
      />
      {/* Arrow, centred in the resting circle; nudges right on hover. */}
      <span
        aria-hidden
        className={
          "relative z-10 flex h-10 w-10 items-center justify-center " +
          "transition-transform duration-500 ease-out motion-reduce:transition-none " +
          "group-hover/btn:translate-x-1 " +
          arrow
        }
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
      {/* Label, flips colour so it stays readable once the fill sweeps under it. */}
      <span
        className={
          "relative z-10 pr-5 pl-2 text-sm font-semibold tracking-tight whitespace-nowrap " +
          "transition-colors duration-500 ease-out motion-reduce:transition-none " +
          label
        }
      >
        {children}
      </span>
    </>
  );

  return onClick ? (
    <button type="button" onClick={onClick} className={shell}>
      {inner}
    </button>
  ) : (
    <a href={href} className={shell}>
      {inner}
    </a>
  );
}

function TextLink({
  href,
  external = false,
  children,
}: {
  href: string;
  external?: boolean;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="rounded-sm font-medium text-zinc-900 underline decoration-yellow-400 decoration-2 underline-offset-4 transition-colors hover:decoration-zinc-900 focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:outline-none"
    >
      {children}
    </a>
  );
}

// Live-availability marker: breathing yellow dot + label. Colour is never the
// only signal — the words carry it too.
function LiveDot({ className = "h-2.5 w-2.5" }: { className?: string }) {
  return (
    <span className={"relative flex " + className}>
      <span className="duck-pulse absolute inline-flex h-full w-full rounded-full bg-yellow-400" />
      <span className={"relative inline-flex rounded-full bg-yellow-500 " + className} />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Projects                                  */
/* -------------------------------------------------------------------------- */

type Project = {
  name: string;
  tagline: string;
  stack: string[];
  year: number;
  kind: string;
};

const PROJECTS: Project[] = [
  { name: "Rehearsal", kind: "Web app", tagline: "A quiet practice room for working musicians.", stack: ["React", "Tone.js", "Supabase"], year: 2024 },
  { name: "MAT", kind: "Internal tool", tagline: "Materials Aggregator Tool — every supplier, one search.", stack: ["Next.js", "Postgres", "tRPC"], year: 2024 },
  { name: "NutriPanda", kind: "Mobile app", tagline: "Nutrition tracking that doesn't scold you.", stack: ["React Native", "Expo", "Zod"], year: 2025 },
  { name: "Vikalp", kind: "Platform", tagline: "A platform for the alternative economy.", stack: ["Next.js", "Prisma", "MapLibre"], year: 2025 },
  { name: "Zevar Baksa", kind: "Storefront", tagline: "Heirloom jewellery, sold like a story.", stack: ["Shopify", "Hydrogen", "GSAP"], year: 2026 },
  { name: "Ferry", kind: "Payments", tagline: "Micro-payments for public transit riders.", stack: ["React", "Solid Pay", "PostGIS"], year: 2026 },
  { name: "Yuvraaj", kind: "Web app", tagline: "A bedtime story generator for small humans.", stack: ["Next.js", "Claude", "ElevenLabs"], year: 2026 },
];

function ProjectsReel() {
  return (
    <Reel>
      <Panel index={0} tone="glass" width="cover">
        <Kicker>Selected work</Kicker>
        <div className="flex flex-1 flex-col justify-center">
          <Title
            reveal="mount"
            revealDelay={0.35}
            className="text-[2.75rem] leading-[1.02]"
          >
            {"Small products,\nfinished properly."}
          </Title>
          <p className="mt-5 max-w-[38ch] text-[17px] leading-relaxed text-zinc-600">
            Eight builds — apps, tools and shops for people who cared about the
            details as much as we did. Newest last.
          </p>
        </div>
        <div className="flex items-center gap-3 pt-8 text-sm text-zinc-500">
          <span className="font-heading text-2xl font-bold text-zinc-900">8</span>
          shipped · 2024–2026
        </div>
      </Panel>

      {PROJECTS.map((p, i) => (
        <Panel key={p.name} index={i + 1} tone="glass" ghost={`0${i + 1}`}>
          <div className="flex items-center justify-between">
            <Kicker>Project</Kicker>
            <span className="font-heading text-xs font-semibold tracking-wider text-zinc-400">
              {p.year}
            </span>
          </div>
          {/* Core content floats in the vertical middle so the tall card reads
              as composed, not top-heavy with a hollow bottom. */}
          <div className="flex flex-1 flex-col justify-center py-6">
            <Title reveal="inview" className="text-[1.9rem] leading-tight">
              {p.name}
            </Title>
            <p className="mt-3 text-[15px] leading-relaxed text-zinc-600">
              {p.tagline}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <span aria-hidden className="h-px w-8 bg-zinc-300" />
              <span className="text-xs font-semibold tracking-wide text-zinc-500">
                {p.kind}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {p.stack.map((s) => (
              <Chip key={s}>{s}</Chip>
            ))}
          </div>
        </Panel>
      ))}

      <Panel index={PROJECTS.length + 1} tone="dark" width="wide">
        <Kicker dark>What&apos;s next</Kicker>
        <div className="flex flex-1 flex-col justify-center">
          <Title reveal="inview" className="text-[2.5rem] leading-[1.05]">
            {"Your project,\nnext on this list."}
          </Title>
          <p className="mt-5 max-w-[34ch] text-[16px] leading-relaxed text-white/70">
            We only take on a few at a time. If yours is one of them, we&apos;d
            like to hear what you&apos;re making.
          </p>
        </div>
        <div className="pt-8">
          <PrimaryAction onDark onClick={() => nav.setView("contact")}>
            Start a project
          </PrimaryAction>
        </div>
      </Panel>
    </Reel>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    About                                   */
/* -------------------------------------------------------------------------- */

const CAPABILITIES: { title: string; blurb: string }[] = [
  { title: "Design", blurb: "Product, brand, interface. Considered, never decorative." },
  { title: "Engineering", blurb: "TypeScript-first. Ship-ready. Boring where it matters." },
  { title: "Motion", blurb: "GSAP and React Three Fiber, with a stubborn respect for 60fps." },
];

const TIMELINE: { year: string; event: string }[] = [
  { year: "2020", event: "Started as a two-person freelance shop." },
  { year: "2022", event: "First real product — Rehearsal — went live." },
  { year: "2024", event: "MAT and NutriPanda ship. The studio takes shape." },
  { year: "2025", event: "Vikalp launches. First long-term retainer." },
  { year: "2026", event: "Rubberduck, formally." },
];

const PRINCIPLES: { word: string; note: string }[] = [
  { word: "Small", note: "Few clients, full attention." },
  { word: "Playful", note: "Serious work needn't feel it." },
  { word: "Sharp", note: "Opinionated where it counts." },
  { word: "Signed", note: "We stand behind what we ship." },
];

function AboutReel() {
  return (
    <Reel>
      <Panel index={0} tone="glass" width="cover">
        <Kicker>The studio</Kicker>
        <div className="flex flex-1 flex-col justify-center">
          <Title
            reveal="mount"
            revealDelay={0.35}
            className="text-[2.75rem] leading-[1.02]"
          >
            {"A studio of two,\nby design."}
          </Title>
          <p className="mt-5 max-w-[38ch] text-[17px] leading-relaxed text-zinc-600">
            Rubberduck is a small design and development studio. We take on a
            few things at a time and treat each like the only one.
          </p>
        </div>
        <p className="pt-8 text-sm text-zinc-500">
          We&apos;d rather ship one beautiful thing than three forgettable ones.
        </p>
      </Panel>

      <Panel index={1} tone="glass" ghost="01">
        <Kicker>What we do</Kicker>
        <Title reveal="inview" className="mt-6">
          Three things, well
        </Title>
        <ul className="mt-5 flex flex-col divide-y divide-zinc-200/70">
          {CAPABILITIES.map((c) => (
            <li key={c.title} className="flex flex-col gap-1 py-4 first:pt-0">
              <span className="font-heading text-base font-semibold text-zinc-900">
                {c.title}
              </span>
              <span className="text-sm leading-relaxed text-zinc-600">
                {c.blurb}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel index={2} tone="glass" ghost="02">
        <Kicker>Track record</Kicker>
        <Title reveal="inview" className="mt-6">
          Six years in
        </Title>
        <ol className="mt-5 flex flex-col gap-4">
          {TIMELINE.map((t) => (
            <li key={t.year} className="flex items-start gap-4">
              <span className="font-heading w-12 shrink-0 text-sm font-semibold tracking-wider text-zinc-400">
                {t.year}
              </span>
              <span className="text-sm leading-relaxed text-zinc-700">
                {t.event}
              </span>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel index={3} tone="glass" ghost="03">
        <Kicker>The promise</Kicker>
        <Title reveal="inview" className="mt-6">
          Four words we check
        </Title>
        <ul className="mt-5 flex flex-col divide-y divide-zinc-200/70">
          {PRINCIPLES.map((p) => (
            <li key={p.word} className="flex items-baseline gap-4 py-3 first:pt-0">
              <span className="font-heading w-24 shrink-0 text-xl font-semibold text-zinc-900">
                {p.word}
              </span>
              <span className="text-sm leading-relaxed text-zinc-600">
                {p.note}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-auto pt-6 text-sm text-zinc-500">
          We run this list before anything ships.
        </p>
      </Panel>

      {/* The story beat — where the name comes from. */}
      <Panel index={4} tone="dark" width="wide">
        <Kicker dark>The name</Kicker>
        <div className="flex flex-1 flex-col justify-center">
          <Title reveal="inview" className="text-[2.4rem] leading-[1.05]">
            Why a rubber duck?
          </Title>
          <p className="mt-5 text-[16px] leading-relaxed text-white/75">
            There&apos;s an old trick: when you&apos;re stuck, explain the
            problem out loud to a rubber duck on your desk. Halfway through, the
            answer shows up — because someone finally said it plainly.
          </p>
          <p className="mt-4 text-[16px] leading-relaxed text-white/75">
            That&apos;s the whole job. We&apos;re the duck you talk to until the
            thing you&apos;re building starts to make sense — then we go and
            build it.
          </p>
        </div>
        <p className="font-heading pt-8 text-sm font-semibold tracking-wide text-yellow-400">
          Small. Playful. Sharp. Signed.
        </p>
      </Panel>
    </Reel>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Contact                                  */
/* -------------------------------------------------------------------------- */

const SOCIALS: { label: string; href: string }[] = [
  { label: "Twitter", href: "#" },
  { label: "GitHub", href: "#" },
  { label: "LinkedIn", href: "#" },
  { label: "Dribbble", href: "#" },
];

const FAQ: { q: string; a: string }[] = [
  { q: "Do you take on small projects?", a: "Yes — a well-scoped small project is often the best kind." },
  { q: "What does an engagement look like?", a: "Usually 4–12 weeks, fixed-fee, with one main contact on our end." },
  { q: "Do you work with early-stage startups?", a: "Yes, if the idea is honest and the founder is decisive." },
  { q: "Where are you based?", a: "India — we work with teams anywhere within ±6 hours of IST." },
];

function ContactReel() {
  return (
    <Reel>
      <Panel index={0} tone="glass" width="cover">
        <Kicker>Say hello</Kicker>
        <div className="flex flex-1 flex-col justify-center">
          <Title
            reveal="mount"
            revealDelay={0.35}
            className="text-[2.75rem] leading-[1.02]"
          >
            {"Let's build\nsomething."}
          </Title>
          <p className="mt-5 max-w-[36ch] text-[17px] leading-relaxed text-zinc-600">
            One email is all it takes. Tell us what you&apos;re stuck on or
            dreaming up — we reply within a day or two.
          </p>
        </div>
        <div className="flex flex-col gap-5 pt-8">
          <span className="flex items-center gap-2.5 text-sm text-zinc-600">
            <LiveDot className="h-2 w-2" />
            Booking Q3 2026 — two slots open
          </span>
          <PrimaryAction href="mailto:hello@rubberduck.studio">
            Email hello@rubberduck.studio
          </PrimaryAction>
        </div>
      </Panel>

      <Panel index={1} tone="glass" ghost="01">
        <Kicker>Other ways in</Kicker>
        <Title reveal="inview" className="mt-6">
          Prefer to talk?
        </Title>
        <p className="mt-3 text-[15px] leading-relaxed text-zinc-600">
          Grab 20 minutes at{" "}
          <TextLink href="#">rubberduck.studio/chat</TextLink>, or find us here —
          we&apos;re quiet on socials, but we do reply.
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-8">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              className="inline-flex items-center rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white ring-1 ring-zinc-900/10 transition-colors hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:outline-none"
            >
              {s.label}
            </a>
          ))}
        </div>
      </Panel>

      <Panel index={2} tone="glass" ghost="02">
        <Kicker>Availability</Kicker>
        <div className="mt-6 flex items-center gap-2.5">
          <LiveDot />
          <Title reveal="inview" className="text-xl">
            Booking Q3 2026
          </Title>
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-zinc-600">
          Two engagement slots are open. New work starts in{" "}
          <span className="font-semibold text-zinc-900">August</span>.
        </p>
        <p className="mt-auto pt-8 text-sm text-zinc-500">
          Typically 4–12 weeks. Fixed fee, no surprises.
        </p>
      </Panel>

      <Panel index={3} tone="glass" ghost="03">
        <Kicker>Good to know</Kicker>
        <Title reveal="inview" className="mt-6">
          Common questions
        </Title>
        <ul className="mt-5 flex flex-col divide-y divide-zinc-200/70">
          {FAQ.map((item) => (
            <li key={item.q} className="flex flex-col gap-1.5 py-3.5 first:pt-0">
              <span className="flex items-start gap-2">
                <Dot className="mt-1.5 h-1.5 w-1.5" />
                <span className="font-heading text-sm font-semibold text-zinc-900">
                  {item.q}
                </span>
              </span>
              <span className="pl-3.5 text-sm leading-relaxed text-zinc-600">
                {item.a}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel index={4} tone="dark" width="wide">
        <Kicker dark>Ready?</Kicker>
        <div className="flex flex-1 flex-col justify-center">
          <Title reveal="inview" className="text-[2.5rem] leading-[1.05]">
            {"Send the first\nmessage."}
          </Title>
          <p className="mt-5 max-w-[32ch] text-[16px] leading-relaxed text-white/70">
            No forms, no funnels. Just tell us what you&apos;re making and where
            you&apos;re stuck.
          </p>
        </div>
        <div className="pt-8">
          <PrimaryAction onDark href="mailto:hello@rubberduck.studio">
            Email the studio
          </PrimaryAction>
        </div>
      </Panel>
    </Reel>
  );
}

// PageView is re-exported so downstream callers (Nav, DuckFamily) can share the
// same type name without importing from the state module directly.
export type { PageView };
