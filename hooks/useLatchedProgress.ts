/**
 * HackTVM'26 — Access Point
 * useLatchedProgress — key-resolution lock-in.
 *
 * The blob→key morph only ever happens on the FIRST trip to the end of the
 * page. The moment the key fully resolves (progress reaches BlobMorph's
 * KEY_RIGID_PROGRESS, where the detail is fully visible and further scroll is
 * visually identical), the effective progress latches to 1 for the rest of the
 * session: the resolved key permanently replaces the blob on every section,
 * so scrolling back up/down never replays the shapeless/resolving blob states.
 *
 * Before the latch, raw progress passes through untouched (first visit is
 * exactly as before). This only transforms the progress VALUE fed into
 * BlobMorph — its physics loop and thresholds are never touched.
 */
"use client";

import { useRef } from "react";
import { KEY_RIGID_PROGRESS } from "@/components/BlobMorph";

export function useLatchedProgress(raw: number): number {
  const resolvedRef = useRef(false);

  if (raw >= KEY_RIGID_PROGRESS) {
    /* Full resolution is only reached on the key section (desktop scroll or
       mobile key beats), so latching here is unambiguous. */
    resolvedRef.current = true;
  }

  return resolvedRef.current ? 1 : raw;
}