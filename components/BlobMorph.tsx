"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

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

/**
 * Build a closed SVG path with adaptive smoothing.
 *   sharpness = 0  →  full quadratic-bézier smoothing (organic blob)
 *   sharpness = 1  →  polyline through actual points (sharp key teeth)
 */
function buildAdaptivePath(
  points: { x: number; y: number }[],
  sharpness: number,
): string {
  const n = points.length;
  if (n < 3) return "";

  // Clamp
  const s = Math.max(0, Math.min(1, sharpness));

  // Compute endpoints for each segment. At s=0 they sit at midpoints
  // (classic smooth blob). At s=1 they sit at the actual vertices (sharp).
  const ends = points.map((pt, i) => {
    const next = points[(i + 1) % n];
    const mx = (pt.x + next.x) / 2;
    const my = (pt.y + next.y) / 2;
    return {
      x: mx + (next.x - mx) * s,
      y: my + (next.y - my) * s,
    };
  });

  const lastEnd = ends[n - 1];
  let d = `M ${lastEnd.x.toFixed(2)},${lastEnd.y.toFixed(2)}`;

  for (let i = 0; i < n; i++) {
    const pt = points[i];
    const end = ends[i];
    d += ` Q ${pt.x.toFixed(2)},${pt.y.toFixed(2)} ${end.x.toFixed(2)},${end.y.toFixed(2)}`;
  }

  return d + " Z";
}

// --- assets -----------------------------------------------------------
const SILHOUETTE_SRC = "/silhouette.svg";
const DETAIL_LOGO_SRC = "/key.svg";

// --- shape constants (original sizing) ---------------------------------
const NUM_POINTS = 96;
const CANVAS_CENTER = 100;
const BASE_RADIUS = 72;

const KEY_SHRINK_FACTOR = 0.42;
const TARGET_MAX_RADIUS = 90;

// --- phase timing (original) -------------------------------------------
const FLUID_HOLD_PROGRESS = 0.80;
const SHAPE_LOCK_PROGRESS = 0.90;
const KEY_RIGID_PROGRESS = 0.96;

function computeFluidity(p: number): number {
  if (p <= FLUID_HOLD_PROGRESS) {
    return 1 - 0.2 * (p / FLUID_HOLD_PROGRESS);
  }
  const t = Math.min(1, (p - FLUID_HOLD_PROGRESS) / (SHAPE_LOCK_PROGRESS - FLUID_HOLD_PROGRESS));
  const eased = t * t * (3 - 2 * t);
  return 0.8 * (1 - eased);
}

function computeDetailReveal(p: number): number {
  const t = Math.min(1, Math.max(0, (p - SHAPE_LOCK_PROGRESS) / (KEY_RIGID_PROGRESS - SHAPE_LOCK_PROGRESS)));
  return t * t * (3 - 2 * t);
}

const PROGRESS_LERP = 0.08;

const SPECULAR_PALETTE = ["#ffffff", "#cbd5e1", "#e2e8f0", "#ffffff"];

// --- contour tracing ---------------------------------------------------

function traceContour(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold: number,
): { x: number; y: number }[] {
  const isInk = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    return data[(y * width + x) * 4 + 3] > alphaThreshold;
  };

  let startX = -1, startY = -1;
  outer: for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isInk(x, y)) { startX = x; startY = y; break outer; }
    }
  }
  if (startX < 0) return [];

  const dx = [1, 1, 0, -1, -1, -1, 0, 1];
  const dy = [0, 1, 1, 1, 0, -1, -1, -1];
  const rawPoints: { x: number; y: number }[] = [];
  let cx = startX, cy = startY;
  let dir = 7;
  const maxIter = width * height * 2;

  for (let iter = 0; iter < maxIter; iter++) {
    rawPoints.push({ x: cx, y: cy });
    let found = false;
    const searchStart = (dir + 5) % 8;
    for (let k = 0; k < 8; k++) {
      const d = (searchStart + k) % 8;
      const nx = cx + dx[d];
      const ny = cy + dy[d];
      if (isInk(nx, ny)) { cx = nx; cy = ny; dir = d; found = true; break; }
    }
    if (!found) break;
    if (cx === startX && cy === startY && rawPoints.length > 2) break;
  }
  return rawPoints;
}

function resampleContour(
  raw: { x: number; y: number }[],
  count: number,
): { x: number; y: number }[] {
  if (raw.length < 2) return raw;

  const cumLen: number[] = [0];
  for (let i = 1; i < raw.length; i++) {
    const dx = raw[i].x - raw[i - 1].x;
    const dy = raw[i].y - raw[i - 1].y;
    cumLen.push(cumLen[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  const cdx = raw[0].x - raw[raw.length - 1].x;
  const cdy = raw[0].y - raw[raw.length - 1].y;
  const totalLen = cumLen[cumLen.length - 1] + Math.sqrt(cdx * cdx + cdy * cdy);

  const result: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const targetDist = (i / count) * totalLen;
    let segIdx = 0;
    for (let j = 1; j < cumLen.length; j++) {
      if (cumLen[j] >= targetDist) { segIdx = j - 1; break; }
      segIdx = j;
    }

    if (segIdx >= raw.length - 1) {
      const segStart = cumLen[cumLen.length - 1];
      const segLen = totalLen - segStart;
      const t = segLen > 0 ? (targetDist - segStart) / segLen : 0;
      result.push({
        x: raw[raw.length - 1].x + (raw[0].x - raw[raw.length - 1].x) * t,
        y: raw[raw.length - 1].y + (raw[0].y - raw[raw.length - 1].y) * t,
      });
    } else {
      const segStart = cumLen[segIdx];
      const segEnd = cumLen[segIdx + 1];
      const segLen = segEnd - segStart;
      const t = segLen > 0 ? (targetDist - segStart) / segLen : 0;
      result.push({
        x: raw[segIdx].x + (raw[segIdx + 1].x - raw[segIdx].x) * t,
        y: raw[segIdx].y + (raw[segIdx + 1].y - raw[segIdx].y) * t,
      });
    }
  }
  return result;
}

/**
 * Rotate contour point ordering so point[0] is at angle ≈ 0 from centre
 * (rightmost point), matching the circle's starting angle. Also ensures
 * the contour winds clockwise in screen-space (Y-down) to match.
 */
function alignContourToCircle(
  pts: { x: number; y: number }[],
  cx: number,
  cy: number,
): { x: number; y: number }[] {
  // Ensure clockwise winding (negative area in Y-down SVG coords)
  let windingSum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    windingSum += (b.x - a.x) * (b.y + a.y);
  }
  
  // If windingSum is positive, the contour is counter-clockwise. Reverse it so it matches
  // the circle's clockwise generation. This completely eliminates twisting/noodling.
  const ordered = windingSum > 0 ? [...pts].reverse() : pts;

  // Find the point closest to angle 0 (rightmost from centre)
  let bestIdx = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < ordered.length; i++) {
    let angle = Math.atan2(ordered[i].y - cy, ordered[i].x - cx);
    if (angle < 0) angle += Math.PI * 2;
    
    let diff = angle;
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    diff = Math.abs(diff);
    
    if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
  }

  return [...ordered.slice(bestIdx), ...ordered.slice(0, bestIdx)];
}

// --- types & props ------------------------------------------------------

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
  const haloPathRef = useRef<SVGPathElement>(null);
  const clipPathRef = useRef<SVGPathElement>(null);
  const detailClipPathRef = useRef<SVGPathElement>(null);
  const glowBlurRef = useRef<SVGFEGaussianBlurElement>(null);
  const logoImageRef = useRef<SVGImageElement>(null);

  type DetailShape = { tag: string; props: Record<string, any> };
  const [detailShapes, setDetailShapes] = useState<DetailShape[] | null>(null);
  const [detailDefsMarkup, setDetailDefsMarkup] = useState<string | null>(null);
  const [detailViewBox, setDetailViewBox] = useState<string | null>(null);
  const shapeElRefs = useRef<(SVGGraphicsElement | null)[]>([]);
  const detailGroupRef = useRef<SVGGElement>(null);

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

  const meshGroupRef = useRef<SVGGElement>(null);
  const meshCircleRefs = useRef<(SVGCircleElement | null)[]>([]);

  const keyTargetsRef = useRef<{ x: number; y: number }[] | null>(null);
  const keyImageRef = useRef<KeyImagePlacement | null>(null);
  const [keyImageReady, setKeyImageReady] = useState(false);

  const progressRef = useRef(progress);
  useEffect(() => { progressRef.current = progress; }, [progress]);
  const smoothedProgressRef = useRef(0);

  const isKeyActive = progress >= KEY_RIGID_PROGRESS;
  const tiltCursorX = useMotionValue(0);
  const tiltCursorY = useMotionValue(0);
  const rawRotateX = useTransform(tiltCursorY, (v) => (isKeyActive ? v * -18 : 0));
  const rawRotateY = useTransform(tiltCursorX, (v) => (isKeyActive ? v * 18 : 0));
  const springRotateX = useSpring(rawRotateX, { stiffness: 90, damping: 16 });
  const springRotateY = useSpring(rawRotateY, { stiffness: 90, damping: 16 });

  const cursorRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -9999, y: -9999, active: false,
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Load silhouette → trace contour → resample → scale to viewBox
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let cancelled = false;
    const RASTER = 600;
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
          let drawW = RASTER, drawH = RASTER;
          if (aspect >= 1) drawH = RASTER / aspect;
          else drawW = RASTER * aspect;
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

          // Trace the exact boundary
          const contour = traceContour(imageData.data, RASTER, RASTER, MASK_ALPHA_THRESHOLD);
          if (contour.length < 10) {
            console.warn("BlobMorph: contour too sparse");
            return;
          }

          // Centroid of contour in raster space
          let sumX = 0, sumY = 0;
          for (const p of contour) { sumX += p.x; sumY += p.y; }
          const centroidX = sumX / contour.length;
          const centroidY = sumY / contour.length;

          // Max radius from centroid (raster pixels)
          let maxRawRadius = 0;
          for (const p of contour) {
            const r = Math.hypot(p.x - centroidX, p.y - centroidY);
            if (r > maxRawRadius) maxRawRadius = r;
          }
          if (maxRawRadius < 1) return;

          // Resample to NUM_POINTS
          const resampled = resampleContour(contour, NUM_POINTS);

          // Scale: maps raster → viewBox so max radius = TARGET_MAX_RADIUS * KEY_SHRINK_FACTOR
          const scale = (TARGET_MAX_RADIUS * KEY_SHRINK_FACTOR) / maxRawRadius;

          // Convert to viewBox coords centred at CANVAS_CENTER
          const targets = resampled.map((p) => ({
            x: CANVAS_CENTER + (p.x - centroidX) * scale,
            y: CANVAS_CENTER + (p.y - centroidY) * scale,
          }));

          // Align winding + starting point with circle
          const aligned = alignContourToCircle(targets, CANVAS_CENTER, CANVAS_CENTER);
          keyTargetsRef.current = aligned;

          // Image placement: bounding box of target contour in viewBox space
          // This guarantees the detail image sits exactly where the morphed outline is
          let bbMinX = Infinity, bbMaxX = -Infinity, bbMinY = Infinity, bbMaxY = -Infinity;
          for (const p of aligned) {
            if (p.x < bbMinX) bbMinX = p.x;
            if (p.x > bbMaxX) bbMaxX = p.x;
            if (p.y < bbMinY) bbMinY = p.y;
            if (p.y > bbMaxY) bbMaxY = p.y;
          }
          const PAD = 1;
          keyImageRef.current = {
            href: DETAIL_LOGO_SRC,
            x: bbMinX - PAD,
            y: bbMinY - PAD,
            width: (bbMaxX - bbMinX) + PAD * 2,
            height: (bbMaxY - bbMinY) + PAD * 2,
          };
          setKeyImageReady(true);

          URL.revokeObjectURL(url);
        };

        img.src = url;
      } catch (err) {
        console.warn("BlobMorph: error loading key silhouette", err);
      }
    }

    loadKeySilhouette();
    return () => { cancelled = true; };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // Animation loop
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const shapeNoise = new SimplexNoise();
    const meshNoise = new SimplexNoise();

    const IDLE_AMPLITUDE_MAX = 9;
    const IDLE_SPEED = 0.00045;
    const STRETCH_STRENGTH_MAX = 24;
    const STIFFNESS = 0.06;
    const DAMPING = 0.82;

    const rOffsets = new Float32Array(NUM_POINTS);
    const rVelocities = new Float32Array(NUM_POINTS);

    const MESH_PATCH_COUNT = SPECULAR_PALETTE.length;
    const meshAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];

    const handleMouseMove = (e: MouseEvent) => {
      cursorRef.current = { x: e.clientX, y: e.clientY, active: true };
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      tiltCursorX.set((e.clientX - cx) / cx);
      tiltCursorY.set((e.clientY - cy) / cy);
    };

    const handleMouseLeave = () => {
      cursorRef.current.active = false;
      tiltCursorX.set(0);
      tiltCursorY.set(0);
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
      const idleAmplitude = IDLE_AMPLITUDE_MAX * fluidityFactor;
      const stretchStrength = STRETCH_STRENGTH_MAX * fluidityFactor;

      // Adaptive sharpness: smooth blob → sharp key outline
      const sharpness = Math.min(1, Math.max(0,
        (currentProgress - 0.6) / (SHAPE_LOCK_PROGRESS - 0.6)
      ));

      // SVG center in screen coords for cursor influence
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

      const keyTargets = keyTargetsRef.current;

      // ── Calculate interpolated polar angles ──
      // This is the core fix to prevent "noodling". Instead of lerping X and Y separately
      // (which drags points across the shape), we explicitly lerp the angle and radius
      // from the center. This gives a perfect radial "shrink" behavior without tangling.
      const currentAngles = new Float32Array(NUM_POINTS);
      for (let i = 0; i < NUM_POINTS; i++) {
        const circleAngle = (i / NUM_POINTS) * Math.PI * 2;
        if (!keyTargets) {
          currentAngles[i] = circleAngle;
        } else {
          const kx = keyTargets[i].x;
          const ky = keyTargets[i].y;
          const keyAngle = Math.atan2(ky - CANVAS_CENTER, kx - CANVAS_CENTER);
          let dAngle = keyAngle - circleAngle;
          // Ensure we rotate via the shortest path to avoid twisting
          if (dAngle > Math.PI) dAngle -= Math.PI * 2;
          if (dAngle < -Math.PI) dAngle += Math.PI * 2;
          currentAngles[i] = circleAngle + dAngle * currentProgress;
        }
      }

      // Cursor repulsion targets
      const rawTargets = new Float32Array(NUM_POINTS);
      let totalTarget = 0;
      if (influenceFactor > 0) {
        for (let i = 0; i < NUM_POINTS; i++) {
          const angle = currentAngles[i];
          let angleDiff = angle - cursorAngle;
          angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
          const frontFocus = Math.max(0, Math.cos(angleDiff));
          rawTargets[i] = Math.pow(frontFocus, 2.2) * influenceFactor * stretchStrength;
          totalTarget += rawTargets[i];
        }
        const meanTarget = totalTarget / NUM_POINTS;
        for (let i = 0; i < NUM_POINTS; i++) rawTargets[i] -= meanTarget * 0.95;
      }

      // Spring integration
      for (let i = 0; i < NUM_POINTS; i++) {
        const force = (rawTargets[i] - rOffsets[i]) * STIFFNESS;
        rVelocities[i] = (rVelocities[i] + force) * DAMPING;
        rOffsets[i] += rVelocities[i];
      }

      // Smooth across neighbours
      const smoothedOffsets = new Float32Array(NUM_POINTS);
      for (let i = 0; i < NUM_POINTS; i++) {
        const prev = rOffsets[(i - 1 + NUM_POINTS) % NUM_POINTS];
        const curr = rOffsets[i];
        const next = rOffsets[(i + 1) % NUM_POINTS];
        smoothedOffsets[i] = curr * 0.6 + (prev + next) * 0.2;
      }

      // ── Build morphed points (Polar Interpolation) ─────────────────
      const points: { x: number; y: number }[] = [];

      for (let i = 0; i < NUM_POINTS; i++) {
        const circleAngle = (i / NUM_POINTS) * Math.PI * 2;
        const circleRadius = BASE_RADIUS;
        const currentAngle = currentAngles[i];

        let currentRadius = circleRadius;
        if (keyTargets) {
          const kx = keyTargets[i].x;
          const ky = keyTargets[i].y;
          const keyRadius = Math.hypot(kx - CANVAS_CENTER, ky - CANVAS_CENTER);
          currentRadius = circleRadius + (keyRadius - circleRadius) * currentProgress;
        } else {
          currentRadius = circleRadius + ((circleRadius * KEY_SHRINK_FACTOR) - circleRadius) * currentProgress;
        }

        const baseX = CANVAS_CENTER + Math.cos(currentAngle) * currentRadius;
        const baseY = CANVAS_CENTER + Math.sin(currentAngle) * currentRadius;

        // Radial noise mapping uses the current angle so it tracks cleanly
        const cosA = Math.cos(currentAngle);
        const sinA = Math.sin(currentAngle);
        const n = shapeNoise.noise2D(cosA * 0.9, sinA * 0.9 + time);
        const noiseOffset = n * idleAmplitude;

        const totalRadialOffset = noiseOffset + smoothedOffsets[i];

        points.push({
          x: baseX + cosA * totalRadialOffset,
          y: baseY + sinA * totalRadialOffset,
        });
      }

      // Build path with adaptive smoothing
      const dString = buildAdaptivePath(points, sharpness);
      if (corePathRef.current) corePathRef.current.setAttribute("d", dString);
      if (haloPathRef.current) haloPathRef.current.setAttribute("d", dString);
      if (clipPathRef.current) clipPathRef.current.setAttribute("d", dString);
      if (detailClipPathRef.current) detailClipPathRef.current.setAttribute("d", dString);

      // ── Detail reveal ──────────────────────────────────────────
      const detailReveal = computeDetailReveal(currentProgress);

      // Halo glow
      if (glowBlurRef.current) {
        const currentBlur = 4 + 8 * (1 - detailReveal);
        glowBlurRef.current.setAttribute("stdDeviation", currentBlur.toFixed(2));
      }
      if (haloPathRef.current) {
        haloPathRef.current.style.opacity = String(0.03 + 0.09 * (1 - detailReveal));
      }

      // Core: the dark surface that covers the detail underneath.
      // As detail reveals, core becomes transparent → key emerges FROM the blob
      if (corePathRef.current) {
        corePathRef.current.style.fill = "url(#obsidian-body-grad)";
        corePathRef.current.style.stroke = "url(#obsidian-rim-grad)";
        // Core opacity fades to reveal the detail image beneath it
        corePathRef.current.style.opacity = String(1 - detailReveal);
        // Thicken rim during morph so the shape change is visible
        const morphRim = currentProgress > 0.3
          ? 0.6 * Math.min(1, (currentProgress - 0.3) / 0.4)
          : 0;
        corePathRef.current.style.strokeWidth = (0.8 + morphRim + 0.4 * detailReveal).toFixed(2);
      }

      // Specular sheen fades as key solidifies
      if (meshGroupRef.current) {
        meshGroupRef.current.style.opacity = String(0.6 * (1 - detailReveal));
      }

      // Detail group (clipped to morph shape): always full opacity in shapes,
      // the core path above it controls visibility
      if (detailGroupRef.current) {
        // Keep detail shapes at full opacity — the core path above hides them
        // until detailReveal kicks in and fades the core away
        detailGroupRef.current.style.opacity = "1";
      }
      // Set individual shapes to full opacity (the core covers them)
      if (shapeElRefs.current.length) {
        shapeElRefs.current.forEach((el) => {
          if (el) el.style.opacity = "1";
        });
      } else if (logoImageRef.current) {
        logoImageRef.current.style.opacity = "1";
      }

      // Specular mesh drift
      for (let p = 0; p < MESH_PATCH_COUNT; p++) {
        const baseA = meshAngles[p] + time * 1.2;
        const nX = meshNoise.noise2D(time * 1.5 + p, p * 10);
        const nY = meshNoise.noise2D(p * 10, time * 1.5 + p);

        const orbitRadius = 18 + nX * 8;
        const driftX = Math.cos(baseA) * orbitRadius + nX * 10;
        const driftY = Math.sin(baseA) * orbitRadius + nY * 10;

        const circle = meshCircleRefs.current[p];
        if (circle) {
          circle.setAttribute("cx", String(CANVAS_CENTER + driftX));
          circle.setAttribute("cy", String(CANVAS_CENTER + driftY));
          circle.setAttribute("r", "55");
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [tiltCursorX, tiltCursorY]);

  // ═══════════════════════════════════════════════════════════════════════
  // Load detail SVG shapes
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let cancelled = false;
    async function loadDetailShapes() {
      try {
        const res = await fetch(DETAIL_LOGO_SRC);
        const svgText = await res.text();
        const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
        const svgEl = doc.querySelector("svg");
        if (!svgEl || cancelled) return;

        const vb = svgEl.getAttribute("viewBox");
        const defsEl = svgEl.querySelector("defs");
        const nodes = Array.from(
          svgEl.querySelectorAll("path, circle, ellipse, rect, polygon, polyline")
        );
        const shapes: DetailShape[] = nodes.map((el) => ({
          tag: el.tagName.toLowerCase(),
          props: toReactProps(
            Object.fromEntries(Array.from(el.attributes).map((a) => [a.name, a.value]))
          ),
        }));

        setDetailViewBox(vb);
        setDetailDefsMarkup(defsEl ? defsEl.outerHTML : null);
        setDetailShapes(shapes);
      } catch (err) {
        console.warn("BlobMorph: could not parse detail shapes, falling back to flat image", err);
      }
    }
    loadDetailShapes();
    return () => { cancelled = true; };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // Render — layer order matters:
  //   1. Halo (ambient glow, behind everything)
  //   2. Detail image (clipped to morph shape — always ready, hidden by core)
  //   3. Core path (dark fill — fades away to reveal detail beneath)
  //   4. Specular mesh (liquid sheen, fades out)
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <motion.div className="fixed inset-0 z-10 flex items-center justify-center pointer-events-none">
      <motion.svg
        ref={svgRef}
        viewBox="0 0 200 200"
        className="w-[380px] h-[380px] sm:w-[520px] sm:h-[520px] md:w-[680px] md:h-[680px] pointer-events-auto"
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          perspective: 600,
          transformStyle: "preserve-3d",
        }}
      >
        <defs>
          <clipPath id="blob-mesh-clip">
            <path ref={clipPathRef} />
          </clipPath>

          <clipPath id="detail-clip">
            <path ref={detailClipPathRef} />
          </clipPath>

          <filter id="blob-ambient-halo" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur ref={glowBlurRef} in="SourceGraphic" stdDeviation="12" />
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

          <linearGradient id="obsidian-body-grad" x1="20%" y1="15%" x2="80%" y2="85%">
            <stop offset="0%" stopColor="#101014" />
            <stop offset="35%" stopColor="#040405" />
            <stop offset="100%" stopColor="#000000" />
          </linearGradient>

          <linearGradient id="obsidian-rim-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.65} />
            <stop offset="30%" stopColor="#ffffff" stopOpacity={0.15} />
            <stop offset="70%" stopColor="#ffffff" stopOpacity={0.02} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity={0.35} />
          </linearGradient>

          {SPECULAR_PALETTE.map((colorHex, i) => (
            <radialGradient key={i} id={`specular-patch-${i}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={colorHex} stopOpacity={i === 0 ? 0.12 : 0.06} />
              <stop offset="20%" stopColor={colorHex} stopOpacity={i === 0 ? 0.03 : 0.01} />
              <stop offset="100%" stopColor={colorHex} stopOpacity={0} />
            </radialGradient>
          ))}
        </defs>

        {/* 1. Ambient halo */}
        <path ref={haloPathRef} fill="#ffffff" filter="url(#blob-ambient-halo)" />

        {/* 2. Detail image — clipped to the morphing shape so it's always
               shaped by the outline. Hidden by the core path until reveal. */}
        {keyImageReady && keyImageRef.current && (
          <g ref={detailGroupRef} clipPath="url(#detail-clip)">
            {detailShapes && detailViewBox ? (
              <svg
                x={keyImageRef.current.x}
                y={keyImageRef.current.y}
                width={keyImageRef.current.width}
                height={keyImageRef.current.height}
                viewBox={detailViewBox}
                filter="url(#logo-glow-filter)"
                preserveAspectRatio="xMidYMid meet"
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
                      style={{ ...shape.props.style, opacity: 1 }}
                    />
                  );
                })}
              </svg>
            ) : (
              <image
                ref={logoImageRef}
                href={keyImageRef.current.href}
                x={keyImageRef.current.x}
                y={keyImageRef.current.y}
                width={keyImageRef.current.width}
                height={keyImageRef.current.height}
                filter="url(#logo-glow-filter)"
                style={{ opacity: 1 }}
                preserveAspectRatio="xMidYMid meet"
              />
            )}
          </g>
        )}

        {/* 3. Core dark fill — sits ON TOP of the detail layer.
               Fades from opaque → transparent as the key solidifies,
               revealing the detail image beneath. Same morphing outline. */}
        <path ref={corePathRef} />

        {/* 4. Specular mesh (liquid sheen, fades out) */}
        <g ref={meshGroupRef} clipPath="url(#blob-mesh-clip)" style={{ mixBlendMode: "screen" }}>
          {SPECULAR_PALETTE.map((_, i) => (
            <circle
              key={i}
              ref={(el) => { meshCircleRefs.current[i] = el; }}
              cx={CANVAS_CENTER}
              cy={CANVAS_CENTER}
              r={55}
              fill={`url(#specular-patch-${i})`}
            />
          ))}
        </g>
      </motion.svg>
    </motion.div>
  );
}
