"use client";

import { useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { KEY_RIGID_PROGRESS } from "@/components/BlobMorph";

/**
 * HackTVM'26 — Access Point
 * KeyHitArea — invisible tap target layered over the resolved keycap.
 *
 * Rendered inside the shared BlobStage so it always sits exactly where the
 * blob does. Stays fully inert (no pointer events, not focusable, hidden
 * from AT) until the blob has fully resolved: activeSection is The Key AND
 * scroll progress has reached KEY_RIGID_PROGRESS. Once active it shows a
 * hint ("Tap/Click the key") and, on click, captures its on-screen rect and
 * opens the key modal from that origin.
 */

export const KEY_HIT_AREA_ID = "key-hit-area";

/**
 * Keycap bounds as fractions of the blob SVG's box (the SVG's viewBox is 200×200,
 * and the rendered box is --blob-size: 380/520/680px). Derived from BlobMorph's
 * own silhouette pipeline so the hit area always covers exactly where the key
 * renders, at every breakpoint:
 *
 *   silhouette.svg rasterized at 400 → ink centroid (179.6, 197.9),
 *   max radius 159.0 → scale = (90 × 0.42) / 159.0 = 0.2378.
 *
 *   resolved silhouette polygon bbox (200-viewBox): (82.4, 62.3) → (117.6, 137.7)
 *   detail key.svg placement                (200-viewBox): (57.3, 57.9) → (152.4, 134.5)
 *
 *   union + 3% margin per side:  (51.3, 51.9) → (158.4, 143.7)
 *   → size (53.56% × 45.90%), center (52.43%, 48.92%) of the SVG box.
 */
interface KeyHitAreaProps {
  /** Raw scroll progress 0.0 → 1.0 (same value fed to BlobMorph). */
  progress: number;
}

export function KeyHitArea({ progress }: KeyHitAreaProps) {
  const { activeSection, isTouchDevice, setIsModalOpen, setModalOrigin } = useApp();

  const isActive = activeSection === 4 && progress >= KEY_RIGID_PROGRESS;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setModalOrigin({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height,
      });
      setIsModalOpen(true);
    },
    [setModalOrigin, setIsModalOpen],
  );

  return (
    /* Overlay box exactly matching the blob SVG's rendered box (both are
       stacked in the stage's shared grid cell), so the % below map 1:1 onto
       the SVG's own box at every breakpoint. Always pointer-events-none; only
       the button opts back in once active. */
    <div className="relative pointer-events-none h-[var(--blob-size)] w-[var(--blob-size)]">
      <button
        id={KEY_HIT_AREA_ID}
        type="button"
        aria-label="Open registration details"
        aria-hidden={!isActive}
        tabIndex={isActive ? 0 : -1}
        onClick={handleClick}
        className={[
          "absolute -translate-x-1/2 -translate-y-1/2",
          "left-[52.43%] top-[48.92%]",
          "w-[calc(var(--blob-size)*0.5356)] h-[calc(var(--blob-size)*0.459)]",
          "min-w-12 min-h-12",
          "touch-manipulation select-none",
          "appearance-none",
          "transition-opacity duration-500",
          isActive
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
      >
        <span className="sr-only">The key</span>
      </button>

      {isActive && (
        <p
          aria-hidden="true"
          className={[
            "absolute left-1/2 -translate-x-1/2",
            "top-[calc(var(--blob-size)*0.7187_+_0.75rem)]",
            "font-mono text-xs uppercase tracking-[0.2em] whitespace-nowrap",
            "text-cream/70 pointer-events-none",
          ].join(" ")}
        >
          {isTouchDevice ? "Tap the key" : "Click the key"}
        </p>
      )}
    </div>
  );
}