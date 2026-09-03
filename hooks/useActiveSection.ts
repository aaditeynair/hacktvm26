/**
 * Hook: useActiveSection
 *
 * Detects which snap-section is currently the "active" one using
 * IntersectionObserver (threshold ~60% visible). Returns the section
 * index, which is synced into the global AppContext.
 *
 * The observer fires when a section crosses the viewport centre.
 * Only the section whose visible ratio exceeds `ACTIVE_RATIO` is
 * considered active, so mid-scroll flicker between neighbours is avoided.
 */
"use client";

import { useEffect, useRef } from "react";
import { SECTION_IDS } from "@/lib/constants";
import { useApp } from "@/context/AppContext";

/** Ratio of a section that must be visible before it counts as active. */
const ACTIVE_RATIO = 0.6;

export function useActiveSection() {
  const { setActiveSection, isReducedMotion } = useApp();
  const rafRef = useRef<number>(0);

  useEffect(() => {
    /* In reduced-motion we relax snap; still track sections but with a
       lower threshold so navigation remains useful. */
    const ratio = isReducedMotion ? 0.4 : ACTIVE_RATIO;

    const observer = new IntersectionObserver(
      (entries) => {
        /* Batch selection to the frame to avoid mid-scroll flapping */
        let best: { index: number; ratio: number } | null = null;

        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = SECTION_IDS.indexOf(
            entry.target.id as (typeof SECTION_IDS)[number],
          );
          if (idx < 0) continue;
          const current = entry.intersectionRatio;
          if (!best || current > best.ratio) {
            best = { index: idx, ratio: current };
          }
        }

        if (!best) return;

        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          /* Only update if it's a meaningful change (avoid jitter) */
          setActiveSection(best!.index);
        });
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
    };
  }, [setActiveSection, isReducedMotion]);
}
