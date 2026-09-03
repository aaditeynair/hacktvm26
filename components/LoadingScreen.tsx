/**
 * HackTVM'26 — Access Point
 * Full-screen loading overlay.
 *
 * Two-phase reveal:
 *   1. "in" appears instantly (no fade) — a real <button>, keyboard-focusable,
 *      strong glow + underline.
 *   2. After 1.5 s, "everyone deserves a way" flickers in as a group
 *      (neon-sign warm-up effect via CSS flicker animation, all at once).
 *
 * Entire phrase "everyone deserves a way in" is one line, one size.
 *
 * On activation (click / Enter / Space): everything fades out,
 * then setIsLoading(false) removes the overlay from the DOM.
 *
 * Under prefers-reduced-motion: all words appear instantly (no flicker),
 * exit is instant.
 */
"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";

/*
 * Words that flicker in after the 1.5 s pause.
 * Non-sequential order: everyone -> a -> deserves -> way
 * Delays in ms, each word flickers independently.
 */
const FLICKER_WORDS = [
  { word: "everyone", delay: 1500 },
  { word: "deserves", delay: 2100 },
  { word: "a", delay: 1750 },
  { word: "way", delay: 2300 },
] as const;

export function LoadingScreen() {
  const { isLoading, setIsLoading, isReducedMotion } = useApp();
  const [isExiting, setIsExiting] = useState(false);

  const handleActivate = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
  }, [isExiting]);

  if (!isLoading) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[10000] bg-black flex items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: isReducedMotion ? 0 : 0.3 }}
      onAnimationComplete={() => {
        if (isExiting) setIsLoading(false);
      }}
    >
      {/*
        One line: "everyone deserves a way in"
        All words share the same text size.
        "in" is a real <button> — stronger glow + underline.
      */}
      <p className="text-2xl sm:text-3xl text-cream text-glow select-none">
        {/* Flicker words — each appears independently, non-sequential order */}
        {FLICKER_WORDS.map(({ word, delay }) => (
          <span
            key={word}
            className="flicker-word"
            style={{ animationDelay: `${delay}ms` }}
          >
            {word}{" "}
          </span>
        ))}

        {/* "in" — instantly visible, stronger glow, underline, focusable */}
        <button
          type="button"
          onClick={handleActivate}
          className="text-glow-strong underline underline-offset-4 decoration-cream/60
                     cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-6
                     focus-visible:outline-cream"
          aria-label="Enter HackTVM'26"
        >
          in
        </button>
      </p>
    </motion.div>
  );
}
