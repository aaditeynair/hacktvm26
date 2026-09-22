/**
 * HackTVM'26 — Access Point
 * Fixed footer with dot-based section navigation.
 *
 * One shared SectionDots component renders the desktop-style dots on every
 * breakpoint — laptop-style dots: a scaled, white active dot among dimmer
 * inactive ones. Desktop and mobile differ only in what a tap does and in how
 * the active dot paints:
 *
 *  - Desktop (>= 768px): one dot per snap-section; tapping scrolls the
 *    snap-container via scrollIntoView. Active dot is solid white.
 *  - Mobile (< 768px): one dot per phase; tapping scrolls the mobile scroller
 *    to that phase's first spacer. The active dot instead shows a conic fill
 *    of the phase's sub-progress (fed by phaseProgress), reusing the same dot
 *    geometry and look.
 *
 * Each dot is a focusable <button> with an aria-label naming its section.
 * Arrow keys navigate between dots; Home/End jump to first/last.
 */
"use client";

import { useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { SECTION_IDS, SECTION_LABELS, DURATIONS } from "@/lib/constants";

/* ---------- Shared section dots ---------- */
interface SectionDotsProps {
  /** Scroll to a section/phase by index. Breakpoint-specific (see Footer). */
  scrollTo: (index: number) => void;
  /** Mobile-only: paint the active dot with the phase's sub-progress fill. */
  showProgress?: boolean;
}

function SectionDots({ scrollTo, showProgress = false }: SectionDotsProps) {
  const { activeSection, phaseProgress } = useApp();
  const navRef = useRef<HTMLElement>(null);
  const total = SECTION_IDS.length;

  /* Keyboard navigation between dots */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      const buttons = navRef.current?.querySelectorAll<HTMLButtonElement>("button");
      if (!buttons) return;

      let next = -1;

      switch (e.key) {
        case "ArrowDown":
        case "ArrowRight":
          e.preventDefault();
          next = (index + 1) % total;
          break;
        case "ArrowUp":
        case "ArrowLeft":
          e.preventDefault();
          next = (index - 1 + total) % total;
          break;
        case "Home":
          e.preventDefault();
          next = 0;
          break;
        case "End":
          e.preventDefault();
          next = total - 1;
          break;
        default:
          return;
      }

      if (next >= 0) {
        buttons[next].focus();
      }
    },
    [total],
  );

  return (
    <nav
      ref={navRef}
      aria-label="Section navigation"
      className="pointer-events-auto"
    >
      <ul className="flex items-center gap-3 py-5" role="list">
        {SECTION_IDS.map((id, i) => {
          const isActive = i === activeSection;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => scrollTo(i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                aria-label={`Go to ${SECTION_LABELS[id]}`}
                aria-current={isActive ? "true" : undefined}
                className={`
                  block rounded-full transition-all duration-300 ease-out
                  focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cream
                  ${
                    isActive
                      ? "h-3 w-3 scale-125"
                      : "h-2 w-2 bg-white/30 hover:bg-white/60"
                  }
                `}
                style={
                  isActive && showProgress
                    ? {
                        background: `conic-gradient(var(--color-white) ${Math.round(phaseProgress * 360)}deg, rgba(255,255,255,0.15) 0deg)`,
                      }
                    : isActive
                      ? { background: "var(--color-white)" }
                      : undefined
                }
              />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Footer() {
  const { isLoading, isReducedMotion } = useApp();
  const isMobile = useIsMobile();

  /* Desktop: scroll a snap-section into view by DOM id. */
  const scrollSection = useCallback(
    (index: number) => {
      const id = SECTION_IDS[index];
      if (!id) return;
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: isReducedMotion ? "auto" : "smooth" });
    },
    [isReducedMotion],
  );

  /* Mobile: scroll the full-screen scroller to the first spacer of a phase. */
  const scrollPhase = useCallback(
    (index: number) => {
      const scroller = document.getElementById("scroll-container");
      if (!scroller) return;
      const first = scroller.querySelector<HTMLElement>(
        `[data-mobile-phase="${index}"]`,
      );
      if (!first) return;
      scroller.scrollTo({
        top: first.offsetTop,
        behavior: isReducedMotion ? "auto" : "smooth",
      });
    },
    [isReducedMotion],
  );

  return (
    <motion.footer
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none"
      aria-hidden={isLoading}
      initial={{ opacity: 0 }}
      animate={{ opacity: isLoading ? 0 : 1 }}
      transition={{
        duration: isReducedMotion ? 0 : DURATIONS.normal,
        delay: isReducedMotion ? 0 : 0.3,
      }}
    >
      <SectionDots
        scrollTo={isMobile ? scrollPhase : scrollSection}
        showProgress={isMobile}
      />
    </motion.footer>
  );
}