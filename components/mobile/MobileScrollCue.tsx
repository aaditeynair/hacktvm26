/**
 * HackTVM'26 — Access Point
 * MobileScrollCue — "scroll" hint shown on the first beat only.
 * Fades out (and stays out) once the user has scrolled at all.
 */
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/context/AppContext";

interface MobileScrollCueProps {
  visible: boolean;
}

export function MobileScrollCue({ visible }: MobileScrollCueProps) {
  const { isReducedMotion } = useApp();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none fixed left-0 right-0 z-20 flex flex-col items-center gap-1"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 4.75rem)",
          }}
          data-mobile-cue
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: isReducedMotion ? 0 : 0.4 }}
          aria-hidden="true"
        >
          <span className="font-mono text-[12px] uppercase tracking-[0.22em] text-gray-light/80">
            Scroll
          </span>
          <motion.svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-light/80"
            animate={isReducedMotion ? undefined : { y: [0, 4, 0] }}
            transition={
              isReducedMotion
                ? undefined
                : { repeat: Infinity, duration: 1.4, ease: "easeInOut" }
            }
          >
            <path d="M8 3v10M4 9l4 4 4-4" />
          </motion.svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}