"use client";

import React, { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";

class SimplexNoise {
  private perm: number[] = [];
  private grad3 = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
  ];

  constructor() {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = Math.floor(Math.random() * 256);
    this.perm = new Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  noise2D(xin: number, yin: number): number {
    let n0 = 0, n1 = 0, n2 = 0;
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    const t = (i + j) * G2;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);

    let i1: number, j1: number;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) {
      t0 *= t0;
      const gi0 = this.perm[ii + this.perm[jj]] % 12;
      n0 = t0 * t0 * (this.grad3[gi0][0] * x0 + this.grad3[gi0][1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) {
      t1 *= t1;
      const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
      n1 = t1 * t1 * (this.grad3[gi1][0] * x1 + this.grad3[gi1][1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) {
      t2 *= t2;
      const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;
      n2 = t2 * t2 * (this.grad3[gi2][0] * x2 + this.grad3[gi2][1] * y2);
    }

    return 70.0 * (n0 + n1 + n2);
  }
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  const n = points.length;
  if (n < 3) return "";

  const midpoints = points.map((pt, i) => {
    const next = points[(i + 1) % n];
    return {
      x: (pt.x + next.x) / 2,
      y: (pt.y + next.y) / 2,
    };
  });

  let d = `M ${midpoints[n - 1].x.toFixed(2)},${midpoints[n - 1].y.toFixed(2)}`;

  for (let i = 0; i < n; i++) {
    const pt = points[i];
    const mid = midpoints[i];
    d += ` Q ${pt.x.toFixed(2)},${pt.y.toFixed(2)} ${mid.x.toFixed(2)},${mid.y.toFixed(2)}`;
  }

  return d + " Z";
}

// --- assets -----------------------------------------------------------
const SILHOUETTE_SRC = "/silhouette.svg";
const KEY_IMAGE_SRC = "/keycap.png";

const NUM_POINTS = 32;
const CANVAS_CENTER = 100;
const BASE_RADIUS = 72;

const KEY_SHRINK_FACTOR = 0.42;
const TARGET_MAX_RADIUS = 90;

/* --- Detail-logo alignment calibration --------------------------------------
   At full resolve the blob is the silhouette.svg outline, mapped edge-to-edge
   into a 400 x 322.06 unit raster box (in `loadKeySilhouette`'s draw frame)
   centred about CANVAS_CENTER. keycap.png is a DIFFERENT asset: its artwork
   does not fill its 1800 x 1409 canvas (ink bbox ~42.7..1715.5 x 42.3..1393.1),
   and when it is meet-fitted into the silhouette box its ink covers only ~93%
   of the blob's outline and rides ~7 units HIGH — so at Phase 4 the black blob
   peeks past the white key, worst at the bottom. These three constants
   re-scale + re-centre the key rendering against the CURRENT assets (the blob
   shape/radii are untouched):
     KEY_COVER_SCALE — uniform over-cover; 1 == key ink spans the blob box
        exactly, >1 adds a margin so the blob never crosses the key's edge.
     KEY_X_SHIFT / KEY_Y_SHIFT — raster-unit shifts applied through `scale`,
        moving keycap.png's ink so its centre lands on CANVAS_CENTER. */
const KEY_COVER_SCALE = 1.1;
/* After over-cover is applied, keycap.png's ink centre rides +~14.9 raster px
   RIGHT and ~19.6 raster px ABOVE the silhouette-centre anchor (its ink is
   asymmetric inside its canvas). The placement formula below subtracts these
   from centroidX/centroidY so the ink centre lands exactly on CANVAS_CENTER —
   KEY_X_SHIFT positive slides the box left, KEY_Y_SHIFT negative slides it
   down. */
const KEY_X_SHIFT = 14.9;
const KEY_Y_SHIFT = -19.64;

// Manual fine-tune for detail-logo placement relative to the core polygon.
// In viewBox units (viewBox is 200 units wide) — not px, so it scales
// consistently across breakpoints. Nudge and reload to dial in.
// NOTE: 0/0 — centering is now owned by the KEY_COVER_SCALE/KEY_[XY]_SHIFT
// calibration above; a non-zero Y here reintroduces a vertical offset.
const LOGO_OFFSET_X = 0;
const LOGO_OFFSET_Y = 0;

function generateFallbackRadii(n: number): Float32Array {
  const arr = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2;
    arr[i] = 75 + 12 * Math.cos(angle * 4);
  }
  return arr;
}

// --- phase timing -------------------------------------------------------
const FLUID_HOLD_PROGRESS = 0.62;  // outline starts pulling toward the key shape
const SHAPE_LOCK_PROGRESS = 0.92;  // fully settled — permanent black key silhouette from here
export const KEY_RIGID_PROGRESS = 0.97;   // detail fully visible, tilt interaction turns on

/* Hit by KeyHitArea's click-push: the resolved key logo gets an id + a
   fill-box transform anchor so its scale can be animated around its own
   center. Markup/style only — never physics. */
export const KEY_VISUAL_ID = "key-visual";

/* --- Blob mesh gradient (visual layer only) ------------------------------
   A soft mesh-like color field clipped to the blob silhouette (via <use>
   of the physics-written core path — no loop changes). It drifts slowly
   while the blob is alive and settles toward a calm, near-static state as
   the key resolves (arrival > restlessness). Color values are first-pass. */
const MESH_SETTLE_START = 0.55;            // begin calming before shape lock
const MESH_SETTLE_END = KEY_RIGID_PROGRESS; // fully calm once key is rigid

/* --- Blob film grain (visual layer only) --------------------------------
   A single soft grain layer + a directional veil + a soft inner sheen, all
   clipped to the blob silhouette. Not filters, not animated, not per-frame:
   a static <pattern>+<rect> feeding a phase-linked opacity (React render
   value). Tile: public/blob-grain.png (soft neutral-gray film grain, ~36%
   ink coverage; measured mean added luminance ~7.6/255 at full opacity).
   Strength lerps GRAIN_ALIVE -> GRAIN_CALM with the
   mesh settle; the lerped view opacity is clamped to SVG's 0..1 range.
   Static, so reduced motion needs no special case. */
const GRAIN_ALIVE = 0.75;
const GRAIN_CALM = 0.3;
const GRAIN_TILE_PX = 256; // tile edge in px (density lives in the tile itself)

/* --- Drifting dark-gray gradients (visual layer only) -------------------
   Broad, soft tonal shifts riding under the grain, like light moving across
   a matte surface. Pure-translate CSS animation only (no filters/masks);
   each circle carries its own duration + travel via CSS custom props, and
   its phase-linked opacity from React (per-circle, avoiding a group blur
   layer). MESH_GRAY_ALIVE -> MESH_GRAY_CALM with the mesh settle, so the key
   resolves on near-pure black. Peak stop alphas are tuned to the luminance
   budget (see measure notes); the largest circle gets the higher peak. */
const MESH_GRAY_ALIVE = 0.5;
const MESH_GRAY_CALM = 0.1;
const MESH_GRAY_COLOR = "#2b2b31"; // peak gray, very slight cool lean
/* Eased radial falloff (offset, factor-of-peak) — 6 stops so no ring/edge. */
const MESH_GRAY_STOPS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [0.22, 0.72],
  [0.42, 0.48],
  [0.62, 0.26],
  [0.82, 0.1],
  [1, 0],
];
/* cx, cy, r (viewBox units), peak stop alpha, animation duration (s), and
   per-axis travel (viewBox units each way). */
const MESH_GRAY_CIRCLES: ReadonlyArray<{
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly peak: number;
  readonly dur: number;
  readonly tx: number;
  readonly ty: number;
}> = [
  { cx: 100, cy: 100, r: 95, peak: 0.54, dur: 24, tx: 13, ty: -11 },
  { cx: 58, cy: 132, r: 78, peak: 0.36, dur: 29, tx: -12, ty: 12 },
  { cx: 142, cy: 58, r: 72, peak: 0.36, dur: 32, tx: 12, ty: -14 },
];
/* CSS class used for the drift animation (defined in globals.css). */
const MESH_GRAY_DRIFT_CLASS = "blob-gray-drift";

/* Directional veil: linearGradient in objectBoundingBox units (0..1),
   transparent until GRAIN_VEIL_START_RAMP along the diagonal, ramping to
   #000000 at GRAIN_VEIL_MAX_OPACITY toward the bottom-right. Kept mild so
   the texture survives across the whole blob. */
const GRAIN_VEIL_X1 = 0;
const GRAIN_VEIL_Y1 = 0;
const GRAIN_VEIL_X2 = 1;
const GRAIN_VEIL_Y2 = 1;
const GRAIN_VEIL_START_RAMP = 0.35;
const GRAIN_VEIL_MAX_OPACITY = 0.55;

/* --- 3D lighting (visual layer only) ------------------------------------
   Light direction + specular highlight + violet bounce rim. Everything is
   derived from LIGHT_X / LIGHT_Y (the light comes FROM that direction,
   top-left), so tuning these two numbers moves every effect consistently.
   Blob must stay primarily black; peaks are modest and the phase lerp keeps
   depth visible while the gray drift + grain fade out. */
const LIGHT_X = -0.55;
const LIGHT_Y = -0.6;
const LIGHT_FOLLOWS_CURSOR = true; // specular glides toward the cursor
const LIGHT_CURSOR_SHIFT = 12; // max shift, viewBox units
const LIGHT_CURSOR_TRANSITION = "transform 350ms ease-out";

const LIGHT_MAG = Math.hypot(LIGHT_X, LIGHT_Y);
const LIGHT_DX = LIGHT_X / LIGHT_MAG; // unit vector toward the light
const LIGHT_DY = LIGHT_Y / LIGHT_MAG;
const LIGHT_ANGLE_DEG = (Math.atan2(LIGHT_DY, LIGHT_DX) * 180) / Math.PI;

/* Specular sheen: an ellipse (rx vs ry) offset toward the light, its major
   axis turned to follow the light angle. Filled with an objectBoundingBox
   radial gradient so the stop falloff matches the rotated ellipse exactly.
   Peak alpha ~0.08; 8 eased stops -> 0 at the edge. */
const SPEC_OFFSET = 27.5; // center offset toward the light (viewBox units)
const SPEC_CENTER_X = 100 + LIGHT_DX * SPEC_OFFSET;
const SPEC_CENTER_Y = 100 + LIGHT_DY * SPEC_OFFSET;
const SPEC_RX = 60;
const SPEC_RY = 45;
const SPEC_PEAK = 0.08;
const SPEC_COLOR = "rgb(190 205 255)";
const SPEC_STOPS: ReadonlyArray<number> = [1, 0.88, 0.74, 0.58, 0.44, 0.28, 0.12, 0];
const SPEC_ALIVE = 1;
const SPEC_CALM = 0.55;

/* Rim stroke: one <use> of #blob-core-path stroked with a gradient along the
   light axis, clipped so only the inner half shows on the bounce side. */
const RIM_BOUNCE_PEAK = 0.22; // violet on the shadow side
const RIM_BOUNCE_STROKE_WIDTH = 3;
const RIM_BOUNCE_FADE = 0.5;
const RIM_BOUNCE_COLOR = "rgb(96 61 182)";
const RIM_BOUNCE_X1 = 100 - LIGHT_DX * 100;
const RIM_BOUNCE_Y1 = 100 - LIGHT_DY * 100;
const RIM_BOUNCE_X2 = 100 + LIGHT_DX * 100;
const RIM_BOUNCE_Y2 = 100 + LIGHT_DY * 100;
const RIM_ALIVE = 1;
const RIM_CALM = 0.55;

function computeMeshSettle(p: number): number {
  const t = Math.min(1, Math.max(0, (p - MESH_SETTLE_START) / (MESH_SETTLE_END - MESH_SETTLE_START)));
  return t * t * (3 - 2 * t);
}

function computeFluidity(p: number): number {
  if (p <= FLUID_HOLD_PROGRESS) {
    return 1 - 0.2 * (p / FLUID_HOLD_PROGRESS);
  }
  const t = Math.min(1, (p - FLUID_HOLD_PROGRESS) / (SHAPE_LOCK_PROGRESS - FLUID_HOLD_PROGRESS));
  const eased = t * t * (3 - 2 * t);
  return 0.8 * (1 - eased);
}

function computeShapeBlend(p: number): number {
  return Math.min(1, p / SHAPE_LOCK_PROGRESS);
}

function computeDetailReveal(p: number): number {
  const t = Math.min(1, Math.max(0, (p - SHAPE_LOCK_PROGRESS) / (KEY_RIGID_PROGRESS - SHAPE_LOCK_PROGRESS)));
  return t * t * (3 - 2 * t);
}

/* Blob visibility: 1 while alive, fading smoothly to 0 over the tail AFTER the
   key is fully resolved (KEY_RIGID_PROGRESS -> 1), so the black silhouette and
   its grain/lighting step aside and the resolved key stands alone.
   Progress-driven, not per-frame — reduced-motion safe. */
function computeBlobVisibility(p: number): number {
  const t = Math.min(1, Math.max(0, (p - KEY_RIGID_PROGRESS) / (1 - KEY_RIGID_PROGRESS)));
  return 1 - t * t * (3 - 2 * t);
}

const PROGRESS_LERP = 0.06;

interface KeyImagePlacement {
  href: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BlobMorphProps {
  progress?: number;
}

export function BlobMorph({ progress = 0 }: BlobMorphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const corePathRef = useRef<SVGPathElement>(null);
  const specularShiftRef = useRef<SVGGElement>(null);
  const meshGroupRef = useRef<SVGGElement>(null);
  const logoImageRef = useRef<SVGImageElement>(null);

  const targetRadiiRef = useRef<Float32Array>(generateFallbackRadii(NUM_POINTS));
  const keyImageRef = useRef<KeyImagePlacement | null>(null);
  const [keyImageReady, setKeyImageReady] = useState(false);

  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const smoothedProgressRef = useRef(0);
  const lastBlobOpacityRef = useRef<string | null>(null);

  /* Grain pattern tile size in SVG user units, so each texel is ~1 DEVICE
     pixel at every breakpoint/DPR. The SVG viewBox is 200 units wide mapped
     to --blob-size CSS px, so tileUnits = 256 * 200 / (blobSizePx * dpr).
     Measured with a ResizeObserver OUTSIDE the rAF tick (state, not a
     per-frame write); also re-measured on devicePixelRatio changes. */
  const [grainTileUnits, setGrainTileUnits] = useState(
    (GRAIN_TILE_PX * 200) / (680 * 2)
  );

  const { isReducedMotion } = useApp();

  /* Grain tile sizing effect — ResizeObserver on the svg element + a
     devicePixelRatio matchMedia listener, both outside the tick. No per-frame
     reads/writes: only runs when the blob box or DPR changes. */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const update = () => {
      const rect = svg.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (rect.width > 0 && dpr > 0) {
        // Exact texel = device-pixel mapping, then SNAP the pattern tile to a
        // whole number of device pixels: round(dpr * blobPx/200 * tileUnits)
        // gives the device px per tile, which we convert back to user units.
        // When RO and DPR agree this lands on GRAIN_TILE_PX itself; the snap
        // guards against any fractional drift so texels sit on the device
        // grid and never interpolate to mush.
        const tileUnits = (GRAIN_TILE_PX * 200) / (rect.width * dpr);
        const devicePxPerTile = (dpr * rect.width * tileUnits) / 200;
        const snapped = Math.max(1, Math.round(devicePxPerTile));
        setGrainTileUnits((snapped * 200) / (rect.width * dpr));
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(svg);
    const dprMedia = window.matchMedia(
      `(resolution: ${window.devicePixelRatio}dppx)`
    );
    dprMedia.addEventListener?.("change", update);
    return () => {
      ro.disconnect();
      dprMedia.removeEventListener?.("change", update);
    };
  }, []);

  /* Cursor-shifted specular highlight (LIGHT_FOLLOWS_CURSOR). One SMALL
     mousemove listener in its own effect — NOT in the tick. It writes a
     single CSS transform translate() on the specular <g> per event; a CSS
     transition (LIGHT_CURSOR_TRANSITION) eases it toward the cursor. No
     per-frame JS. Skipped for reduced motion and coarse (touch) pointers,
     which have no hovering cursor to follow. */
  useEffect(() => {
    const svg = svgRef.current;
    const el = specularShiftRef.current;
    if (!svg || !el || !LIGHT_FOLLOWS_CURSOR) return;
    if (isReducedMotion) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const apply = (e: MouseEvent) => {
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      // Normalized cursor offset from the blob center, -1..1 on each axis.
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      // Shift up to LIGHT_CURSOR_SHIFT viewBox units, converted to CSS px
      // (1 user unit = rect.width / 200 css px).
      const maxCss = (LIGHT_CURSOR_SHIFT * rect.width) / 200;
      const tx = nx * maxCss;
      const ty = ny * maxCss;
      el.style.transform = `translate(${tx.toFixed(2)}px ${ty.toFixed(2)}px)`;
    };
    window.addEventListener("mousemove", apply);
    return () => window.removeEventListener("mousemove", apply);
  }, [isReducedMotion]);

  const cursorRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -9999,
    y: -9999,
    active: false,
  });

  useEffect(() => {
    let cancelled = false;
    const RASTER = 400;
    const MASK_ALPHA_THRESHOLD = 10;

    async function loadKeySilhouette() {
      try {
        const res = await fetch(SILHOUETTE_SRC);
        const svgText = await res.text();
        const blob = new Blob([svgText], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const img = new Image();

        img.onload = () => {
          if (cancelled) return;

          const canvas = document.createElement("canvas");
          canvas.width = RASTER;
          canvas.height = RASTER;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          const aspect = img.naturalWidth / img.naturalHeight;
          let drawW = RASTER;
          let drawH = RASTER;
          if (aspect >= 1) {
            drawH = RASTER / aspect;
          } else {
            drawW = RASTER * aspect;
          }
          const offsetX = (RASTER - drawW) / 2;
          const offsetY = (RASTER - drawH) / 2;

          ctx.clearRect(0, 0, RASTER, RASTER);
          ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

          let imageData: ImageData;
          try {
            imageData = ctx.getImageData(0, 0, RASTER, RASTER);
          } catch (err) {
            console.warn("BlobMorph: could not read silhouette pixel data", err);
            return;
          }
          const data = imageData.data;

          const isInk = (x: number, y: number) => {
            if (x < 0 || y < 0 || x >= RASTER || y >= RASTER) return false;
            const idx = (Math.floor(y) * RASTER + Math.floor(x)) * 4;
            return data[idx + 3] > MASK_ALPHA_THRESHOLD;
          };

          let minX = RASTER, maxX = 0, minY = RASTER, maxY = 0;
          let found = false;
          for (let y = 0; y < RASTER; y += 2) {
            for (let x = 0; x < RASTER; x += 2) {
              if (isInk(x, y)) {
                found = true;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }
          if (!found || maxX <= minX || maxY <= minY) {
            return;
          }

          const centroidX = (minX + maxX) / 2;
          const centroidY = (minY + maxY) / 2;

          const rawRadii = new Float32Array(NUM_POINTS);
          for (let i = 0; i < NUM_POINTS; i++) {
            const angle = (i / NUM_POINTS) * Math.PI * 2;
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);
            let r = 0;
            while (r < RASTER && isInk(centroidX + dx * r, centroidY + dy * r)) {
              r += 1;
            }
            rawRadii[i] = r;
          }

          const maxRawRadius = Math.max(...Array.from(rawRadii), 1);
          const normalizedRadii = Float32Array.from(
            rawRadii,
            (r) => (r / maxRawRadius) * TARGET_MAX_RADIUS
          );

          const scale = (TARGET_MAX_RADIUS * KEY_SHRINK_FACTOR) / maxRawRadius;

          targetRadiiRef.current = normalizedRadii;
          keyImageRef.current = {
            href: KEY_IMAGE_SRC,
            x: CANVAS_CENTER - (centroidX + KEY_X_SHIFT) * scale,
            y: CANVAS_CENTER - (centroidY + KEY_Y_SHIFT) * scale,
            width: drawW * scale * KEY_COVER_SCALE,
            height: drawH * scale * KEY_COVER_SCALE,
          };
          setKeyImageReady(true);
        };

        img.src = url;
      } catch (err) {
        console.warn("BlobMorph: error loading key silhouette", err);
      }
    }

    loadKeySilhouette();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const shapeNoise = new SimplexNoise();

    const IDLE_AMPLITUDE_MAX = 9;
    const IDLE_SPEED = 0.00045;

    const STRETCH_STRENGTH_MAX = 24;
    const STIFFNESS = 0.06;
    const DAMPING = 0.82;

    const rOffsets = new Float32Array(NUM_POINTS);
    const rVelocities = new Float32Array(NUM_POINTS);

    const handleMouseMove = (e: MouseEvent) => {
      cursorRef.current = { x: e.clientX, y: e.clientY, active: true };
    };

    const handleMouseLeave = () => {
      cursorRef.current.active = false;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    let rafId: number;
    const startTime = performance.now();

    const tick = () => {
      const now = performance.now() - startTime;
      const time = now * IDLE_SPEED;
      const cursor = cursorRef.current;

      const targetProgress = Math.min(1, Math.max(0, progressRef.current));
      smoothedProgressRef.current +=
        (targetProgress - smoothedProgressRef.current) * PROGRESS_LERP;
      const currentProgress = smoothedProgressRef.current;

      const fluidityFactor = computeFluidity(currentProgress);
      const shapeBlend = computeShapeBlend(currentProgress);
      const idleAmplitude = IDLE_AMPLITUDE_MAX * fluidityFactor;
      const stretchStrength = STRETCH_STRENGTH_MAX * fluidityFactor;

      let svgCenterX = window.innerWidth / 2;
      let svgCenterY = window.innerHeight / 2;

      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          svgCenterX = rect.left + rect.width / 2;
          svgCenterY = rect.top + rect.height / 2;
        }
      }

      const maxRange = Math.max(window.innerWidth, window.innerHeight) * 0.75;

      let influenceFactor = 0;
      let cursorAngle = 0;

      if (cursor.active && fluidityFactor > 0.01) {
        const dx = cursor.x - svgCenterX;
        const dy = cursor.y - svgCenterY;
        const dist = Math.hypot(dx, dy);

        if (dist < maxRange) {
          influenceFactor = Math.pow(1 - dist / maxRange, 1.5) * fluidityFactor;
          cursorAngle = Math.atan2(dy, dx);
        }
      }

      const rawTargets = new Float32Array(NUM_POINTS);
      let totalTarget = 0;

      if (influenceFactor > 0) {
        for (let i = 0; i < NUM_POINTS; i++) {
          const angle = (i / NUM_POINTS) * Math.PI * 2;
          let angleDiff = angle - cursorAngle;
          angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

          const frontFocus = Math.max(0, Math.cos(angleDiff));
          const pull = Math.pow(frontFocus, 2.2) * influenceFactor * stretchStrength;

          rawTargets[i] = pull;
          totalTarget += pull;
        }

        const meanTarget = totalTarget / NUM_POINTS;
        for (let i = 0; i < NUM_POINTS; i++) {
          rawTargets[i] -= meanTarget * 0.95;
        }
      }

      for (let i = 0; i < NUM_POINTS; i++) {
        const force = (rawTargets[i] - rOffsets[i]) * STIFFNESS;
        rVelocities[i] = (rVelocities[i] + force) * DAMPING;
        rOffsets[i] += rVelocities[i];
      }

      const smoothedOffsets = new Float32Array(NUM_POINTS);
      for (let i = 0; i < NUM_POINTS; i++) {
        const prev = rOffsets[(i - 1 + NUM_POINTS) % NUM_POINTS];
        const curr = rOffsets[i];
        const next = rOffsets[(i + 1) % NUM_POINTS];

        smoothedOffsets[i] = curr * 0.6 + (prev + next) * 0.2;
      }

      const points: { x: number; y: number }[] = [];
      const targetRadii = targetRadiiRef.current;

      for (let i = 0; i < NUM_POINTS; i++) {
        const angle = (i / NUM_POINTS) * Math.PI * 2;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        const targetKeyRadius = targetRadii[i] * KEY_SHRINK_FACTOR;
        const baseMorphRadius =
          (1 - shapeBlend) * BASE_RADIUS + shapeBlend * targetKeyRadius;

        const n = shapeNoise.noise2D(cosA * 0.9, sinA * 0.9 + time);
        const idleRadius = baseMorphRadius + n * idleAmplitude;

        const finalRadius = idleRadius + smoothedOffsets[i];
        const px = CANVAS_CENTER + finalRadius * cosA;
        const py = CANVAS_CENTER + finalRadius * sinA;

        points.push({ x: px, y: py });
      }

      const dString = buildSmoothPath(points);
      if (corePathRef.current) corePathRef.current.setAttribute("d", dString);

      const detailReveal = computeDetailReveal(currentProgress);

      /* Blob steps aside only once the key is FULLY visible. Driven from the
         SAME smoothed progress as detailReveal (not the latched progress prop,
         which snaps to 1), so it can never reach 0 while the key is still
         fading in. Key is fully visible at KEY_RIGID_PROGRESS; the blob then
         eases out over the tail. Cached to skip redundant writes. */
      const blobFade = computeBlobVisibility(currentProgress);
      const blobFadeStr = blobFade.toFixed(3);
      if (blobFadeStr !== lastBlobOpacityRef.current) {
        lastBlobOpacityRef.current = blobFadeStr;
        if (corePathRef.current) corePathRef.current.style.opacity = blobFadeStr;
        if (meshGroupRef.current) meshGroupRef.current.style.opacity = blobFadeStr;
      }

      if (logoImageRef.current) {
        logoImageRef.current.style.opacity = String(detailReveal);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  /* Phase-linked intensities: lerp the *_ALIVE -> *_CALM constants with the
     mesh settle, clamped to SVG's 0..1 opacity range. React render values
     only — never written from the tick. */
  const meshSettle = computeMeshSettle(progress);
  const grainOpacity = Math.min(1, Math.max(0, GRAIN_ALIVE + (GRAIN_CALM - GRAIN_ALIVE) * meshSettle));
  const grayOpacity = Math.min(1, Math.max(0, MESH_GRAY_ALIVE + (MESH_GRAY_CALM - MESH_GRAY_ALIVE) * meshSettle));
  /* Depth effects stay partially visible in phase 4: lerp SPEC/RIM_ALIVE ->
     *_CALM (1 -> 0.55). React render values only — never written from the tick. */
  const specOpacity = Math.min(1, Math.max(0, SPEC_ALIVE + (SPEC_CALM - SPEC_ALIVE) * meshSettle));
  const rimOpacity = Math.min(1, Math.max(0, RIM_ALIVE + (RIM_CALM - RIM_ALIVE) * meshSettle));

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 200 200"
      style={{ overflow: "visible" }}
      className="w-[var(--blob-size)] h-[var(--blob-size)] pointer-events-none"
    >
      <defs>
        {/* Grain clip: re-uses the physics-written core silhouette via <use>, so
              the grain + veil always stay in sync with the morph without a
              second path being written by the loop. */}
        <clipPath id="blob-mesh-clip">
          <use href="#blob-core-path" />
        </clipPath>
        {/* Directional veil gradient: transparent until
              GRAIN_VEIL_START_RAMP along the top-left -> bottom-right
              diagonal, then ramping to #000000 at GRAIN_VEIL_MAX_OPACITY
              (objectBoundingBox units). Static; a plain gradient, not a
              filter or mask. */}
        <linearGradient
          id="blob-veil"
          gradientUnits="objectBoundingBox"
          x1={GRAIN_VEIL_X1}
          y1={GRAIN_VEIL_Y1}
          x2={GRAIN_VEIL_X2}
          y2={GRAIN_VEIL_Y2}
        >
          <stop offset="0%" stopColor="#000000" stopOpacity="0" />
          <stop offset={`${GRAIN_VEIL_START_RAMP * 100}%`} stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity={GRAIN_VEIL_MAX_OPACITY} />
        </linearGradient>
        {/* Drifting dark-gray radial gradients: broad soft tonal fields
              under the grain, one per circle in MESH_GRAY_CIRCLES. Eased 6-stop
              falloff to fully transparent at the edge (no ring), peak per
              circle tuned to the luminance budget. Plain gradients — no
              filters or masks. */}
        {MESH_GRAY_CIRCLES.map((c, i) => (
          <radialGradient
            key={c.cx}
            id={`blob-gray-${i + 1}`}
            gradientUnits="userSpaceOnUse"
            cx={c.cx}
            cy={c.cy}
            r={c.r}
          >
            {MESH_GRAY_STOPS.map(([offset, factor]) => (
              <stop
                key={offset}
                offset={`${offset * 100}%`}
                stopColor={MESH_GRAY_COLOR}
                stopOpacity={c.peak * factor}
              />
            ))}
          </radialGradient>
        ))}
        {/* Static film-grain tile, sized in user units so each texel is
              exactly 1 DEVICE pixel: tileUnits = 256 * 200 / (blobPx * dpr)
              (see grainTileUnits). patternUnits="userSpaceOnUse" pins the
              tile size to the 200-unit viewBox, not the 0..1 box. Default
              (auto) resampling — no pixelated/crisp-edges, which caused the
              streaky look. */}
        <pattern
          id="blob-grain"
          patternUnits="userSpaceOnUse"
          width={grainTileUnits}
          height={grainTileUnits}
        >
          <image
            href="/blob-grain.png"
            width={grainTileUnits}
            height={grainTileUnits}
            preserveAspectRatio="none"
          />
        </pattern>
        {/* Lighting gradients (all plain gradients — no filters/masks).
              Specular: objectBoundingBox radial fits the rotated ellipse
              exactly, 8 eased stops -> 0 by the edge. Rim: userSpaceOnUse
              linear, peak on the shadow corner, fading to 0 along the light
              axis. Phase alpha lives on the elements' opacity. */}
        <radialGradient id="blob-specular-grad">
          {SPEC_STOPS.map((factor, i) => (
            <stop
              key={i}
              offset={`${(i / (SPEC_STOPS.length - 1)) * 100}%`}
              stopColor={SPEC_COLOR}
              stopOpacity={SPEC_PEAK * factor}
            />
          ))}
        </radialGradient>
        <linearGradient
          id="blob-rim-bounce"
          gradientUnits="userSpaceOnUse"
          x1={RIM_BOUNCE_X1}
          y1={RIM_BOUNCE_Y1}
          x2={RIM_BOUNCE_X2}
          y2={RIM_BOUNCE_Y2}
        >
          <stop offset="0%" stopColor={RIM_BOUNCE_COLOR} stopOpacity={RIM_BOUNCE_PEAK} />
          <stop offset={`${RIM_BOUNCE_FADE * 100}%`} stopColor={RIM_BOUNCE_COLOR} stopOpacity="0" />
          <stop offset="100%" stopColor={RIM_BOUNCE_COLOR} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Core silhouette: pure black via the wrapper <g> (presentation
            attributes, not per-frame writes). The physics loop only feeds the
            path's `d`; the group's fill/stroke are static so #blob-core-path
            itself carries no inline presentation — which is what lets the
            sheen <use> restyle its clone cleanly. */}
      <g fill="#000000" stroke="none">
        <path ref={corePathRef} id="blob-core-path" />
      </g>

      {/* Grain field, inside the blob silhouette. Flat black base, then the
            drifting dark-gray radial gradients, then the 3D specular sheen,
            then the fine grain tile, then the directional veil: subtle light
            plays across the surface and is veiled toward the bottom-right,
            but the veil stops short of pure black so grain survives
            everywhere. A violet bounce <use> re-draws the silhouette as a
            static stroke, clipped to its inner half and following the morph
            for free. All content is static or CSS-animated (pure
            translate); the opacities are phase-linked React props, not
            per-frame writes. */}
      <g ref={meshGroupRef} clipPath="url(#blob-mesh-clip)">
        <rect width="200" height="200" fill="#000000" />
        {MESH_GRAY_CIRCLES.map((c, i) => (
          <circle
            key={c.cx}
            className={MESH_GRAY_DRIFT_CLASS}
            cx={c.cx}
            cy={c.cy}
            r={c.r}
            fill={`url(#blob-gray-${i + 1})`}
            opacity={grayOpacity}
            style={
              {
                "--gray-dur": `${c.dur}s`,
                "--gray-tx": `${c.tx}px`,
                "--gray-ty": `${c.ty}px`,
              } as React.CSSProperties
            }
          />
        ))}
        {/* Specular sheen: an ellipse offset toward the light and rotated to
              its angle, its objectBoundingBox radial gradient fading to 0 by
              the edge. The outer <g> carries only a CSS transform so the
              cursor-driven shift (LIGHT_FOLLOWS_CURSOR) eases via
              transition; the inner <g> holds the static SVG-attribute
              rotate/translate in user units. opacity is a render value. */}
        <g
          ref={specularShiftRef}
          style={{ transform: "translate(0px, 0px)", transition: LIGHT_CURSOR_TRANSITION }}
        >
          <g transform={`translate(${SPEC_CENTER_X - 100} ${SPEC_CENTER_Y - 100}) rotate(${LIGHT_ANGLE_DEG} 100 100)`}>
            <ellipse
              cx="100"
              cy="100"
              rx={SPEC_RX}
              ry={SPEC_RY}
              fill="url(#blob-specular-grad)"
              opacity={specOpacity}
            />
          </g>
        </g>
        <rect width="200" height="200" fill="url(#blob-grain)" opacity={grainOpacity} />
        <rect width="200" height="200" fill="url(#blob-veil)" />
        <use
          id="blob-rim-bounce"
          href="#blob-core-path"
          fill="none"
          stroke="url(#blob-rim-bounce)"
          strokeWidth={RIM_BOUNCE_STROKE_WIDTH}
          opacity={rimOpacity}
        />
      </g>

      {keyImageReady && keyImageRef.current && (
        <image
          id={KEY_VISUAL_ID}
          ref={logoImageRef}
          href={keyImageRef.current.href}
          x={keyImageRef.current.x + LOGO_OFFSET_X}
          y={keyImageRef.current.y + LOGO_OFFSET_Y}
          width={keyImageRef.current.width}
          height={keyImageRef.current.height}
          style={{
            opacity: 0,
            transformBox: "fill-box",
            transformOrigin: "center",
          }}
          preserveAspectRatio="xMidYMid meet"
        />
      )}
    </svg>
  );
}
