/**
 * HackTVM'26 — Access Point
 * Mobile scroll mapping (pure functions).
 *
 * The mobile scroller contains one invisible spacer per beat. Given the set of
 * measured spacer geometries and the container's scrollTop, we answer:
 *
 *  - which beat is active (whose spacer range the scroll position is in),
 *  - which phase it belongs to,
 *  - `sub` — sub-progress inside the phase (0..1),
 *  - `blobProgress` — piecewise-linear so phase i occupies [i*0.25, (i+1)*0.25]
 *    and the Key phase (4) holds at 1.0. This is the value fed to BlobMorph.
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

export function collectSpacers(container: HTMLElement): SpacerMetrics[] {
  const nodes = container.querySelectorAll<HTMLElement>("[data-mobile-spacer]");
  const out: SpacerMetrics[] = [];
  nodes.forEach((n, beatIndex) => {
    out.push({
      top: n.offsetTop,
      height: n.offsetHeight,
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

  /* Active beat = the last spacer whose top edge we have passed. */
  let beatIndex = 0;
  for (let i = 0; i < spacers.length; i++) {
    if (spacers[i].top <= scrollTop) beatIndex = spacers[i].beatIndex;
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

  const blobProgress = Math.min(1, (phase + sub) * 0.25);

  return { beatIndex, phase, sub, blobProgress };
}