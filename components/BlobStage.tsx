"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * HackTVM'26 — Access Point
 * Shared blob stage — the fixed, centered container that the persistent blob
 * and the key hit-area both render inside so they always stay aligned.
 *
 * Positioning/sizing is inherited from CSS variables (--blob-stage-*), which
 * makes it trivial to move the whole stage to a top-half region on mobile
 * later without touching the children. A `style`/`className` prop can override
 * anything per-instance.
 *
 * Children are STACKED in a single centered grid cell — NOT laid out side by
 * side (a flex row used to push the blob left and the key hit-area right).
 * Every child (`BlobMorph`'s svg, `KeyHitArea`'s overlay box) occupies the
 * same 1/1 cell and is centered via `place-items-center`, so they always
 * overlap exactly regardless of their individual sizes.
 */
interface BlobStageProps {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function BlobStage({ className = "", style, children }: BlobStageProps) {
  return (
    <div
      className={`fixed inset-0 z-10 pointer-events-none grid place-items-center [&>*]:[grid-area:1/1] ${className}`}
      style={{
        transform:
          "translate(var(--blob-stage-offset-x), var(--blob-stage-offset-y))",
        ...style,
      }}
    >
      {children}
    </div>
  );
}