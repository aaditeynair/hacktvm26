/**
 * HackTVM'26 — Access Point
 * SectionWrapper — a scroll-snap section shell.
 *
 * Renders a full-viewport snap `<section>` with:
 *   • scroll-snap layout (`snap-section` CSS class)
 *   • a sr-only semantic heading tied to the section id
 *   • content opacity fade via Framer Motion when it becomes active
 *   • `aria-hidden` toggling so screen readers only announce the active
 *     section.
 *
 * Each section supplies its own internal layout (positioning content
 * around the fixed, centred blob). The wrapper just provides the shell.
 *
 * The `id` must match a value in SECTION_IDS so the footer dot-nav and
 * useActiveSection observer can locate it.
 */
"use client";

import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { SECTION_IDS, DURATIONS } from "@/lib/constants";
import type { SectionId } from "@/lib/constants";

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
  const { activeSection, isLoading, isReducedMotion } = useApp();
  const sectionIndex = SECTION_IDS.indexOf(id);
  const isActive = sectionIndex === activeSection;

  const Heading = `h${headingLevel}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

  return (
    <section
      id={id}
      aria-label={title ?? id}
      aria-hidden={!isActive}
      className="snap-section relative scroll-mt-0"
    >
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoading ? 0 : isActive ? 1 : 0 }}
        transition={{ duration: isReducedMotion ? 0 : DURATIONS.normal }}
      >
        {/* Screen-reader heading */}
        <Heading className="sr-only">{title ?? id}</Heading>

        {/* Each section composes its own layout around the blob */}
        {children}
      </motion.div>
    </section>
  );
}
