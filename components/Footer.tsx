/**
 * HackTVM'26 — Access Point
 * Fixed footer with dot-based section navigation.
 *
 * Each dot is a focusable <button> with an aria-label naming its section.
 * Clicking a dot scrolls to that section via scrollIntoView.
 * Arrow keys navigate between dots; Home/End jump to first/last.
 * The active dot is visually distinct (larger + brighter).
 */
"use client";

import { useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { SECTION_IDS, SECTION_LABELS, DURATIONS } from "@/lib/constants";

export function Footer() {
  const { activeSection, isLoading, isReducedMotion } = useApp();
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
    </motion.footer>
  );
}
