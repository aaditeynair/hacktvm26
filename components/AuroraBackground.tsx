/**
 * HackTVM'26 — Access Point
 * AuroraBackground — the brand background (posters / social look).
 *
 * Pure CSS, no JS, no canvas/WebGL, no animation loop. A static near-black
 * indigo base, 5 oversized elliptical gradient layers that drift with
 * transform-only keyframes, a light darkening scrim (weak center pool + local
 * darkening behind the side text columns), and a static fine film-grain.
 *
 * KEY RULES:
 *  - Layers fade to transparent by ~65-80% using MANY eased stops, so there
 *    are no visible edges or rings while drifting.
 *  - Only `transform` is animated (translate3d/rotate/scale), ease-in-out,
 *    alternate, unique ~25-45s duration per layer; `will-change: transform`.
 *  - NO filter:blur(), backdrop-filter, mix-blend-mode on animated layers,
 *    and no animating of background-position / gradient stops / opacity.
 *  - Identical on every section: no progress input, nothing reads scroll.
 *  - Static noise overlay (inline SVG feTurbulence, fine grain, not animated).
 *  - Tunables live at the top of globals.css (:root) as --aurora-* vars.
 *
 * Mounted as the first child of each experience's <main> so it paints above
 * the <main>'s background but below the BlobStage — it never touches the
 * blob's interactive SVG (which keeps framerate priority).
 */
export function AuroraBackground() {
  return (
    <div className="aurora" aria-hidden="true">
      <div className="aurora-base" />
      <div className="aurora-layer aurora-layer-1" />
      <div className="aurora-layer aurora-layer-2" />
      <div className="aurora-layer aurora-layer-3" />
      <div className="aurora-layer aurora-layer-4" />
      <div className="aurora-layer aurora-layer-5" />
      <div className="aurora-layer aurora-layer-6" />
      <div className="aurora-layer aurora-layer-7" />
      <div className="aurora-scrim" />
      <div className="aurora-noise" />
    </div>
  );
}