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
    <div className="relative">
      <button
        id={KEY_HIT_AREA_ID}
        type="button"
        aria-label="Open registration details"
        aria-hidden={!isActive}
        tabIndex={isActive ? 0 : -1}
        onClick={handleClick}
        className={[
          "w-[min(70vw,340px)] h-[min(70vw,340px)]",
          "min-w-12 min-h-12",
          "touch-manipulation select-none",
          "rounded-full appearance-none",
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
            "absolute left-1/2 top-full mt-3 -translate-x-1/2",
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