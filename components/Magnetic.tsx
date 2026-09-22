/**
 * HackTVM'26 — Access Point
 * Magnetic — subtle cursor-pull + proximity glow for primary targets.
 *
 * Desktop (pointer devices only): a window-level pointermove tracks the cursor
 * distance from the element center. Inside the proximity `radius` the wrapper
 * translates a few px toward the cursor (spring-smoothed, never more than
 * `pull`) and its box-shadow glow ramps up with closeness, then springs back
 * to rest when the cursor leaves. Uses a window listener so the effect engages
 * BEFORE the cursor actually reaches the element, like a real magnet.
 *
 * Touch devices: no cursor to track — the wrapper stays put (no transform) and
 * no listeners are attached. Tap feedback comes from the `.glow-press` CSS
 * class added to the child at the call site.
 *
 * Reduced motion (desktop): transforms are never touched (no movement); only
 * the soft proximity glow follows the cursor.
 *
 * The wrapper never changes layout: it's sized/shaped like the child and only
 * carries transform + box-shadow, so nothing shifts or reflows. `style` can
 * position the wrapper absolutely when the child needs explicit placement.
 */
"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
  type SpringOptions,
} from "framer-motion";
import { useCallback, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useApp } from "@/context/AppContext";

interface MagneticProps {
  children: ReactNode;
  /** Proximity radius (px) from the element center that engages the effect. */
  radius?: number;
  /** Max translate toward the cursor, in px. 0 = pure glow. */
  pull?: number;
  /** Max glow spread, in px. 0 = no glow. */
  glow?: number;
  /** Glow color as `r,g,b` (nice against near-black): */
  color?: string;
  /** Corner radius used for the glow, matching the child's shape. */
  borderRadius?: string;
  className?: string;
  style?: CSSProperties;
  /** Spring tuning for the pull + glow. */
  spring?: Partial<SpringOptions>;
}

const DEFAULT_SPRING: SpringOptions = { stiffness: 240, damping: 24, mass: 0.6 };

export function Magnetic({
  children,
  radius = 110,
  pull = 8,
  glow = 16,
  color = "233,228,201",
  borderRadius = "12px",
  className = "inline-block",
  style,
  spring = DEFAULT_SPRING,
}: MagneticProps) {
  const { isTouchDevice, isReducedMotion } = useApp();
  const ref = useRef<HTMLDivElement>(null);

  const targetX = useMotionValue(0);
  const targetY = useMotionValue(0);
  const targetGlow = useMotionValue(0);
  const x: MotionValue<number> = useSpring(targetX, spring);
  const y: MotionValue<number> = useSpring(targetY, spring);
  const glowV: MotionValue<number> = useSpring(targetGlow, spring);
  const glowHalf: MotionValue<number> = useTransform(glowV, (v) => v / 2);

  const boxShadow = useMotionTemplate`0 0 ${glowV}px ${glowHalf}px rgba(${color}, 0.4)`;

  const track = useCallback(
    (e: PointerEvent) => {
      /* Only a real mouse (never touch/stylus drags). */
      if (e.pointerType !== "mouse") return;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);

      if (dist <= radius) {
        const t = 1 - dist / radius;
        if (!isReducedMotion) {
          const ux = dist > 0 ? dx / dist : 0;
          const uy = dist > 0 ? dy / dist : 0;
          targetX.set(ux * pull * t);
          targetY.set(uy * pull * t);
        }
        targetGlow.set(glow * t);
      } else {
        if (!isReducedMotion) {
          targetX.set(0);
          targetY.set(0);
        }
        targetGlow.set(0);
      }
    },
    [radius, pull, glow, isReducedMotion, targetX, targetY, targetGlow],
  );

  useEffect(() => {
    if (isTouchDevice) return; // no cursor on touch
    window.addEventListener("pointermove", track);
    return () => window.removeEventListener("pointermove", track);
  }, [isTouchDevice, track]);

  /* boxShadow template stays active so only the glow ramps; visual change is
     purely transform + box-shadow — never layout. */
  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        borderRadius,
        boxShadow,
        ...style,
      }}
      data-magnetic
    >
      {children}
    </motion.div>
  );
}