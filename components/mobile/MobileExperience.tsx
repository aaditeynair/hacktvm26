/**
 * HackTVM'26 — Access Point
 * MobileExperience — the < 768px layout.
 *
 * Structure:
 *  - Full-screen transparent scroller of invisible spacers (one per beat).
 *    Scrolling anywhere over the viewport drives the blob's phase progress.
 *  - BlobStage moved into the top half (see .mobile-stage in globals.css).
 *  - MobileBeatPanel fixed in the bottom half renders the active beat.
 *
 * The active beat / phase / sub-progress are computed from spacer geometry via
 * mapMobileScroll — the only source of progress on mobile (desktop is
 * unmounted here, so IntersectionObserver and snap-scroll never run).
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BlobMorph } from "@/components/BlobMorph";
import { BlobStage } from "@/components/BlobStage";
import { KeyHitArea } from "@/components/KeyHitArea";
import { MobileBeatPanel } from "@/components/mobile/MobileBeatPanel";
import { MobileScrollCue } from "@/components/mobile/MobileScrollCue";
import { BEATS, spacerHeight } from "@/lib/mobile-beats";
import {
  collectSpacers,
  mapMobileScroll,
  type MobileScrollState,
  type SpacerMetrics,
} from "@/lib/mobile-progress";
import { useApp } from "@/context/AppContext";

const LAST_INDEX = BEATS.length - 1;

export function MobileExperience() {
  const { setActiveSection, setActiveBeat } = useApp();

  const scrollerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const spacersRef = useRef<SpacerMetrics[]>([]);
  const prevStateRef = useRef<MobileScrollState | null>(null);

  const [beatIndex, setBeatIndex] = useState(0);
  const [blobProgress, setBlobProgress] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    spacersRef.current = collectSpacers(el);
  }, []);

  const sync = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const state = mapMobileScroll(el.scrollTop, spacersRef.current);
    const prev = prevStateRef.current;

    if (!prev || prev.beatIndex !== state.beatIndex) {
      setBeatIndex(state.beatIndex);
      setActiveBeat(state.beatIndex);
    }
    if (!prev || prev.phase !== state.phase) {
      setActiveSection(state.phase);
    }
    if (!prev || prev.blobProgress !== state.blobProgress) {
      setBlobProgress(state.blobProgress);
    }
    if (el.scrollTop > 2) setHasScrolled(true);

    prevStateRef.current = state;
  }, [setActiveSection, setActiveBeat]);

  const handleScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      sync();
    });
  }, [sync]);

  /* Measure spacers initially and whenever the viewport changes. */
  useEffect(() => {
    measure();
    sync();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(rafRef.current);
    };
  }, [measure, sync]);

  /* Dev-only A/B: `?nosnap` in the URL relaxes the mobile per-beat snap to
     `proximity` (CSS on body.nosnap) so the down-flick delay report can be
     isolated on-device. */
  useEffect(() => {
    const nosnap = new URLSearchParams(window.location.search).has("nosnap");
    if (nosnap) document.body.classList.add("nosnap");
    return () => document.body.classList.remove("nosnap");
  }, []);

  const activeBeat = BEATS[beatIndex];

  return (
    <main className="relative h-svh w-full overflow-hidden bg-black text-white">
      {/* Top-half blob stage (positioned via .mobile-stage) */}
      <BlobStage className="mobile-stage">
        <BlobMorph progress={blobProgress} />
        <KeyHitArea progress={blobProgress} />
      </BlobStage>

      {/* Bottom-half beat content (fixed; pointer-events pass through) */}
      <MobileBeatPanel beat={activeBeat} />

      {beatIndex === 0 && <MobileScrollCue visible={!hasScrolled} />}

      {/* Full-screen scroller of invisible spacers — drives the whole layout.
          Keep this div last/highest so touches anywhere reach it. */}
      <div
        ref={scrollerRef}
        id="scroll-container"
        className="mobile-scroller"
        onScroll={handleScroll}
      >
        {BEATS.map((beat, i) => (
          <div
            key={beat.id}
            data-mobile-spacer
            data-mobile-phase={beat.phase}
            className="mobile-spacer"
            style={{ minHeight: spacerHeight(beat, i === LAST_INDEX) }}
          />
        ))}
      </div>
    </main>
  );
}