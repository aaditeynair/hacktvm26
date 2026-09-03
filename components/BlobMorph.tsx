"use client";

import React, { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

/* ========================================================================
   1. Self-Contained 2D Simplex Noise (Zero external dependencies)
   ======================================================================== */
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

/* ========================================================================
   2. Smooth Bezier Path Generator (Midpoint Quadratic Curve)
   ======================================================================== */
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

/* ========================================================================
   3. Target Keycap Silhouette Radii (16-point isometric diamond)
   ======================================================================== */
const KEYCAP_TARGET_RADII = [
  82, // 0°   (Rightmost corner)
  76, // 22.5°
  72, // 45°  (Bottom-right edge)
  84, // 67.5°
  90, // 90°  (Bottom-most corner)
  84, // 112.5°
  72, // 135° (Bottom-left edge)
  76, // 157.5°
  82, // 180° (Leftmost corner)
  68, // 202.5°
  64, // 225° (Top-left edge)
  60, // 247.5°
  58, // 270° (Top-most edge)
  60, // 292.5°
  64, // 315° (Top-right edge)
  68  // 337.5°
];

interface BlobMorphProps {
  /**
   * Scroll progress from 0.0 (Section 1: fully fluid blob) 
   * to 1.0 (Section 5: fully resolved keycap).
   */
  progress?: number;
}

/* ========================================================================
   4. BlobMorph Main Component
   ======================================================================== */
export function BlobMorph({ progress = 0 }: BlobMorphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const detailOverlayRef = useRef<SVGGElement>(null);

  // Synchronize incoming progress prop with animation frame ref
  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // Section 5 3D Tilt Values
  const isKeyActive = progress >= 0.95;
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
    const noise = new SimplexNoise();

    const NUM_POINTS = 16;
    const CANVAS_CENTER = 100;
    const BASE_RADIUS = 72; // Enlarged base geometric scale
    const IDLE_AMPLITUDE_MAX = 9;
    const IDLE_SPEED = 0.00045;

    const STRETCH_STRENGTH_MAX = 24;
    const STIFFNESS = 0.06;
    const DAMPING = 0.82;

    const rOffsets = new Float32Array(NUM_POINTS);
    const rVelocities = new Float32Array(NUM_POINTS);

    const handleMouseMove = (e: MouseEvent) => {
      cursorRef.current = {
        x: e.clientX,
        y: e.clientY,
        active: true,
      };

      // Feed Section 5 3D tilt coordinates [-1, 1]
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
      const currentProgress = Math.min(1, Math.max(0, progressRef.current));

      // As scroll progress increases, fluidity and cursor elasticity taper down
      const fluidityFactor = Math.pow(1 - currentProgress, 1.8);
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

      // Viewport influence scope (75% of max screen dimension)
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

      // 1. Calculate Stretch & Equal Inward Compression (Volume Preserving)
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

        // Pinch sides/back inward to keep area constant
        const meanTarget = totalTarget / NUM_POINTS;
        for (let i = 0; i < NUM_POINTS; i++) {
          rawTargets[i] -= meanTarget * 0.95;
        }
      }

      // 2. Physics Spring Step
      for (let i = 0; i < NUM_POINTS; i++) {
        const force = (rawTargets[i] - rOffsets[i]) * STIFFNESS;
        rVelocities[i] = (rVelocities[i] + force) * DAMPING;
        rOffsets[i] += rVelocities[i];
      }

      // 3. Laplacian Neighbor Smoothing (Eliminates sharp spikes)
      const smoothedOffsets = new Float32Array(NUM_POINTS);
      for (let i = 0; i < NUM_POINTS; i++) {
        const prev = rOffsets[(i - 1 + NUM_POINTS) % NUM_POINTS];
        const curr = rOffsets[i];
        const next = rOffsets[(i + 1) % NUM_POINTS];

        smoothedOffsets[i] = curr * 0.6 + (prev + next) * 0.2;
      }

      // 4. Interpolate Target Geometry & Render SVG Path
      const points: { x: number; y: number }[] = [];

      for (let i = 0; i < NUM_POINTS; i++) {
        const angle = (i / NUM_POINTS) * Math.PI * 2;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        // Smoothly lerp base circle toward the isometric keycap target radii
        const targetKeyRadius = KEYCAP_TARGET_RADII[i];
        const baseMorphRadius = (1 - currentProgress) * BASE_RADIUS + currentProgress * targetKeyRadius;

        // Idle Perlin/Simplex noise modulation
        const n = noise.noise2D(cosA * 0.9, sinA * 0.9 + time);
        const idleRadius = baseMorphRadius + n * idleAmplitude;

        const finalRadius = idleRadius + smoothedOffsets[i];

        points.push({
          x: CANVAS_CENTER + finalRadius * cosA,
          y: CANVAS_CENTER + finalRadius * sinA,
        });
      }

      if (pathRef.current) {
        pathRef.current.setAttribute("d", buildSmoothPath(points));
      }

      // Fade in inner top-cap bevel details & "H" logo when progress > 0.75
      if (detailOverlayRef.current) {
        const detailOpacity = Math.max(0, (currentProgress - 0.75) / 0.25);
        detailOverlayRef.current.style.opacity = detailOpacity.toString();
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
          <linearGradient id="blob-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>

          <filter id="blob-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={isKeyActive ? "8" : "4"} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* LAYER 1: Base Morphing Blob Path */}
        <path
          ref={pathRef}
          fill="url(#blob-gradient)"
          filter="url(#blob-glow)"
          opacity={0.94}
        />

        {/* LAYER 2: Inner Keycap Top Face Bevel & "H" Legend Overlay */}
        <g ref={detailOverlayRef} style={{ opacity: 0, transition: "opacity 0.15s linear" }}>
          {/* Top Keycap Face Quad Outline */}
          <polygon
            points="62,72 138,52 160,82 82,108"
            fill="none"
            stroke="rgba(255, 255, 255, 0.45)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Isometric "H" Logo */}
          <g transform="translate(100, 78) rotate(-16) skewX(25) scale(0.65)">
            <path
              d="M -15,-20 H -5 V -4 H 5 V -20 H 15 V 20 H 5 V 4 H -5 V 20 H -15 Z"
              fill="#ffffff"
            />
          </g>
        </g>
      </motion.svg>
    </motion.div>
  );
}
