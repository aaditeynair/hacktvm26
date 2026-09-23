/**
 * HackTVM'26 — Access Point
 * Phase-linked color theme.
 *
 * One color stop per scroll phase (0 = Overview → 4 = Key). The blob's halo
 * glow interpolates between adjacent stops as the SAME progress value that
 * already drives the blob morph crosses each phase band — no second progress
 * source anywhere. The aurora background (components/AuroraBackground.tsx)
 * shares the palette but is scroll-independent (identical on every section);
 * the halo is the only phase-drifted surface.
 *
 * Arc: bright light-blue → saturated blue → soft indigo → violet → deep
 * purple. Monotonic bright → deep → dim, so ambient energy drains as the blob
 * resolves and Phase 4 (the settled key) reads calm and stable against the
 * cream key logo.
 */

/** One stop per phase, in EXACTLY scroll order. */
export const PHASE_COLORS = [
  "#81B7D3", // 0 Overview — light blue, bright + alive
  "#4B7CD3", // 1 Theme — saturated blue, gathering
  "#5C6FC7", // 2 Format — soft indigo, mid resolve
  "#603DB6", // 3 Timeline — violet, deepening
  "#340A61", // 4 Key — deep purple, dim + calm (settled)
] as const;

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

/**
 * Interpolate the halo color across 0..1 progress, in the phase order:
 * Phase 0 → 4. Returns a CSS `rgb(r g b)` string.
 * `snap` (reduced motion) returns the pure current-phase stop instead of an
 * in-phase blend, so a phase change is instant.
 */
export function ambientColorForProgress(progress: number, snap = false): string {
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

  return `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})`;
}