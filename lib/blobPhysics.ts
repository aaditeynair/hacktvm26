/**
 * HackTVM'26 — Access Point
 * Blob physics engine — polar control-point system with simplex noise
 * idle animation, spring-damped cursor repulsion, and Catmull-Rom path
 * generation.
 *
 * Architecture:
 *   1. Each blob shape is pre-sampled into 12 radii (boundary distance
 *      from centre at evenly-spaced angles) using an offscreen canvas.
 *   2. At runtime, base radii are linearly interpolated between section
 *      shapes based on morph progress.
 *   3. Simplex 3D noise displaces each radius for organic idle undulation.
 *   4. Spring-damped physics repels points away from the cursor with a
 *      smoothstep falloff, creating liquid slosh/bounce-back.
 *   5. The final point positions are converted to a smooth SVG path via
 *      Catmull-Rom → cubic Bézier conversion.
 *
 * All per-frame work operates on pre-allocated arrays — zero allocations
 * in the animation loop.
 */

import { createNoise3D, type NoiseFunction3D } from "simplex-noise";

/* ---------- Constants ---------- */

/** Number of polar anchor points (evenly spaced around 360°). */
export const NUM_POINTS = 12;

/** SVG viewBox centre coordinate. */
const CX = 100;
const CY = 100;

/** Max possible radius for binary search (half of viewBox). */
const MAX_RADIUS = 100;

/* ---------- Types ---------- */

/** State for a single anchor point. */
export interface BlobPoint {
  /** Current rendered position. */
  x: number;
  y: number;
  /** Base position (from section morphing, before noise/repel). */
  baseX: number;
  baseY: number;
  /** Spring velocity for cursor repel displacement. */
  vx: number;
  vy: number;
}

/** Persistent spring state for cursor repel (shared across all points). */
export interface RepelSpring {
  /** Per-point displacement accumulators (indexed same as points array). */
  dx: Float64Array;
  dy: Float64Array;
  /** Per-point velocity accumulators. */
  vx: Float64Array;
  vy: Float64Array;
}

/** Configuration for cursor repel physics. */
export interface RepelConfig {
  stiffness: number;
  damping: number;
  influenceRadius: number;
  maxDisplacement: number;
}

/** Configuration for idle noise animation. */
export interface IdleConfig {
  speed: number;
  amplitude: number;
  zSpeed: number;
}

/* ====================================================================
   Pre-sampling: SVG path → radii via offscreen canvas
   ==================================================================== */

/**
 * Sample boundary radii from an SVG path string using an offscreen canvas
 * and binary search.
 *
 * For each of `NUM_POINTS` evenly-spaced angles, we march a ray from the
 * centre outward and find the boundary using `ctx.isPointInPath()`.
 *
 * @param pathD  SVG path `d` attribute (cubic Bézier, closed, 200×200 space).
 * @returns      Array of NUM_POINTS radii (distance from centre to boundary).
 */
export function sampleRadiiFromPath(pathD: string): number[] {
  /* Create offscreen canvas matching SVG viewBox */
  const size = 200;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const path = new Path2D(pathD);

  const radii: number[] = new Array(NUM_POINTS);

  for (let i = 0; i < NUM_POINTS; i++) {
    const angle = (i / NUM_POINTS) * Math.PI * 2 - Math.PI / 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    /* Binary search: find largest radius where point is inside the path */
    let lo = 0;
    let hi = MAX_RADIUS;
    for (let iter = 0; iter < 16; iter++) {
      const mid = (lo + hi) / 2;
      const px = CX + cosA * mid;
      const py = CY + sinA * mid;
      if (ctx.isPointInPath(path, px, py)) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    radii[i] = (lo + hi) / 2;
  }

  return radii;
}

/* ---------- Radius interpolation ---------- */

/**
 * Linearly interpolate between two radius arrays.
 * Mutates and returns `out` for zero allocation in the hot loop.
 */
export function lerpRadii(
  from: number[],
  to: number[],
  t: number,
  out: number[],
): void {
  const inv = 1 - t;
  for (let i = 0; i < from.length; i++) {
    out[i] = from[i] * inv + to[i] * t;
  }
}

/* ====================================================================
   Point generation from radii
   ==================================================================== */

/**
 * Convert an array of radii into BlobPoint objects.
 * Angles start at -π/2 (top of circle) and go clockwise, matching
 * the visual orientation of the blob shapes.
 */
export function radiiToBasePoints(radii: number[]): { x: number; y: number }[] {
  const points = new Array<{ x: number; y: number }>(radii.length);
  for (let i = 0; i < radii.length; i++) {
    const angle = (i / radii.length) * Math.PI * 2 - Math.PI / 2;
    points[i] = {
      x: CX + Math.cos(angle) * radii[i],
      y: CY + Math.sin(angle) * radii[i],
    };
  }
  return points;
}

/* ====================================================================
   Idle: simplex 3D noise displacement
   ==================================================================== */

/**
 * Create a new simplex noise instance (3D).
 * Must be called once at init — not per frame.
 */
export function createIdleNoise(): NoiseFunction3D {
  return createNoise3D();
}

/**
 * Apply simplex 3D noise displacement to points for organic idle animation.
 *
 * Each point is displaced radially along its angle from centre. The noise
 * input is (cos(θ), sin(θ), time) so adjacent points get correlated but
 * not identical offsets, creating a smooth undulating surface.
 *
 * Mutates `points` in-place.
 */
export function applyNoiseIdle(
  points: BlobPoint[],
  time: number,
  noise: NoiseFunction3D,
  config: IdleConfig,
): void {
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const t = time * config.zSpeed;

    /* 3D noise: spatial (cos, sin) + temporal (t) */
    const nx = noise(cosA, sinA, t);

    /* Displace radially (along the direction from centre to point) */
    points[i].x = points[i].baseX + cosA * nx * config.amplitude;
    points[i].y = points[i].baseY + sinA * nx * config.amplitude;
  }
}

/* ====================================================================
   Cursor repel: spring-damped displacement
   ==================================================================== */

/**
 * Create persistent repel spring state (zero-initialised).
 * Allocate once at component mount.
 */
export function createRepelSpring(): RepelSpring {
  const n = NUM_POINTS;
  return {
    dx: new Float64Array(n),
    dy: new Float64Array(n),
    vx: new Float64Array(n),
    vy: new Float64Array(n),
  };
}

/**
 * Apply spring-damped cursor repulsion to each anchor point.
 *
 * Points within `influenceRadius` of the cursor are pushed away. The
 * force uses smoothstep² falloff. Each point has its own spring that
 * yields smoothly when pushed and bounces back when the cursor moves
 * away, creating liquid momentum.
 *
 * Mutates `spring.dx/dy/vx/vy` in-place. Displacements are added to
 * each point's (x, y) after this call.
 */
export function applyCursorRepel(
  points: BlobPoint[],
  cursorX: number,
  cursorY: number,
  spring: RepelSpring,
  config: RepelConfig,
  dt: number,
): void {
  const n = points.length;
  const dtMs = dt * 1000; /* convert seconds → ms for frame-independent spring */
  const stiffDt = config.stiffness * dtMs;
  const dampFactor = Math.pow(config.damping, dtMs);

  for (let i = 0; i < n; i++) {
    const bx = points[i].baseX;
    const by = points[i].baseY;
    const dx = bx - cursorX;
    const dy = by - cursorY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    /* Target displacement: push away from cursor */
    let targetDX = 0;
    let targetDY = 0;

    if (dist < config.influenceRadius && dist > 0.1) {
      /* Smoothstep² falloff: force = (1 - d/r)^2 */
      const t = 1 - dist / config.influenceRadius;
      const force = t * t * config.maxDisplacement;
      const invDist = 1 / dist;
      targetDX = dx * invDist * force;
      targetDY = dy * invDist * force;
    }

    /* Spring integration (semi-implicit Euler) */
    const sax = (targetDX - spring.dx[i]) * stiffDt;
    const say = (targetDY - spring.dy[i]) * stiffDt;
    spring.vx[i] = (spring.vx[i] + sax) * dampFactor;
    spring.vy[i] = (spring.vy[i] + say) * dampFactor;
    spring.dx[i] += spring.vx[i] * dtMs;
    spring.dy[i] += spring.vy[i] * dtMs;

    /* Apply displacement to point */
    points[i].x += spring.dx[i];
    points[i].y += spring.dy[i];
  }
}

/* ====================================================================
   Path generation: Catmull-Rom → cubic Bézier
   ==================================================================== */

/**
 * Convert an array of BlobPoint positions into a smooth closed SVG path
 * using Catmull-Rom → cubic Bézier conversion.
 *
 * The tension parameter controls smoothness:
 *   - Lower values → smoother, rounder curves
 *   - Higher values → tighter, more angular curves
 *
 * @param points  Array of BlobPoint objects with current (x, y) positions.
 * @param tension  Catmull-Rom tension (default 6, which gives smooth organic curves).
 * @returns        SVG path `d` attribute string.
 */
export function pointsToSmoothPath(
  points: BlobPoint[],
  tension: number = 6,
): string {
  const n = points.length;
  if (n === 0) return "";

  const parts: string[] = [`M${fmt(points[0].x)},${fmt(points[0].y)}`];

  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    /* Catmull-Rom → cubic Bézier control points */
    const invT = 1 / tension;
    const cp1x = p1.x + (p2.x - p0.x) * invT;
    const cp1y = p1.y + (p2.y - p0.y) * invT;
    const cp2x = p2.x - (p3.x - p1.x) * invT;
    const cp2y = p2.y - (p3.y - p1.y) * invT;

    parts.push(
      `C${fmt(cp1x)},${fmt(cp1y)} ${fmt(cp2x)},${fmt(cp2y)} ${fmt(p2.x)},${fmt(p2.y)}`,
    );
  }

  parts.push("Z");
  return parts.join(" ");
}

/* ---------- Formatting ---------- */

/** Format a number to 2 decimal places (strips trailing zeros). */
function fmt(n: number): string {
  return Number(n.toFixed(2)).toString();
}
