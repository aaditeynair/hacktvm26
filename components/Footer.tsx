/**
 * HackTVM'26 — Access Point
 * Fixed footer with dot-based navigation.
 *
 * - Desktop (>= 768px): one dot per snap-section (5 total), unchanged.
 *   Tapping scrolls the snap-container via scrollIntoView; the active dot is
 *   solid white and scaled. Keyboard: arrows move focus, Home/End jump.
 * - Mobile (< 768px): one dot PER BEAT, derived from the live BEATS list
 *   (never hardcoded), in a compact centered row that fits any phone width.
 *   Dots are 8px resting, ~12px when active (scale-150) — slightly
 *   bigger than the original 6px design. The active dot is driven by the same
 *   beat-snap tracking the mobile scroller uses (activeBeat in AppContext).
 *
 *   The row is sized dynamically: it occupies 80% of the device width and the
 *   dots are spaced equally within it (justify-between), so the layout adapts
 *   to any phone width while dot size stays fixed.
 *
 *   Tapping a dot jumps the mobile scroller to that beat's OWN snap position
 *   (computed the same way the per-beat scroll-snap does — no phase
 *   boundaries involved). The jump is INSTANT (direct scrollTop assignment)
 *   with scroll-snap temporarily disabled then restored, because WebKit's
 *   snap controller can interrupt an animated programmatic scroll and settle
 *   on an intermediate beat instead of the target. After the jump a scroll
 *   event is dispatched so the active-beat mapping updates immediately from
 *   the set offset instead of waiting for a scroll event WebKit may not fire.
 *
 * Each dot is a focusable <button> with an aria-label naming its target.
 * Arrow keys navigate between dots; Home/End jump to first/last.
 */
"use client";

import { useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { SECTION_IDS, SECTION_LABELS, DURATIONS } from "@/lib/constants";
import { BEATS } from "@/lib/mobile-beats";

/* ---------- Desktop section dots (unchanged) ---------- */
interface SectionDotsProps {
  scrollTo: (index: number) => void;
}

function SectionDots({ scrollTo }: SectionDotsProps) {
  const { activeSection } = useApp();
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

/* ---------- Mobile per-beat dots ---------- */
function MobileBeatDots() {
  const { activeBeat } = useApp();
  const navRef = useRef<HTMLElement>(null);
  const total = BEATS.length;

  /* Jump the scroller to a beat's own snap position. The position is
     computed exactly like the per-beat scroll-snap's landing point (the
     spacer's fractional top), so there is no phase-boundary math on this
     path — taps always land on the exact beat they name.

     The jump is INSTANT and made with scroll-snap temporarily disabled:
     WebKit's snap controller can interrupt an animated programmatic scroll
     and re-select the landing port nearest the scroll at interrupt time
     (worse on long jumps, which is how dot taps stranded the user on an
     intermediate beat). A one-shot scrollTop set with snap off cannot be
     intercepted; restoring snap afterwards cannot move the offset because
     it already sits exactly on a snap position. */
  const scrollToBeat = useCallback((index: number) => {
    const scroller = document.getElementById("scroll-container");
    if (!scroller) return;
    const spacer = scroller.querySelectorAll<HTMLElement>("[data-mobile-spacer]")[index];
    if (!spacer) return;
    const cRect = scroller.getBoundingClientRect();
    const sRect = spacer.getBoundingClientRect();
    const top = sRect.top - cRect.top + scroller.scrollTop;

    const style = scroller.style;
    const prevSnap = style.scrollSnapType;
    style.scrollSnapType = "none";
    scroller.scrollTop = top;
    style.scrollSnapType = prevSnap;

    /* Force the scroll mapping to recompute this frame from the set offset
       instead of relying on a scroll event WebKit may or may not emit after
       the assignment. `sync()` is rAF-throttled, so one dispatch per tap is
       all it takes. */
    scroller.dispatchEvent(new Event("scroll"));
  }, []);

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
      aria-label="Beat navigation"
      className="pointer-events-auto"
    >
      <ul className="flex w-[80vw] items-center justify-between py-4" role="list">
        {BEATS.map((beat, i) => {
          const isActive = i === activeBeat;
          return (
            <li key={beat.id}>
              <button
                type="button"
                onClick={() => scrollToBeat(i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                aria-label={`Go to ${beat.id}`}
                aria-current={isActive ? "true" : undefined}
                className={`
                  block rounded-full transition-all duration-300 ease-out
                  focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cream
                  ${
                    isActive
                      ? "h-2 w-2 bg-white scale-150"
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

/* ---------- Footer ---------- */
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
      {isMobile ? (
        <MobileBeatDots />
      ) : (
        <SectionDots scrollTo={scrollSection} />
      )}
    </motion.footer>
  );
}