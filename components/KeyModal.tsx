"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { EVENT } from "@/lib/event";
import { KEY_HIT_AREA_ID } from "@/components/KeyHitArea";
import { Magnetic } from "@/components/Magnetic";

/**
 * HackTVM'26 — Access Point
 * KeyModal — registration/contact modal opened from the resolved key.
 *
 * Behaviour:
 *  - First open: grows from the key's captured on-screen rect (desktop) or
 *    slides up as a full-screen bottom sheet (mobile). Every later open in
 *    the session (+ reduced motion) is instant.
 *  - Close via close button, Esc, or backdrop tap on desktop.
 *  - A11y: dialog + aria-labelledby, focus trap, focus moves in on open and
 *    returns to the key on close, scroller scroll-locked while open.
 *  - z-index sits above Header/Footer (z-50) and the blob (z-10) but below
 *    the film-grain layer (z-9999).
 */

const SCROLLER_ID = "scroll-container";
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

function getFocusable(el: HTMLElement): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (n) => n.offsetParent !== null || n === document.activeElement,
  );
}

/** True below the first breakpoint (matches Tailwind's `sm:`). */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
}

export function KeyModal() {
  const {
    isModalOpen,
    setIsModalOpen,
    hasOpenedModal,
    setHasOpenedModal,
    setHasUnlocked,
    isReducedMotion,
    modalOrigin,
  } = useApp();

  const panelRef = useRef<HTMLDivElement>(null);
  const isSheet = useIsMobile();

  const handleClose = useCallback(() => {
    if (!hasOpenedModal) {
      setHasOpenedModal(true);
      setHasUnlocked(true);
    }
    setIsModalOpen(false);
  }, [hasOpenedModal, setHasOpenedModal, setHasUnlocked, setIsModalOpen]);

  /* Scroll lock — the page scroller is a custom container, not window. */
  useEffect(() => {
    if (!isModalOpen) return;
    const scroller = document.getElementById(SCROLLER_ID);
    if (!scroller) return;
    const prev = scroller.style.overflow;
    scroller.style.overflow = "hidden";
    return () => {
      scroller.style.overflow = prev;
    };
  }, [isModalOpen]);

  /* Escape to close. */
  useEffect(() => {
    if (!isModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isModalOpen, handleClose]);

  /* Focus in on open. */
  useEffect(() => {
    if (!isModalOpen) return;
    const el = panelRef.current;
    if (!el) return;
    const targets = getFocusable(el);
    requestAnimationFrame(() => {
      (targets[0] ?? el).focus();
    });
  }, [isModalOpen]);

  /* Focus trap. */
  useEffect(() => {
    if (!isModalOpen) return;
    const el = panelRef.current;
    if (!el) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const targets = getFocusable(el);
      if (targets.length === 0) {
        e.preventDefault();
        return;
      }
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [isModalOpen]);

  /* Focus back on the key once the exit animation completes. */
  const handleExitComplete = useCallback(() => {
    const key = document.getElementById(KEY_HIT_AREA_ID);
    key?.focus();
  }, []);

  const handleBackdropClick = useCallback(() => {
    if (window.matchMedia("(min-width: 640px)").matches) handleClose();
  }, [handleClose]);

  const firstOpen = !hasOpenedModal && !isReducedMotion;
  const growFromKey = firstOpen && !isSheet && modalOrigin !== null;
  const slideUp = firstOpen && isSheet;

  const initial = growFromKey
    ? { scale: 0.08, opacity: 0.15 }
    : slideUp
      ? { y: "100%" }
      : false;
  const animate = { scale: 1, y: "0%", opacity: 1 };
  const exit = { opacity: 0 };
  const transition = isReducedMotion || !firstOpen
    ? { duration: 0 }
    : slideUp
      ? ({ type: "spring" } as const)
      : { duration: 0.45, ease: "easeOut" as const };

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {isModalOpen && (
        <>
          <motion.div
            key="key-modal-backdrop"
            className="fixed inset-0 z-[8999] modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: isReducedMotion ? 0 : 0.25 }}
            onClick={handleBackdropClick}
          />

          <motion.div
            key="key-modal-panel"
            initial={initial}
            animate={animate}
            exit={exit}
            transition={transition}
            style={
              growFromKey && modalOrigin
                ? { transformOrigin: `${modalOrigin.x}px ${modalOrigin.y}px` }
                : undefined
            }
            className="fixed inset-0 z-[9000] flex items-end justify-center sm:items-center sm:p-6 pointer-events-none"
          >
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="key-modal-title"
              className={[
                "pointer-events-auto relative flex flex-col overflow-hidden",
                "h-svh w-full sm:h-[min(86dvh,760px)] sm:w-[min(92vw,1100px)]",
                "rounded-t-3xl sm:rounded-3xl",
                "border border-white/10 bg-black",
              ].join(" ")}
            >
              <Magnetic
                className="absolute right-4 top-4 z-10"
                pull={4}
                glow={14}
                radius={80}
                borderRadius="9999px"
              >
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Close registration details"
                  className="glow-press flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-cream transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M3 3l10 10M13 3L3 13" />
                  </svg>
                </button>
              </Magnetic>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className="flex min-h-full flex-col justify-center px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-12 sm:px-10 sm:pb-8">
                  <div className="grid grid-cols-1 gap-x-12 gap-y-10 md:grid-cols-2">
                    {/* Left: heading, tagline, date, register, contact */}
                    <div className="flex flex-col gap-5">
                      <div>
                        <h2
                          id="key-modal-title"
                          className="pr-14 font-mono text-2xl font-bold leading-tight text-cream sm:text-3xl"
                        >
                          {EVENT.fullName}
                        </h2>
                        <p className="mt-2 font-mono text-sm uppercase tracking-wide text-blue">
                          {EVENT.tagline}
                        </p>
                      </div>

                      {/* Slot above the action buttons — swap for a countdown later. */}
                      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                        <p className="text-sm text-gray-light">
                          {EVENT.eventLabel} · {EVENT.venue}
                        </p>
                      </div>

                      {EVENT.register.enabled ? (
                        <Magnetic
                          className="mt-1 block w-full sm:w-fit"
                          pull={6}
                          glow={18}
                          radius={90}
                          borderRadius="9999px"
                        >
                          <a
                            href={EVENT.register.url}
                            target="_blank"
                            rel="noreferrer"
                            className="glow-press block w-full rounded-full bg-cream py-3 text-center font-mono text-sm font-bold text-black transition hover:opacity-90 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream sm:px-10"
                          >
                            {EVENT.register.label}
                          </a>
                        </Magnetic>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="mt-1 block w-full cursor-not-allowed rounded-full bg-white/10 py-3 text-center font-mono text-sm font-bold text-gray-mid sm:w-fit sm:px-10"
                        >
                          {EVENT.register.label}
                        </button>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-light">
                        <a
                          href={`mailto:${EVENT.contact.email}`}
                          className="hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
                        >
                          {EVENT.contact.email}
                        </a>
                        {EVENT.contact.socials.map((s) => (
                          <a
                            key={s.label}
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-gray-mid hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
                          >
                            {s.label}
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* Right: downloads (brochure, hackbook) */}
                    <div className="flex flex-col gap-4">
                      <p className="font-mono text-xs uppercase tracking-[0.2em] text-gray-mid">
                        Downloads
                      </p>
                      <Magnetic
                        className="block w-full"
                        pull={6}
                        glow={16}
                        radius={110}
                        borderRadius="16px"
                      >
                        <a
                          href={EVENT.brochure.path}
                          download
                          className="glow-press group flex w-full items-center justify-between gap-4 rounded-2xl border border-white/15 bg-white/5 px-5 py-4 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
                        >
                          <span className="font-mono text-sm font-semibold text-cream">
                            {EVENT.brochure.label}
                          </span>
                          <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.15em] text-gray-mid transition group-hover:text-cream">
                            PDF
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 16 16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M8 2v9M4 7l4 4 4-4M2 13h12" />
                            </svg>
                          </span>
                        </a>
                      </Magnetic>
                      <span className="relative flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                        <span className="font-mono text-sm font-semibold text-gray-dim">
                          {EVENT.hackbook.label}
                        </span>
                        <span className="rounded-full border border-white/15 px-2.5 py-1 font-mono text-xs uppercase tracking-[0.15em] text-gray-mid">
                          {EVENT.hackbook.comingLabel}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}