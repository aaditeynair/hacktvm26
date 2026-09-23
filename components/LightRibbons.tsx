"use client";

import { useApp } from "@/context/AppContext";

/**
 * HackTVM'26 — Access Point
 * Light-ribbon background (replaces the flat phase-tint layer).
 *
 * Near-black, violet-tinted base with 4 large soft-edged gradient bands that
 * drift slowly and independently. Each band is BUILT FROM CSS GRADIENTS ONLY —
 * the soft glow comes from radial-gradient color stops (bright core → color →
 * transparent), never filter:blur() or SVG filters, so this stays a
 * transform/opacity-only compositor layer behind everything.
 *
 * The SAME progress value driving the blob morph (passed in by the experience)
 * shifts each band's opacity gradually from the blue side of the arc to the
 * violet/purple side as the key resolves. A center-dark vignette on top keeps
 * content and the key readable; the film grain is the site's existing
 * body::after overlay (reused, nothing new built).
 */
interface LightRibbonsProps {
  progress?: number;
}

interface BandDef {
  rot: number;
  dur: number;
  delay: number;
  swayX: number;
  swayY: number;
  opacityBlue: number;
  opacityPurple: number;
  gradient: string;
}

const BANDS: BandDef[] = [
  // Band 1 — lightblue; brightest during the early, blue phases.
  {
    rot: -32,
    dur: 27,
    delay: -4,
    swayX: 2.2,
    swayY: 1.6,
    opacityBlue: 0.42,
    opacityPurple: 0.1,
    gradient:
      "radial-gradient(34% 18% at 42% 40%, rgba(255,255,255,0.95) 0%, rgba(129,183,211,0.62) 32%, rgba(129,183,211,0.24) 56%, rgba(129,183,211,0) 74%)",
  },
  // Band 2 — blue with a violet tail; mid prominence, gently blue-leaning.
  {
    rot: 14,
    dur: 39,
    delay: -20,
    swayX: 1.7,
    swayY: 2.1,
    opacityBlue: 0.3,
    opacityPurple: 0.18,
    gradient: [
      "radial-gradient(30% 17% at 58% 44%, rgba(255,255,255,0.55) 0%, rgba(75,124,211,0.48) 34%, rgba(75,124,211,0.16) 60%, rgba(75,124,211,0) 78%)",
      "radial-gradient(34% 19% at 66% 50%, rgba(255,255,255,0.28) 0%, rgba(96,61,182,0.34) 40%, rgba(96,61,182,0.09) 64%, rgba(96,61,182,0) 82%)",
    ].join(","),
  },
  // Band 3 — violet; gains weight as the phases deepen.
  {
    rot: -7,
    dur: 32,
    delay: -11,
    swayX: 2.0,
    swayY: 1.2,
    opacityBlue: 0.16,
    opacityPurple: 0.3,
    gradient:
      "radial-gradient(26% 14% at 44% 58%, rgba(255,255,255,0.55) 0%, rgba(96,61,182,0.52) 32%, rgba(96,61,182,0.2) 58%, rgba(96,61,182,0) 78%)",
  },
  // Band 4 — deep purple; floods at the settled key.
  {
    rot: 24,
    dur: 23,
    delay: -28,
    swayX: 2.4,
    swayY: 2.2,
    opacityBlue: 0.08,
    opacityPurple: 0.42,
    gradient: [
      "radial-gradient(30% 16% at 58% 60%, rgba(255,255,255,0.4) 0%, rgba(52,10,97,0.7) 30%, rgba(52,10,97,0.26) 58%, rgba(52,10,97,0) 80%)",
      "radial-gradient(24% 13% at 46% 68%, rgba(255,255,255,0.24) 0%, rgba(96,61,182,0.28) 36%, rgba(96,61,182,0.07) 62%, rgba(96,61,182,0) 80%)",
    ].join(","),
  },
];

const NUM_PHASES = 5;

export function LightRibbons({ progress = 0 }: LightRibbonsProps) {
  const { isReducedMotion } = useApp();

  const p = Math.min(1, Math.max(0, progress));

  // Blue→purple mix (0 = Phase 0 all-blue, 1 = Phase 4 all-purple). Gradual
  // smoothstep for normal; quantized to the current phase for reduced motion
  // (instant, not gradual).
  let tx: number;
  if (isReducedMotion) {
    tx = Math.floor(p * NUM_PHASES) / (NUM_PHASES - 1);
  } else {
    tx = p * p * (3 - 2 * p);
  }

  return (
    <div className="light-ribbons" aria-hidden="true">
      {BANDS.map((band, i) => {
        const opacity =
          band.opacityBlue + (band.opacityPurple - band.opacityBlue) * tx;
        return (
          <div
            key={i}
            className="light-ribbon"
            style={
              {
                backgroundImage: band.gradient,
                opacity,
                transform: `rotate(${band.rot}deg)`,
                "--rib-rot": `${band.rot}deg`,
                "--rib-dur": `${band.dur}s`,
                "--rib-delay": `${band.delay}s`,
                "--rib-sway": `${band.swayX}vmax`,
                "--rib-swayy": `${band.swayY}vmax`,
              } as React.CSSProperties
            }
          />
        );
      })}
      {/* Center-dark scrim: primary readability mechanism. Bands stay vivid. */}
      <div className="light-ribbon-vignette" />
    </div>
  );
}