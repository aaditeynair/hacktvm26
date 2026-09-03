/**
 * Hook: useCursorTrack
 *
 * Tracks the mouse cursor position normalized to [-1, 1] relative to
 * the centre of the page (or a given element).
 *
 * On touch devices or when prefers-reduced-motion is active,
 * always returns { x: 0, y: 0 } (no cursor tracking).
 *
 * Throttled to requestAnimationFrame for 60 fps performance.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";
import { useIsTouch } from "./useIsTouch";

interface CursorPosition {
  x: number;
  y: number;
}

/**
 * @param elementRef  Optional ref to measure relative to a specific element.
 *                    If omitted, measures relative to the viewport centre.
 *                    Accepts any element with getBoundingClientRect (HTMLElement, SVGElement, etc.).
 */
export function useCursorTrack(
  elementRef?: React.RefObject<{ getBoundingClientRect: () => DOMRect } | null>,
): CursorPosition {
  const reduced = useReducedMotion();
  const touch = useIsTouch();
  const [pos, setPos] = useState<CursorPosition>({ x: 0, y: 0 });
  const raf = useRef<number>(0);

  useEffect(() => {
    /* Disable tracking on touch devices or when motion is reduced */
    if (touch || reduced) return;

    const handleMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        const el = elementRef?.current;
        const cx = el
          ? el.getBoundingClientRect().left + el.getBoundingClientRect().width / 2
          : window.innerWidth / 2;
        const cy = el
          ? el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2
          : window.innerHeight / 2;

        /* Normalise to [-1, 1] using half-viewport as the scale */
        const halfW = window.innerWidth / 2;
        const halfH = window.innerHeight / 2;

        setPos({
          x: Math.max(-1, Math.min(1, (e.clientX - cx) / halfW)),
          y: Math.max(-1, Math.min(1, (e.clientY - cy) / halfH)),
        });
      });
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(raf.current);
    };
  }, [elementRef, touch, reduced]);

  return pos;
}
