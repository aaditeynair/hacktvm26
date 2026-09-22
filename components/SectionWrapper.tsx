/**
 * HackTVM'26 — Access Point
 * SectionWrapper — a scroll-snap section shell.
 *
 * Renders a full-viewport snap `<section>` with:
 *   • scroll-snap layout (`snap-section` CSS class)
 *   • a sr-only semantic heading tied to the section id
 *   • content fade PROPORTIONAL TO the section's intersection ratio with the
 *     viewport (not a binary active/inactive), so with proximity snap content
 *     glides in/out continuously as it enters/leaves the viewport instead of
 *     flashing at a toggle point.
 *   • `aria-hidden` for anything less than half-visible, so screen readers
 *     only announce the section that is actually on screen.
 *
 * Each section supplies its own internal layout (positioning content
 * around the fixed, centred blob). The wrapper just provides the shell.
 *
 * The `id` must match a value in SECTION_IDS so the footer dot-nav and
 * useActiveSection observer can locate it.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { SECTION_IDS, DURATIONS } from "@/lib/constants";
import type { SectionId } from "@/lib/constants";

/** IO thresholds — denser than binary so the fade tracks the scroll position
    closely between repaints. */
const RATIO_THRESHOLDS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];

interface SectionWrapperProps {
  /** Section id — must match an entry in SECTION_IDS for nav + observer. */
  id: SectionId;
  /** Semantic heading level (default 2). */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Rendered heading text. Defaults to the section's human label. */
  title?: string;
  /** Reduce motion handling. */
  children: React.ReactNode;
}

export function SectionWrapper({
  id,
  headingLevel = 2,
  title,
  children,
}: SectionWrapperProps) {
  const { isLoading, isReducedMotion } = useApp();
  const sectionIndex = SECTION_IDS.indexOf(id);
  const sectionRef = useRef<HTMLElement>(null);

  /* Section 0 starts fully visible so the first paint isn't a flash. */
  const [visibility, setVisibility] = useState(sectionIndex === 0 ? 1 : 0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    let disposed = false;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (disposed) return;
          setVisibility(entry.intersectionRatio);
        }
      },
      { threshold: RATIO_THRESHOLDS },
    );
    observer.observe(el);

    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, []);

  const visible = visibility > 0.5;
  const opacity = isLoading ? 0 : visibility;
  const Heading = `h${headingLevel}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

  return (
    <section
      id={id}
      aria-label={title ?? id}
      aria-hidden={!visible}
      ref={sectionRef}
      className="snap-section relative scroll-mt-0"
    >
      {/* Fade tracks the ratio; the transition only smooths IO's stepped
          threshold updates, it never re-creates a binary fade. Reduced motion
          keeps the same ratio logic but applies it instantly. */}
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{ opacity }}
        transition={{ duration: isReducedMotion ? 0 : DURATIONS.normal, ease: "easeOut" }}
      >
        <Heading className="sr-only">{title ?? id}</Heading>

        {/* Each section composes its own layout around the blob */}
        {children}
      </motion.div>
    </section>
  );
}