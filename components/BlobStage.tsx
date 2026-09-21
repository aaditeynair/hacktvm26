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
 * Desktop behaviour reproduces the previous BlobMorph wrapper exactly:
 * fixed, inset-0, z-10, flex-centered, pointer-events pass-through.
 */
interface BlobStageProps {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function BlobStage({ className = "", style, children }: BlobStageProps) {
  return (
    <div
      className={`fixed inset-0 z-10 flex items-center justify-center pointer-events-none ${className}`}
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