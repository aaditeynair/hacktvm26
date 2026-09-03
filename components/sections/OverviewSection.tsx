/**
 * HackTVM'26 — Access Point
 * OverviewSection — content at top-left and bottom-right of the blob.
 */
"use client";

import { SectionWrapper } from "@/components/SectionWrapper";

export function OverviewSection() {
  return (
    <SectionWrapper id="overview" headingLevel={1} title="Overview">
      <div className="h-full w-full">
        {/* Top-left slot */}
        <div className="absolute left-5 top-20 sm:left-8 md:left-[6%] md:top-[14%] max-w-md text-left md:text-left">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-mid">
            Top-left content goes here
          </p>
        </div>

        {/* Bottom-right slot */}
        <div className="absolute right-5 bottom-20 sm:right-8 md:right-[6%] md:bottom-[16%] max-w-md text-right">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-mid">
            Bottom-right content goes here
          </p>
        </div>
      </div>
    </SectionWrapper>
  );
}
