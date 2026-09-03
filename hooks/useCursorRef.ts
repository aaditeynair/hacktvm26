/**
 * Hook: useCursorRef
 *
 * Tracks the mouse cursor position normalised to [-1, 1] relative to
 * the centre of the page (or a given element).
 *
 * Unlike useCursorTrack, this writes directly to a mutable ref —
 * zero React re-renders, zero RAF loop restarts. The animation loop
 * reads cursorRef.current synchronously on each frame.
 *
 * Returns a stable ref object whose `.current` is always the latest
 * cursor position.
 */
"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "./useReducedMotion";
import { useIsTouch } from "./useIsTouch";

export interface CursorPos {
  x: number;
  y: number;
}

/**
 * @param elementRef  Optional ref to measure relative to a specific element.
 *                    If omitted, measures relative to the viewport centre.
 */
export function useCursorRef(
  elementRef?: React.RefObject<{ getBoundingClientRect: () => DOMRect } | null>,
): React.MutableRefObject<CursorPos> {
  const reduced = useReducedMotion();
  const touch = useIsTouch();
  const cursorRef = useRef<CursorPos>({ x: 0, y: 0 });

  useEffect(() => {
    if (touch || reduced) return;

    const handleMove = (e: MouseEvent) => {
      const el = elementRef?.current;
      const rect = el?.getBoundingClientRect();
      const cx = rect
        ? rect.left + rect.width / 2
        : window.innerWidth / 2;
      const cy = rect
        ? rect.top + rect.height / 2
        : window.innerHeight / 2;

      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;

      cursorRef.current = {
        x: Math.max(-1, Math.min(1, (e.clientX - cx) / halfW)),
        y: Math.max(-1, Math.min(1, (e.clientY - cy) / halfH)),
      };
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [elementRef, touch, reduced]);

  return cursorRef;
}
