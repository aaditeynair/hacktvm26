/**
 * HackTVM'26 — Access Point
 * SVG path definitions for the morphing blob.
 *
 * All paths are closed single shapes in a 200×200 coordinate space (centered at 100,100).
 * These are used by blobPhysics.ts to pre-sample polar control-point radii.
 */

/* ---------- Blob States (shapeless → more defined) ---------- */

/** Fully amorphous, organic blob — starting state (Overview section). */
export const BLOB_INITIAL =
  "M100,30 C130,25 160,40 170,65 C180,90 175,120 160,145 C145,170 120,180 95,178 C70,176 45,165 35,140 C25,115 28,85 40,65 C52,45 70,35 100,30 Z";

/** Slightly less amorphous — early morph (Theme section). */
export const BLOB_THEME =
  "M100,28 C125,22 155,35 168,58 C181,81 178,112 165,140 C152,168 128,182 100,180 C72,178 48,165 38,140 C28,115 30,82 42,62 C54,42 75,34 100,28 Z";

/** Mid morph — trending toward rectangular (Format section). */
export const BLOB_FORMAT =
  "M100,25 C130,20 160,32 172,55 C184,78 180,108 170,138 C160,168 135,182 105,183 C75,184 50,170 38,142 C26,114 30,80 44,58 C58,36 70,30 100,25 Z";

/** Nearly resolved — soft keycap silhouette (Timeline section). */
export const BLOB_TIMELINE =
  "M65,30 C80,22 120,22 135,30 C165,45 178,65 178,100 C178,135 165,160 145,172 C130,180 70,180 55,172 C35,160 22,135 22,100 C22,65 35,45 65,30 Z";

/* ---------- Keycap Shape (final state) ---------- */

/**
 * Solid keycap — rounded rectangle with a slight dish on top.
 * This is the final morph target (Key section and beyond).
 */
export const KEYCAP_FINAL =
  "M60,35 C60,25 70,20 80,20 L120,20 C130,20 140,25 140,35 L145,55 C150,60 155,70 155,85 L155,140 C155,155 148,165 135,170 L65,170 C52,165 45,155 45,140 L45,85 C45,70 50,60 55,55 Z";

/* ---------- Gradient Definition ---------- */

/**
 * SVG gradient stops for the blob fill.
 * Deep purple → mid blue → pale cream.
 */
export const GRADIENT_STOPS = [
  { offset: "0%", color: "#4B2E6F" },
  { offset: "50%", color: "#5C6FC7" },
  { offset: "100%", color: "#E9E4C9" },
] as const;
