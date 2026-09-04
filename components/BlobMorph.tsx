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

const NUM_POINTS = 16;
const CANVAS_CENTER = 100;
const BASE_RADIUS = 72;

const KEY_SHRINK_FACTOR = 0.42;

const FALLBACK_KEYCAP_RADII = [
  82, 76, 72, 84, 90, 84, 72, 76, 82, 68, 64, 60, 58, 60, 64, 68,
];

const TARGET_MAX_RADIUS = 90;

// Shifted threshold: Section 4 is at 0.75 progress, so transition starts at 0.80 (Section 5)
const FLUID_HOLD_PROGRESS = 0.80;
const KEY_RIGID_PROGRESS = 0.96;

function computeFluidity(p: number): number {
  if (p <= FLUID_HOLD_PROGRESS) {
    return 1 - 0.2 * (p / FLUID_HOLD_PROGRESS);
  }
  const t = Math.min(1, (p - FLUID_HOLD_PROGRESS) / (KEY_RIGID_PROGRESS - FLUID_HOLD_PROGRESS));
  const eased = t * t * (3 - 2 * t);
  return 0.8 * (1 - eased);
}

const PROGRESS_LERP = 0.08;

const SPECULAR_PALETTE = ["#ffffff", "#cbd5e1", "#e2e8f0", "#ffffff"];

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
  const glowBlurRef = useRef<SVGFEGaussianBlurElement>(null);
  const logoImageRef = useRef<SVGImageElement>(null);

  const meshGroupRef = useRef<SVGGElement>(null);
  const meshCircleRefs = useRef<(SVGCircleElement | null)[]>([]);

  const targetRadiiRef = useRef<Float32Array>(Float32Array.from(FALLBACK_KEYCAP_RADII));
  const keyImageRef = useRef<KeyImagePlacement | null>(null);
  const [keyImageReady, setKeyImageReady] = useState(false);

  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const smoothedProgressRef = useRef(0);

  const isKeyActive = progress >= KEY_RIGID_PROGRESS;
  const tiltCursorX = useMotionValue(0);
  const tiltCursorY = useMotionValue(0);

  const rawRotateX = useTransform(tiltCursorY, (v) => (isKeyActive ? v * -18 : 0));
  const rawRotateY = useTransform(tiltCursorX, (v) => (isKeyActive ? v * 18 : 0));
  const springRotateX = useSpring(rawRotateX, { stiffness: 90, damping: 16 });
  const springRotateY = useSpring(rawRotateY, { stiffness: 90, damping: 16 });

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
        const res = await fetch("/key.svg");
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
            console.warn("BlobMorph: could not read key.svg pixel data", err);
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
          const boundingDiagonal = Math.max(maxX - minX, maxY - minY);

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

          const scale = (2 * TARGET_MAX_RADIUS * KEY_SHRINK_FACTOR) / boundingDiagonal;

          targetRadiiRef.current = normalizedRadii;
          keyImageRef.current = {
            href: url,
            x: CANVAS_CENTER - centroidX * scale,
            y: CANVAS_CENTER - centroidY * scale,
            width: drawW * scale,
            height: drawH * scale,
          };
          setKeyImageReady(true);
        };

        img.src = url;
      } catch (err) {
        console.warn("BlobMorph: error loading key.svg silhouette", err);
      }
    }

    loadKeySilhouette();
    return () => {
      cancelled = true;
    };
  }, []);

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
      cursorRef.current = {
        x: e.clientX,
        y: e.clientY,
        active: true,
      };

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
          (1 - currentProgress) * BASE_RADIUS + currentProgress * targetKeyRadius;

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
      if (clipPathRef.current) clipPathRef.current.setAttribute("d", dString);

      // BLOB DISSOLVE & LOGO FADE: Dissolves between progress 0.80 and 0.96 (Section 5)
      const blobFadeFactor = Math.min(
        1,
        Math.max(0, (currentProgress - FLUID_HOLD_PROGRESS) / (KEY_RIGID_PROGRESS - FLUID_HOLD_PROGRESS))
      );
      const blobOpacity = Math.max(0, 1 - blobFadeFactor);

      // 1. NEUTRAL BACKLIGHT HALO
      if (glowBlurRef.current) {
        const currentBlur = 12 * blobOpacity;
        glowBlurRef.current.setAttribute("stdDeviation", currentBlur.toFixed(2));
      }

      if (haloPathRef.current) {
        haloPathRef.current.style.opacity = String(0.12 * blobOpacity);
      }

      // 2. CORE BLOB FADE OUT
      if (corePathRef.current) {
        corePathRef.current.style.fill = "url(#obsidian-body-grad)";
        corePathRef.current.style.stroke = "url(#obsidian-rim-grad)";
        corePathRef.current.style.opacity = String(blobOpacity);

        const strokeW = 0.8 + 0.4 * (1 - blobOpacity);
        corePathRef.current.style.strokeWidth = strokeW.toFixed(2);
      }

      // 3. SPECULAR GLARE DISSOLVE
      if (meshGroupRef.current) {
        meshGroupRef.current.style.opacity = String(0.6 * blobOpacity);
      }

      // 4. LOGO FADE IN (Exact mirror of blob dissolve)
      if (logoImageRef.current) {
        logoImageRef.current.style.opacity = String(blobFadeFactor);
      }

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

          {/* Ambient neutral halo */}
          <filter id="blob-ambient-halo" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur ref={glowBlurRef} in="SourceGraphic" stdDeviation="12" />
          </filter>

          {/* Soft White/Silver Glow for the Final Logo */}
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

          {/* Deep pitch black body gradient */}
          <linearGradient id="obsidian-body-grad" x1="20%" y1="15%" x2="80%" y2="85%">
            <stop offset="0%" stopColor="#101014" />
            <stop offset="35%" stopColor="#040405" />
            <stop offset="100%" stopColor="#000000" />
          </linearGradient>

          {/* Crisp, subtle white rim stroke */}
          <linearGradient id="obsidian-rim-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.65} />
            <stop offset="30%" stopColor="#ffffff" stopOpacity={0.15} />
            <stop offset="70%" stopColor="#ffffff" stopOpacity={0.02} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity={0.35} />
          </linearGradient>

          {/* Tightened, high-decay specular highlights */}
          {SPECULAR_PALETTE.map((colorHex, i) => (
            <radialGradient key={i} id={`specular-patch-${i}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={colorHex} stopOpacity={i === 0 ? 0.12 : 0.06} />
              <stop offset="20%" stopColor={colorHex} stopOpacity={i === 0 ? 0.03 : 0.01} />
              <stop offset="100%" stopColor={colorHex} stopOpacity={0} />
            </radialGradient>
          ))}
        </defs>

        {/* Soft Backlight separation */}
        <path ref={haloPathRef} fill="#ffffff" filter="url(#blob-ambient-halo)" />

        {/* Main Blob: Pitch Black body with subtle edge outline */}
        <path ref={corePathRef} />

        {/* Specular Liquid Sheen Overlay */}
        <g ref={meshGroupRef} clipPath="url(#blob-mesh-clip)" style={{ mixBlendMode: "screen" }}>
          {SPECULAR_PALETTE.map((_, i) => (
            <circle
              key={i}
              ref={(el) => {
                meshCircleRefs.current[i] = el;
              }}
              cx={CANVAS_CENTER}
              cy={CANVAS_CENTER}
              r={55}
              fill={`url(#specular-patch-${i})`}
            />
          ))}
        </g>

        {/* Final Illuminated Logo: Opacity controlled directly in tick() */}
        {keyImageReady && keyImageRef.current && (
          <image
            ref={logoImageRef}
            href={keyImageRef.current.href}
            x={keyImageRef.current.x}
            y={keyImageRef.current.y}
            width={keyImageRef.current.width}
            height={keyImageRef.current.height}
            filter="url(#logo-glow-filter)"
            style={{ opacity: 0 }}
            preserveAspectRatio="xMidYMid meet"
          />
        )}
      </motion.svg>
    </motion.div>
  );
}
