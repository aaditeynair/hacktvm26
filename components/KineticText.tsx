/**
 * HackTVM'26 — Access Point
 * KineticText — word-by-word "light up" reveal for headings.
 *
 * Shares the loading screen's flicker path (`flicker-word` / `flicker-in` in
 * globals.css — the same opacity keyframes and 0.4s ease-out forwards), so
 * the visual language is identical without duplicating any animation values.
 *
 * Like the loading screen, whole WORDS blink on as units (not letters). Each
 * word's delay is pulled from a deterministic PRNG (seeded by the text) inside
 * a small range, so the reveal reads as an organic burst rather than a strict
 * left-to-right sweep — and re-renders never reshuffle the stagger.
 *
 * Pacing mirrors the loading screen but starts slightly sooner: words begin
 * popping in ~0.7s after the reveal triggers and are all on by ~1.5s (the
 * loading screen's words reveal at 1500/1750/2100/2300ms), so headings blink
 * on like a neon tube warming up rather than snapping in.
 *
 * The glow is the loading screen's `.text-glow` shadow, applied to the
 * heading element at the call site (not baked in here).
 *
 * Triggering: the reveal fires ONCE, the first time the element scrolls into
 * view (IntersectionObserver, disconnected after the first hit). If the
 * loading screen is still up (isLoading) the reveal waits until it's gone, so
 * headings don't finish their animation hidden behind it. Under
 * prefers-reduced-motion every word renders fully lit immediately.
 *
 * Accessibility: the full string is rendered as sr-only text for screen
 * readers; the word row is aria-hidden, so the heading is announced as a
 * whole rather than 40 separate characters.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";

/* FNV-1a hash → uint32 seed for the PRNG. Deterministic across renders. */
function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* mulberry32 — tiny seeded PRNG; stable per seed, never re-randomized. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface KineticTextProps {
  text: string;
  /** Extra seed material so two instances with the same text stagger differently. */
  seed?: string;
  /** Delay before the first letter begins (ms). */
  baseDelay?: number;
  /** Random per-letter spread added inside the range (ms). */
  staggerRange?: number;
  /** Fraction of the element that must be visible before revealing. */
  revealThreshold?: number;
  className?: string;
}

export function KineticText({
  text,
  seed = "",
  baseDelay = 700,
  staggerRange = 800,
  revealThreshold = 0.5,
  className = "",
}: KineticTextProps) {
  const { isReducedMotion, isLoading } = useApp();
  const ref = useRef<HTMLSpanElement>(null);
  const [revealed, setRevealed] = useState(false);

  /* Per-word stagger, computed once per mount (deps never change in
     practice, so it is stable across re-renders). Split on single spaces so
     the loading screen's word-unit blink is reproduced exactly. */
  const words = useMemo(() => {
    const rand = mulberry32(hashSeed(`${text}\u0000${seed}`));
    return text.split(" ").map((word) => ({
      word,
      delay: Math.round(baseDelay + rand() * staggerRange),
    }));
  }, [text, seed, baseDelay, staggerRange]);

  useEffect(() => {
    if (isReducedMotion) {
      setRevealed(true);
      return;
    }
    if (isLoading || revealed) return;
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRevealed(true);
          io.disconnect();
        }
      },
      { threshold: revealThreshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [isReducedMotion, isLoading, revealed, revealThreshold]);

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span ref={ref} aria-hidden="true" style={{ whiteSpace: "pre-wrap" }}>
        {words.map((w, i) => (
          <span
            key={i}
            className="flicker-word"
            style={{
              animationDelay: `${w.delay}ms`,
              /* Paused until revealed; running lets `flicker-in` play from 0%.
                 Under prefers-reduced-motion the global CSS sets opacity 1. */
              animationPlayState: revealed ? "running" : "paused",
            }}
          >
            {w.word}
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </span>
    </span>
  );
}