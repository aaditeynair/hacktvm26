"use client";

import React, { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { ambientColorForProgress, PHASE_COLORS } from "@/lib/theme";

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
const DETAIL_LOGO_SRC = "/key.svg";

const NUM_POINTS = 32;
const CANVAS_CENTER = 100;
const BASE_RADIUS = 72;

const KEY_SHRINK_FACTOR = 0.42;
const TARGET_MAX_RADIUS = 90;

// Manual fine-tune for detail-logo placement relative to the core polygon.
// In viewBox units (viewBox is 200 units wide) — not px, so it scales
// consistently across breakpoints. Nudge and reload to dial in.
const LOGO_OFFSET_X = 0;
const LOGO_OFFSET_Y = 5;

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
   value). Tile: public/blob-grain.png (soft neutral-gray film grain, ~40%
   density, alpha ~0.25). Strength lerps GRAIN_ALIVE -> GRAIN_CALM with the
   mesh settle; the lerped view opacity is clamped to SVG's 0..1 range.
   Static, so reduced motion needs no special case. */
const GRAIN_ALIVE = 1;
const GRAIN_CALM = 0.35;
const GRAIN_TILE_PX = 256; // tile edge in px (density lives in the tile itself)

/* --- Drifting dark-gray gradients (visual layer only) -------------------
   Broad, soft tonal shifts riding under the grain, like light moving across
   a matte surface. Pure-translate CSS animation only (no filters/masks);
   each circle carries its own duration + travel via CSS custom props, and
   its phase-linked opacity from React (per-circle, avoiding a group blur
   layer). MESH_GRAY_ALIVE -> MESH_GRAY_CALM with the mesh settle, so the key
   resolves on near-pure black. Peak stop alphas are tuned to the luminance
   budget (see measure notes); the largest circle gets the higher peak. */
const MESH_GRAY_ALIVE = 1;
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

/* Inner edge sheen: a <use> of #blob-core-path stroked with a top-left ->
   bottom-right gradient, clipped so only the inner half of the stroke shows
   as a soft rim light. Peak alpha lerps GRAIN_SHEEN_PEAK_ALIVE ->
   GRAIN_SHEEN_PEAK_CALM so it is subtle in the calmer phase. Plain static
   geometry — no extra clip, mask, or filter pass. */
const GRAIN_SHEEN_STROKE_WIDTH = 3;
const GRAIN_SHEEN_PEAK_ALIVE = 0.35;
const GRAIN_SHEEN_PEAK_CALM = 0.08;

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

const PROGRESS_LERP = 0.06;

interface KeyImagePlacement {
  href: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

type DetailShape = { tag: string; props: Record<string, any> };

function parseStyleAttr(styleStr?: string): React.CSSProperties {
  if (!styleStr) return {};
  const out: Record<string, string> = {};
  styleStr.split(";").forEach((decl) => {
    const [prop, val] = decl.split(":");
    if (prop && val) out[prop.trim()] = val.trim();
  });
  return out as React.CSSProperties;
}
function toReactProps(raw: Record<string, string>): Record<string, any> {
  const { class: cls, style, ...rest } = raw;
  const out: Record<string, any> = { ...rest, style: parseStyleAttr(style) };
  if (cls) out.className = cls;
  return out;
}
function extractShapes(svgEl: SVGSVGElement): DetailShape[] {
  const nodes = Array.from(
    svgEl.querySelectorAll("path, circle, ellipse, rect, polygon, polyline")
  );
  return nodes.map((el) => ({
    tag: el.tagName.toLowerCase(),
    props: toReactProps(
      Object.fromEntries(Array.from(el.attributes).map((a) => [a.name, a.value]))
    ),
  }));
}

interface BlobMorphProps {
  progress?: number;
}

export function BlobMorph({ progress = 0 }: BlobMorphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const corePathRef = useRef<SVGPathElement>(null);
  const haloPathRef = useRef<SVGPathElement>(null);
  const haloShiftRef = useRef<SVGGElement>(null);
  const glowBlurRef = useRef<SVGFEGaussianBlurElement>(null);
  const logoImageRef = useRef<SVGImageElement>(null); // fallback, kept for graceful degradation

  const [detailShapes, setDetailShapes] = useState<DetailShape[] | null>(null);
  const [detailDefsMarkup, setDetailDefsMarkup] = useState<string | null>(null);
  const [detailViewBox, setDetailViewBox] = useState<string | null>(null);
  const shapeElRefs = useRef<(SVGGraphicsElement | null)[]>([]);

  const targetRadiiRef = useRef<Float32Array>(generateFallbackRadii(NUM_POINTS));
  const keyImageRef = useRef<KeyImagePlacement | null>(null);
  const [keyImageReady, setKeyImageReady] = useState(false);

  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const smoothedProgressRef = useRef(0);

  /* Cached halo color so the fill is only written when it actually changes
     (avoids a per-frame style write to the same element). */
  const lastHaloColorRef = useRef<string | null>(null);

  /* Smoothed cursor-proximity to the resolved key (0..1); drives the halo's
     shift + intensity boost. Written from the tick, never the physics math. */
  const haloProximityRef = useRef(0);

  /* Grain pattern tile size in SVG user units, so each texel is ~1 DEVICE
     pixel at every breakpoint/DPR. The SVG viewBox is 200 units wide mapped
     to --blob-size CSS px, so tileUnits = 256 * 200 / (blobSizePx * dpr).
     Measured with a ResizeObserver OUTSIDE the rAF tick (state, not a
     per-frame write); also re-measured on devicePixelRatio changes. */
  const [grainTileUnits, setGrainTileUnits] = useState(
    (GRAIN_TILE_PX * 200) / (680 * 2)
  );

  const { isReducedMotion } = useApp();
  const reducedMotionRef = useRef(isReducedMotion);
  useEffect(() => {
    reducedMotionRef.current = isReducedMotion;
  }, [isReducedMotion]);

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
            href: DETAIL_LOGO_SRC,
            x: CANVAS_CENTER - centroidX * scale,
            y: CANVAS_CENTER - centroidY * scale,
            width: drawW * scale,
            height: drawH * scale,
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
    let cancelled = false;
    async function loadDetailShapes() {
      try {
        const res = await fetch(DETAIL_LOGO_SRC);
        const svgText = await res.text();
        const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
        const svgEl = doc.querySelector("svg");
        if (!svgEl || cancelled) return;

        const defsEl = svgEl.querySelector("defs");
        setDetailViewBox(svgEl.getAttribute("viewBox"));
        setDetailDefsMarkup(defsEl ? defsEl.outerHTML : null);
        setDetailShapes(extractShapes(svgEl));
      } catch (err) {
        console.warn("BlobMorph: could not parse detail shapes, falling back to flat image", err);
      }
    }
    loadDetailShapes();
    return () => { cancelled = true; };
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
      let blobScale = 1;

      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          svgCenterX = rect.left + rect.width / 2;
          svgCenterY = rect.top + rect.height / 2;
          blobScale = rect.width / 200;
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

        points.push({
          x: CANVAS_CENTER + finalRadius * cosA,
          y: CANVAS_CENTER + finalRadius * sinA,
        });
      }

      const dString = buildSmoothPath(points);
      if (corePathRef.current) corePathRef.current.setAttribute("d", dString);
      if (haloPathRef.current) haloPathRef.current.setAttribute("d", dString);

      const detailReveal = computeDetailReveal(currentProgress);

      /* Phase-linked halo color: same progress value as the morph. Reduced
         motion snaps to the pure phase stop (no in-phase blend). Cached so a
         fill is only written when the color actually changes. */
      const haloColor = ambientColorForProgress(currentProgress, reducedMotionRef.current);
      if (haloPathRef.current && haloColor !== lastHaloColorRef.current) {
        lastHaloColorRef.current = haloColor;
        haloPathRef.current.style.fill = haloColor;
      }

      /* Halo glow — two blur passes (bright core + wide falloff) rendered by
         the filter; the tick only tunes the WIDE blur radius, overall opacity,
         and a subtle translate of the whole glow toward the cursor when it is
         near the resolved key (mouse only; skipped for reduced motion, and
         touch never fires mousemove). Values are eased so it glides in/out. */
      let proximity = 0;
      let shiftX = 0;
      let shiftY = 0;
      if (!reducedMotionRef.current && cursor.active && currentProgress >= KEY_RIGID_PROGRESS) {
        const dxc = cursor.x - svgCenterX;
        const dyc = cursor.y - svgCenterY;
        const dist = Math.hypot(dxc, dyc);
        const range = 300;
        if (dist < range && dist > 0) {
          proximity = Math.pow(1 - dist / range, 2);
          const maxShiftPx = 16;
          const shiftUser = maxShiftPx / blobScale;
          shiftX = (dxc / dist) * shiftUser * proximity;
          shiftY = (dyc / dist) * shiftUser * proximity;
        }
      }
      haloProximityRef.current += (proximity - haloProximityRef.current) * 0.2;
      const easedProximity = haloProximityRef.current;

      if (glowBlurRef.current) {
        const wideBlur = 20 + 5 * (1 - detailReveal) + 10 * easedProximity;
        glowBlurRef.current.setAttribute("stdDeviation", wideBlur.toFixed(2));
      }
      if (haloShiftRef.current) {
        haloShiftRef.current.style.transform =
          `translate(${shiftX.toFixed(2)}px ${shiftY.toFixed(2)}px)`;
      }
      if (haloPathRef.current) {
        const opacity = 0.1 + 0.05 * (1 - detailReveal) + 0.06 * easedProximity;
        haloPathRef.current.style.opacity = opacity.toFixed(3);
      }

      if (shapeElRefs.current.length) {
        const n = shapeElRefs.current.length;
        const REVEAL_BAND = 0.25;
        shapeElRefs.current.forEach((el, i) => {
          if (!el) return;
          const t = n <= 1 ? 0 : i / (n - 1);
          const raw = (detailReveal * (1 + REVEAL_BAND) - t) / REVEAL_BAND;
          el.style.opacity = String(Math.min(1, Math.max(0, raw)));
        });
      } else if (logoImageRef.current) {
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
  const sheenPeak = GRAIN_SHEEN_PEAK_ALIVE + (GRAIN_SHEEN_PEAK_CALM - GRAIN_SHEEN_PEAK_ALIVE) * meshSettle;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 200 200"
      className="w-[var(--blob-size)] h-[var(--blob-size)] pointer-events-none"
    >
      <defs>
        {/* Halo: two blur passes merged into ONE phase-colored bloom — a
              tight high-alpha core (bright) + a wide soft falloff, read as a
              glowing arrival rather than a hard-edged shadow. No second path:
              the halo path is fed by the physics loop exactly as before. */}
        <filter id="blob-ambient-halo" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="haloCore" />
          <feGaussianBlur ref={glowBlurRef} in="SourceGraphic" stdDeviation="20" result="haloWide" />
          <feComponentTransfer in="haloCore" result="haloCoreBoost">
            <feFuncA type="linear" slope="1.65" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="haloWide" />
            <feMergeNode in="haloCoreBoost" />
          </feMerge>
        </filter>

        <filter id="logo-glow-filter" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="glowBlur" />
          <feComponentTransfer in="glowBlur" result="dimmedGlow">
            <feFuncA type="linear" slope="0.75" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="dimmedGlow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

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
        {/* Inner edge sheen gradient (userSpaceOnUse): light blue rim at the
              top-left fading to fully transparent by ~60% along the diagonal.
              The peak alpha is phase-linked via sheenPeak (render value). */}
        <linearGradient
          id="blob-sheen"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="200"
          y2="200"
        >
          <stop offset="0%" stopColor="rgb(129 183 211)" stopOpacity={sheenPeak} />
          <stop offset="60%" stopColor="rgb(129 183 211)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Halo output; wrapped so the whole glow can drift toward the cursor.
            The path's d/fill are still owned by the physics loop. */}
      <g ref={haloShiftRef}>
        <path ref={haloPathRef} id="blob-halo-path" fill={PHASE_COLORS[0]} filter="url(#blob-ambient-halo)" />
      </g>

      {/* Core silhouette: pure black via the wrapper <g> (presentation
            attributes, not per-frame writes). The physics loop only feeds the
            path's `d`; the group's fill/stroke are static so #blob-core-path
            itself carries no inline presentation — which is what lets the
            sheen <use> restyle its clone cleanly. */}
      <g fill="#000000" stroke="none">
        <path ref={corePathRef} id="blob-core-path" />
      </g>

      {/* Grain field, inside the blob silhouette. Flat black base, then the
            drifting dark-gray radial gradients, then the fine grain tile, then
            the directional veil: subtle light plays across the surface and is
            veiled toward the bottom-right, but the veil stops short of pure
            black so grain survives everywhere. The inner edge sheen <use>
            re-draws the same silhouette as a static stroke, clipped so only
            its inner half shows — a soft rim light that follows the morph for
            free. All content is static or CSS-animated (pure translate); the
            opacities are phase-linked React props, not per-frame writes. */}
      <g clipPath="url(#blob-mesh-clip)">
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
        <rect width="200" height="200" fill="url(#blob-grain)" opacity={grainOpacity} />
        <rect width="200" height="200" fill="url(#blob-veil)" />
        <use
          id="blob-sheen-use"
          href="#blob-core-path"
          fill="none"
          stroke="url(#blob-sheen)"
          strokeWidth={GRAIN_SHEEN_STROKE_WIDTH}
        />
      </g>

      {keyImageReady && keyImageRef.current && detailShapes && detailViewBox ? (
        <svg
          id={KEY_VISUAL_ID}
          x={keyImageRef.current.x + LOGO_OFFSET_X}
          y={keyImageRef.current.y + LOGO_OFFSET_Y}
          width={keyImageRef.current.width}
          height={keyImageRef.current.height}
          viewBox={detailViewBox}
          filter="url(#logo-glow-filter)"
          preserveAspectRatio="xMidYMid meet"
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        >
          {detailDefsMarkup && (
            <g dangerouslySetInnerHTML={{ __html: detailDefsMarkup }} />
          )}
          {detailShapes.map((shape, i) => {
            const Tag = shape.tag as any;
            return (
              <Tag
                key={i}
                {...shape.props}
                ref={(el: SVGGraphicsElement | null) => { shapeElRefs.current[i] = el; }}
                style={{ ...shape.props.style, opacity: 0 }}
              />
            );
          })}
        </svg>
      ) : (
        keyImageReady && keyImageRef.current && (
          <image
            id={KEY_VISUAL_ID}
            ref={logoImageRef}
            href={keyImageRef.current.href}
            x={keyImageRef.current.x + LOGO_OFFSET_X}
            y={keyImageRef.current.y + LOGO_OFFSET_Y}
            width={keyImageRef.current.width}
            height={keyImageRef.current.height}
            filter="url(#logo-glow-filter)"
            style={{
              opacity: 0,
              transformBox: "fill-box",
              transformOrigin: "center",
            }}
            preserveAspectRatio="xMidYMid meet"
          />
        )
      )}
    </svg>
  );
}
