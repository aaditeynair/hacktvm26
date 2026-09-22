/**
 * HackTVM'26 — Access Point
 * MobileBeatPanel — the fixed bottom-half "content window".
 *
 * Renders exactly one beat at a time with a quick crossfade + vertical
 * translate. The panel root is pointer-events-none so touches fall through to
 * the full-screen scroller behind it (dragging anywhere — blob or panel area —
 * advances the blob). In development it warns once per beat if the beat's
 * content is taller than the panel, so layout regressions surface in console.
 */
"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { SECTION_IDS, SECTION_LABELS } from "@/lib/constants";
import type { Beat, BeatContent } from "@/lib/mobile-beats";

const warnedBeats = new Set<string>();

function renderContent(content: BeatContent) {
  switch (content.kind) {
    case "hero":
      return (
        <div>
          <h1 className="font-mono text-xl font-bold leading-tight text-cream">
            {content.title}
          </h1>
          <p className="mt-1 font-mono text-[15px] uppercase tracking-wide text-blue">
            {content.tagline}
          </p>
          <p className="mt-2 text-[15px] leading-[1.5] text-gray-light">
            {content.body}
          </p>
        </div>
      );

    case "facts":
      return (
        <div className="flex flex-col">
          {content.facts.map((fact) => (
            <div
              key={fact.label}
              className="flex items-baseline justify-between gap-3 border-b border-white/10 py-2.5"
            >
              <span className="font-mono text-[13px] uppercase tracking-[0.15em] text-gray-mid">
                {fact.label}
              </span>
              <span className="text-right text-[15px] leading-snug text-cream">
                {fact.value}
              </span>
            </div>
          ))}
        </div>
      );

    case "statement":
      return (
        <div>
          <h2 className="font-mono text-lg font-bold text-cream">{content.title}</h2>
          <p className="mt-2 text-[15px] leading-[1.5] text-gray-light">
            {content.body}
          </p>
        </div>
      );

    case "list":
      return (
        <div>
          <h2 className="font-mono text-lg font-bold text-cream">{content.title}</h2>
          {content.intro && (
            <p className="mt-1.5 text-[15px] leading-[1.5] text-gray-mid">
              {content.intro}
            </p>
          )}
          <ul className="mt-3 flex flex-col gap-2">
            {content.items.map((item) => (
              <li
                key={item}
                className="flex gap-2.5 text-[15px] leading-[1.45] text-gray-light"
              >
                <span aria-hidden="true" className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-blue" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );

    case "points":
      return (
        <div>
          <h2 className="font-mono text-lg font-bold text-cream">{content.title}</h2>
          {content.intro && (
            <p className="mt-1.5 text-[15px] leading-[1.5] text-gray-mid">
              {content.intro}
            </p>
          )}
          <div className="mt-3 flex flex-col gap-3.5">
            {content.entries.map((entry) => (
              <div key={entry.heading}>
                <h3 className="font-mono text-[15px] font-bold text-cream">
                  {entry.heading}
                </h3>
                <p className="mt-0.5 text-[15px] leading-[1.5] text-gray-light">
                  {entry.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      );

    case "note":
      return (
        <div>
          <h2 className="font-mono text-lg font-bold text-cream">{content.title}</h2>
          <p className="mt-1.5 text-[15px] leading-[1.5] text-gray-light">
            {content.body}
          </p>
        </div>
      );

    case "key":
      return (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <p className="max-w-[16rem] text-[15px] leading-[1.5] text-cream">
            {content.hint}
          </p>
        </div>
      );
  }
}

interface MobileBeatPanelProps {
  beat: Beat;
}

export function MobileBeatPanel({ beat }: MobileBeatPanelProps) {
  const { isReducedMotion } = useApp();
  const boxRef = useRef<HTMLDivElement>(null);

  /* Dev-only overflow warning: report any beat whose content is taller than
     the panel. The panel crossfades with AnimatePresence `mode="wait"`, so the
     beat's article mounts one exit-transition after the scroll lands — retry a
     few times until the article for the current beat is actually present,
     then measure just that article (never the still-exiting neighbour). */
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (warnedBeats.has(beat.id)) return;

    let attempts = 0;
    let cancelled = false;
    let timer = 0;

    const measure = () => {
      if (cancelled) return;
      const box = boxRef.current;
      const article = box?.querySelector<HTMLElement>(`article[data-beat="${beat.id}"]`);
      if (!article) {
        if (attempts++ < 12) {
          timer = window.setTimeout(measure, 50);
        }
        return;
      }
      const panelHeight = box!.clientHeight;
      if (article.scrollHeight > panelHeight + 1) {
        warnedBeats.add(beat.id);
        console.warn(
          `[mobile-beats] "${beat.id}" content (${article.scrollHeight}px) overflows its panel (${panelHeight}px)`,
        );
      }
    };

    timer = window.setTimeout(measure, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [beat.id]);

  const phaseLabel = SECTION_LABELS[SECTION_IDS[beat.phase]];

  return (
    <div ref={boxRef} className="mobile-panel">
      <div className="h-full">
        <AnimatePresence mode="wait" initial={false}>
          <motion.article
            key={beat.id}
            data-beat={beat.id}
            className="h-full overflow-hidden px-5 pt-1 pb-1"
            initial={
              isReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 18 }
            }
            animate={{ opacity: 1, y: 0 }}
            exit={
              isReducedMotion
                ? { opacity: 0, transition: { duration: 0 } }
                : { opacity: 0, y: -18 }
            }
            transition={
              isReducedMotion
                ? { duration: 0 }
                : { duration: 0.22, ease: "easeOut" }
            }
          >
            <p
              aria-hidden="true"
              className="mb-2 font-mono text-[12px] uppercase tracking-[0.22em] text-blue"
            >
              {phaseLabel}
            </p>
            {renderContent(beat.content)}
          </motion.article>
        </AnimatePresence>
      </div>
    </div>
  );
}