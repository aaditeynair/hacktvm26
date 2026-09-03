/**
 * HackTVM'26 — Access Point
 * Central constants: colors, section configuration, dates, animation durations.
 */

/* ---------- Color Tokens ---------- */
export const COLORS = {
  purple: "#4B2E6F",
  blue: "#5C6FC7",
  cream: "#E9E4C9",
  black: "#000000",
  white: "#ffffff",
  grayDim: "#444444",
  grayMid: "#888888",
  grayLight: "#cccccc",
} as const;

/* ---------- Section IDs (in scroll order) ---------- */
export const SECTION_IDS = [
  "overview",
  "theme",
  "format",
  "timeline",
  "key",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

/** Human-readable labels for each section (used in aria-labels and dot nav). */
export const SECTION_LABELS: Record<SectionId, string> = {
  overview: "Overview",
  theme: "Theme",
  format: "Event Format",
  timeline: "Timeline & Registration",
  key: "The Key",
};

/* ---------- Deadline ---------- */
export const DEADLINE = new Date("2026-10-10T00:00:00");

/* ---------- Morph Progress ----------
 * Maps each section index to a flubber interpolation t value (0 = blob, 1 = keycap).
 * The blob morphs progressively as the user scrolls through sections.
 */
export const MORPH_PROGRESS: Record<number, number> = {
  0: 0,    // Overview — fully shapeless
  1: 0.2,  // Theme — early morph
  2: 0.45, // Format — mid morph
  3: 0.75, // Timeline — nearly resolved
  4: 1,    // Key — fully formed keycap
};

/* ---------- Animation Durations (seconds) ---------- */
export const DURATIONS = {
  /** Standard section fade in/out */
  normal: 0.5,
  /** Faster section fade (after unlock) */
  fast: 0.25,
  /** Instant — for reduced motion */
  none: 0,
  /** Loading screen flicker word duration */
  flicker: 0.4,
} as const;
