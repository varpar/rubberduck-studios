"use client";

import { useEffect, useRef } from "react";

type GameOfLifeProps = {
  /** Band height in CSS pixels, or fill the containing element. */
  height?: number | "fill";
  /** Size of a single cell in CSS pixels. */
  cell?: number;
  /** Draw only at the left/right edges, reserving the centre for footer copy. */
  mode?: "full" | "edges";
  className?: string;
};

const ALIVE = "#ffffff";
const GAP = 3; // A small gutter keeps the oversized cells distinct.
const STEP_MS = 1400; // Hold each generation long enough for the pattern to read.
const FADE_RESPONSE = 1.55; // Let cells drift into their next state instead of popping.
const RESEED_MS = 24000; // Allow the slowly evolving pattern to settle before reseeding.
const RESEED_DENSITY = 0.28; // ~28% cells alive on seed
const MIN_ALIVE_RATIO = 0.03; // reseed if population drops below ~3%

/**
 * Conway's Game of Life on a toroidal grid, drawn as chunky white blocks.
 * Runs on rAF with a time accumulator, pauses off-screen, and honours
 * prefers-reduced-motion (single static frame, no loop).
 */
export function GameOfLife({
  height = 168,
  cell = 16,
  mode = "full",
  className,
}: GameOfLifeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Grid state, sized on resize.
    let cols = 0;
    let rows = 0;
    let grid: Uint8Array = new Uint8Array(0);
    let next: Uint8Array = new Uint8Array(0);
    let display: Float32Array = new Float32Array(0);
    const currentHeight = () =>
      height === "fill" ? canvas.clientHeight || 1 : height;

    const seed = () => {
      for (let i = 0; i < grid.length; i++) {
        grid[i] = Math.random() < RESEED_DENSITY ? 1 : 0;
      }
    };

    const idx = (c: number, r: number) => r * cols + c;

    // One Conway generation. Toroidal wrap on all four edges.
    const step = () => {
      for (let r = 0; r < rows; r++) {
        const up = (r - 1 + rows) % rows;
        const down = (r + 1) % rows;
        for (let c = 0; c < cols; c++) {
          const left = (c - 1 + cols) % cols;
          const right = (c + 1) % cols;
          const n =
            grid[idx(left, up)] +
            grid[idx(c, up)] +
            grid[idx(right, up)] +
            grid[idx(left, r)] +
            grid[idx(right, r)] +
            grid[idx(left, down)] +
            grid[idx(c, down)] +
            grid[idx(right, down)];
          const alive = grid[idx(c, r)] === 1;
          // Live cell survives on 2–3 neighbours; dead cell born on exactly 3.
          next[idx(c, r)] = alive ? (n === 2 || n === 3 ? 1 : 0) : n === 3 ? 1 : 0;
        }
      }
      const tmp = grid;
      grid = next;
      next = tmp;
    };

    const population = () => {
      let sum = 0;
      for (let i = 0; i < grid.length; i++) sum += grid[i];
      return sum;
    };

    const draw = () => {
      const w = canvas.clientWidth;
      const h = currentHeight();
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = ALIVE;
      const size = cell - GAP;
      const edgeColumns = Math.max(1, Math.floor(cols * 0.28));
      const softenedRows = Math.max(1, Math.ceil(rows * 0.22));
      for (let r = 0; r < rows; r++) {
        // The pattern feels as if it dissolves into the page at the top rather
        // than arriving on a hard rectangular edge.
        const topProgress = Math.min(1, r / softenedRows);
        const topAlpha = 0.2 + topProgress * 0.8;
        const blur = (1 - topProgress) * 2.2;
        ctx.filter = blur > 0.05 ? `blur(${blur}px)` : "none";
        for (let c = 0; c < cols; c++) {
          const cellAlpha = display[idx(c, r)];
          if (cellAlpha > 0.01) {
            let alpha = cellAlpha * topAlpha;
            if (mode === "edges") {
              const edgeDistance = Math.min(c, cols - 1 - c);
              if (edgeDistance >= edgeColumns) continue;
              // The pattern gently recedes before the centre gap instead of
              // ending as a hard digital wall behind the headline.
              alpha *= 0.35 + 0.65 * (1 - edgeDistance / edgeColumns);
            }
            ctx.globalAlpha = alpha;
            ctx.fillRect(c * cell, r * cell, size, size);
          }
        }
      }
      ctx.filter = "none";
      ctx.globalAlpha = 1;
    };

    const blendDisplay = (deltaMs: number) => {
      const blend = 1 - Math.exp((-deltaMs / 1000) * FADE_RESPONSE);
      for (let i = 0; i < display.length; i++) {
        display[i] += (grid[i] - display[i]) * blend;
      }
    };

    // (Re)size the backing store DPR-aware and rebuild the grid.
    const resize = () => {
      const w = canvas.clientWidth || 0;
      const h = currentHeight();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.max(1, Math.ceil(w / cell));
      rows = Math.max(1, Math.ceil(h / cell));
      grid = new Uint8Array(cols * rows);
      next = new Uint8Array(cols * rows);
      display = new Float32Array(cols * rows);
      seed();
      draw();
    };

    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    const sizeObserver =
      height === "fill" && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(resize)
        : null;
    sizeObserver?.observe(canvas);

    // Reduced motion: one static frame, no animation, no observers.
    if (reduceMotion) {
      display.set(grid);
      draw();
      return () => {
        sizeObserver?.disconnect();
        window.removeEventListener("resize", onResize);
      };
    }

    let rafId = 0;
    let running = false;
    let acc = 0;
    let sinceReseed = 0;
    let last = 0;

    const loop = (now: number) => {
      if (!running) return;
      const dt = last ? now - last : 0;
      last = now;
      acc += dt;
      sinceReseed += dt;

      // Conway remains discrete, but its visual state eases to the next
      // generation every frame. New cells glow in and dying ones melt away.
      blendDisplay(dt);

      while (acc >= STEP_MS) {
        step();
        acc -= STEP_MS;
        // Keep it lively: reseed on collapse or on a timer, since Conway
        // tends to settle into still-lifes / oscillators.
        if (
          population() < grid.length * MIN_ALIVE_RATIO ||
          sinceReseed >= RESEED_MS
        ) {
          seed();
          sinceReseed = 0;
        }
      }
      draw();
      rafId = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = 0;
      rafId = requestAnimationFrame(loop);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(rafId);
    };

    // Only animate while the band is on-screen.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) start();
        else stop();
      },
      { threshold: 0 },
    );
    observer.observe(canvas);

    return () => {
      stop();
      observer.disconnect();
      sizeObserver?.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [height, cell, mode]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`block w-full${className ? ` ${className}` : ""}`}
      style={{ height: height === "fill" ? "100%" : height }}
    />
  );
}
