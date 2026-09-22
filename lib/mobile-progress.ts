/**
 * HackTVM'26 — Access Point
 * Mobile scroll mapping (pure functions).
 *
 * The mobile scroller contains one invisible spacer per beat. Given the set of
 * measured spacer geometries and the container's scrollTop, we answer:
 *
 *  - which beat is active (whose spacer range the scroll position is in),
 *  - which phase it belongs to,
 *  - `sub` — sub-progress inside the phase (0..1). This drives the active
 *    footer dot's conic fill, never the blob.
 *  - `blobProgress` — DISCRETE per phase: the phase's start lands exactly on a
 *    boundary of (phase - minPhase) / (maxPhase - minPhase), so with the 5
 *    phases that is 0, 0.25, 0.5, 0.75 and 1.0 regardless of beat weights or
 *    scroll position inside the phase. The blob therefore stays shapeless
 *    through Phase 0, resolves through Phases 1-3, and only shows its logo at
 *    1.0 (Phase 4). This is the value fed to BlobMorph.
 */

export interface SpacerMetrics {
  /** scrollTop at which this spacer starts */
  top: number;
  /** rendered height of the spacer */
  height: number;
  beatIndex: number;
  phase: number;
  isLast: boolean;
}

export interface MobileScrollState {
  beatIndex: number;
  phase: number;
  sub: number;
  blobProgress: number;
}

/** Snap can park the scroller up to ~1-2px short of a spacer's exact top
    (Chromium aligns snap positions / max-scroll to device pixels while
    geometry is fractional — e.g. the last beat's port sits exactly at max
    scroll, which lands a pixel earlier). Treating "within 2px below a top"
    as "reached the top" makes every landed scroll position map to the beat
    its content visibly shows. Ports are hundreds of px apart, so 2px can
    never cause a wrong beat. */
const ALIGN_TOLERANCE = 2;

export function collectSpacers(container: HTMLElement): SpacerMetrics[] {
  const nodes = container.querySelectorAll<HTMLElement>("[data-mobile-spacer]");
  const cRect = container.getBoundingClientRect();
  const out: SpacerMetrics[] = [];
  nodes.forEach((n, beatIndex) => {
    const nRect = n.getBoundingClientRect();
    /* Exact (fractional) geometry: scroll-snap lands on fractional positions,
       so integer offsetTop would leave beat boundaries off by < 1px. */
    const top = nRect.top - cRect.top + container.scrollTop;
    out.push({
      top,
      height: nRect.height,
      beatIndex,
      phase: Number(n.dataset.mobilePhase ?? -1),
      isLast: beatIndex === nodes.length - 1,
    });
  });
  return out;
}

export function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

export function mapMobileScroll(
  scrollTop: number,
  spacers: readonly SpacerMetrics[],
): MobileScrollState {
  if (spacers.length === 0) {
    return { beatIndex: 0, phase: 0, sub: 0, blobProgress: 0 };
  }

  /* Active beat = the last spacer whose top edge we have passed (within the
     1px snap-alignment tolerance). */
  let beatIndex = 0;
  for (let i = 0; i < spacers.length; i++) {
    if (spacers[i].top <= scrollTop + ALIGN_TOLERANCE) beatIndex = spacers[i].beatIndex;
    else break;
  }

  const phase = spacers[beatIndex].phase;

  /* Phase window = first spacer's top .. last spacer's bottom for this phase. */
  let first = beatIndex;
  while (first > 0 && spacers[first - 1].phase === phase) first -= 1;
  let last = beatIndex;
  while (last + 1 < spacers.length && spacers[last + 1].phase === phase) last += 1;

  const phaseStart = spacers[first].top;
  const phaseEnd = spacers[last].top + spacers[last].height;
  const span = phaseEnd - phaseStart;
  const sub = span > 0 ? clamp((scrollTop - phaseStart) / span, 0, 1) : 1;

  /* Discrete per-phase blob progress. Derived fresh from the spacer phases so
     the boundary step / count can never go stale. */
  let minPhase = phase;
  let maxPhase = phase;
  for (const s of spacers) {
    if (s.phase < minPhase) minPhase = s.phase;
    if (s.phase > maxPhase) maxPhase = s.phase;
  }
  const slack = maxPhase - minPhase;
  const blobProgress = slack > 0 ? (phase - minPhase) / slack : 0;

  return { beatIndex, phase, sub, blobProgress };
}