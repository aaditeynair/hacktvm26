/**
 * HackTVM'26 — Access Point
 * Fixed footer with dot-based section navigation.
 *
 * Desktop (>= 768px): one dot per snap-section, scrolls via scrollIntoView
 * (unchanged behaviour).
 * Mobile (< 768px): one dot per phase (5 phases). Each is a 44px touch target;
 * the active dot shows a conic progress ring fed by phaseProgress. Tapping
 * scrolls the mobile scroller to the start of that phase.
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
import { PHASE_COUNT } from "@/lib/mobile-beats";

/* ---------- Desktop dots (unchanged) ---------- */
function DesktopFooterNav() {
  const { activeSection, isReducedMotion } = useApp();
  const navRef = useRef<HTMLElement>(null);

  /* Scroll to a section by index */
  const scrollTo = useCallback((index: number) => {
    const id = SECTION_IDS[index];
    if (!id) return;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: isReducedMotion ? "auto" : "smooth" });
    }
  }, [isReducedMotion]);

  /* Keyboard navigation between dots */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      const total = SECTION_IDS.length;
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
    [],
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
                      ? "h-3 w-3 bg-white scale-125"
                      : "h-2 w-2 bg-white/30 hover:bg-white/60"
                  }
                `}
              />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ---------- Mobile phase dots ---------- */
function MobileFooterNav() {
  const { activeSection, phaseProgress, isReducedMotion } = useApp();
  const navRef = useRef<HTMLElement>(null);

  /* Scroll the mobile scroller to the start of a phase (its first spacer). */
  const scrollPhaseTo = useCallback(
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

  /* Keyboard navigation between phase dots */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      const total = PHASE_COUNT;
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
    [],
  );

  return (
    <nav
      ref={navRef}
      aria-label="Section navigation"
      className="pointer-events-auto"
    >
      <ul className="flex items-center gap-2 py-2" role="list">
        {Array.from({ length: PHASE_COUNT }, (_, i) => {
          const isActive = i === activeSection;
          const id = SECTION_IDS[i];
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => scrollPhaseTo(i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                aria-label={`Go to ${SECTION_LABELS[id]}`}
                aria-current={isActive ? "true" : undefined}
                className="relative flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cream"
                style={{
                  background: isActive
                    ? `conic-gradient(var(--color-cream) ${Math.round(phaseProgress * 360)}deg, rgba(255,255,255,0.18) 0deg)`
                    : "rgba(255,255,255,0.18)",
                }}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-[3px] rounded-full bg-black"
                />
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${isActive ? "bg-cream" : "bg-white/40"}`}
                />
              </button>
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
      {isMobile ? <MobileFooterNav /> : <DesktopFooterNav />}
    </motion.footer>
  );
}