/**
 * HackTVM'26 — Access Point
 * KeySection — intentionally no content. The blob resolves into the keycap
 * here; the unlock interaction lives in Phase 7 (Key Modal).
 */
"use client";

import { SectionWrapper } from "@/components/SectionWrapper";

export function KeySection() {
  return (
    <SectionWrapper id="key" title="The Key">
      {/* No content — the blob is the content on this section. */}
      <div className="h-full w-full" />
    </SectionWrapper>
  );
}
