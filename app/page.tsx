/**
 * HackTVM'26 — Access Point
 * Main page. Scroll-snap sections with the morphing blob overlay.
 */
"use client";

import { useRef, useState } from "react";
import { useScroll, useMotionValueEvent } from "framer-motion";
import { BlobMorph } from "@/components/BlobMorph";
import { useActiveSection } from "@/hooks/useActiveSection";
import { OverviewSection } from "@/components/sections/OverviewSection";
import { ThemeSection } from "@/components/sections/ThemeSection";
import { FormatSection } from "@/components/sections/FormatSection";
import { TimelineSection } from "@/components/sections/TimelineSection";
import { KeySection } from "@/components/sections/KeySection";

export default function Home() {
  useActiveSection();

  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  // Measure scroll progress inside the snap container (0.0 to 1.0)
  const { scrollYProgress } = useScroll({
    container: containerRef,
  });

  // Feed scroll updates directly into progress state
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setProgress(latest);
  });

  return (
    <main className="relative h-screen w-full overflow-hidden bg-black text-white">
      {/* Fixed Blob overlay receiving real-time scroll progress */}
      <BlobMorph progress={progress} />

      {/* Scroll-snap container with containerRef attached */}
      <div
        ref={containerRef}
        className="snap-container relative h-screen overflow-y-auto snap-y snap-mandatory"
      >
        <OverviewSection />
        <ThemeSection />
        <FormatSection />
        <TimelineSection />
        <KeySection />
      </div>
    </main>
  );
}
