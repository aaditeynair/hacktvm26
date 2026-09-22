/**
 * HackTVM'26 — Access Point
 * Phase-linked ambient color theme.
 *
 * One color stop per scroll phase (0 = Overview → 4 = Key). The blob's halo
 * glow and the page's ambient background tint both interpolate between
 * adjacent stops as the SAME progress value that already drives the blob morph
 * crosses each phase band — no second progress source anywhere.
 *
 * Arc: bright light-blue → saturated blue → soft indigo → violet → deep
 * purple. Monotonic bright → deep → dim, so ambient energy drains as the blob
 * resolves and Phase 4 (the settled key) reads calm and stable against the
 * cream key logo.
 *
 * FIRST PASS — all values are verbatim from lib/constants.ts COLORS so they
 * are easy to swap if the arc feels off. Alternative arcs: (a) end on pale
 * cream (#E9E4C9, the GRADIENT_STOPS tail) instead of deep purple so the key
 * phase is "less saturated"; (b) make Phase 2 #4B2E6F (brand purple) instead
 * of indigo.
 */

/** One stop per phase, in EXACTLY scroll order. */
export const PHASE_COLORS = [
  "#81B7D3", // 0 Overview — light blue, bright + alive
  "#4B7CD3", // 1 Theme — saturated blue, gathering
  "#5C6FC7", // 2 Format — soft indigo, mid resolve
  "#603DB6", // 3 Timeline — violet, deepening
  "#340A61", // 4 Key — deep purple, dim + calm (settled)
] as const;

/** Alpha of the background tint layer that sits behind all content. */
export const AMBIENT_TINT_ALPHA = 0.14;

const NUM_PHASES = PHASE_COLORS.length;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

export interface AmbientColor {
  /** Halo fill as a CSS `rgb()` string. */
  halo: string;
  /** Background tint as a CSS `rgba()` string (alpha already applied). */
  tint: string;
}

/**
 * Interpolate the ambient colors for a 0..1 progress.
 * `snap` (reduced motion) returns the pure current-phase stop instead of an
 * in-phase blend, so color changes at a phase boundary are instant.
 */
export function ambientColorForProgress(
  progress: number,
  snap = false,
): AmbientColor {
  const p = Math.min(1, Math.max(0, progress));
  const phase = Math.min(NUM_PHASES - 1, Math.floor(p * NUM_PHASES));

  let rgb: [number, number, number];
  if (snap) {
    rgb = hexToRgb(PHASE_COLORS[phase]);
  } else {
    const band = 1 / NUM_PHASES;
    const t = (p - phase * band) / band;
    const next = PHASE_COLORS[Math.min(NUM_PHASES - 1, phase + 1)];
    rgb = mixRgb(hexToRgb(PHASE_COLORS[phase]), hexToRgb(next), t);
  }

  return {
    halo: `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})`,
    tint: `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${AMBIENT_TINT_ALPHA})`,
  };
}

/** Phase-0 tint for the pre-hydration `:root` fallback in globals.css. */
export const INITIAL_AMBIENT_TINT = (() => {
  const rgb = hexToRgb(PHASE_COLORS[0]);
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${AMBIENT_TINT_ALPHA})`;
})();