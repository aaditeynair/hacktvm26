"use client";

import { useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { KEY_RIGID_PROGRESS, KEY_VISUAL_ID } from "@/components/BlobMorph";

/**
 * HackTVM'26 — Access Point
 * KeyHitArea — invisible tap target layered over the resolved keycap.
 *
 * Rendered inside the shared BlobStage so it always sits exactly where the
 * blob does. Stays fully inert (no pointer events, not focusable, hidden
 * from AT) until the blob has fully resolved: on the first run that is only
 * on the Key section (progress reaches KEY_RIGID_PROGRESS there); once the
 * key has resolved it permanently replaces the blob on every section, so the
 * hit area stays live and clickable everywhere. It shows a hint
 * ("Tap/Click the key") when armed and, on click, pushes the visible key logo
 * down to ~90%, lets it spring back, then opens the key modal from its rect.
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

/** Three-stage mechanical click: drop, sit at the bottom, then click-pop back
    with a pronounced overshoot — a deliberate clunky feel rather than a
    smooth spring. */
const LOGO_PRESS_MS = 100; //  → scale(0.9), quick sharp drop
const LOGO_DWELL_MS = 200; //   hold at the bottom (mechanism "sits")
const LOGO_RELEASE_MS = 340; // → scale(1), same speed, no overshoot

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function KeyHitArea({ progress }: KeyHitAreaProps) {
  const {
    isTouchDevice,
    isReducedMotion,
    setIsModalOpen,
    setModalOrigin,
  } = useApp();

  /* Armed whenever the key is resolved. Pre-latch that only happens on the key
     section (progress reaches KEY_RIGID_PROGRESS there and nowhere else); once
     latched, the resolved key replaces the blob on every section, so the hit
     area stays live everywhere. */
  const isActive = progress >= KEY_RIGID_PROGRESS;

  /* Shrink the visible key logo to ~90%, let it spring back, then return so
     the modal opens only after the click-push reads complete. Reduced motion
     skips straight past. */
  const pressKey = useCallback(async () => {
    if (isReducedMotion) return;
    const el = document.getElementById(KEY_VISUAL_ID);
    if (!el) return;

    el.style.transition = `transform ${LOGO_PRESS_MS}ms ease-out`;
    el.style.transform = "scale(0.9)";
    await delay(LOGO_PRESS_MS);

    await delay(LOGO_DWELL_MS);

    el.style.transition = `transform ${LOGO_RELEASE_MS}ms cubic-bezier(0.25, 0, 0.2, 1)`;
    el.style.transform = "scale(1)";
    await delay(LOGO_RELEASE_MS);
  }, [isReducedMotion]);

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      /* Capture the rect BEFORE the push so the modal grows from the key's
         rest position, not the shrunk frame. */
      const rect = e.currentTarget.getBoundingClientRect();
      setModalOrigin({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height,
      });
      await pressKey();
      setIsModalOpen(true);
    },
    [pressKey, setModalOrigin, setIsModalOpen],
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