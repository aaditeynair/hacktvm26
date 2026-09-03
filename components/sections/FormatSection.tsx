/**
 * HackTVM'26 — Access Point
 * FormatSection — full text on both left and right of the blob.
 */
"use client";

import { SectionWrapper } from "@/components/SectionWrapper";

export function FormatSection() {
  return (
    <SectionWrapper id="format" title="Event Format">
      <div className="h-full w-full">
        {/* Left rail — full, vertically centred */}
        <div className="absolute left-5 top-1/2 -translate-y-1/2 sm:left-8 md:left-[6%] max-w-md text-left">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-mid">
            Left text content goes here (full height)
          </p>
        </div>

        {/* Right rail — full, vertically centred */}
        <div className="absolute right-5 top-1/2 -translate-y-1/2 sm:right-8 md:right-[6%] max-w-md text-right">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-mid">
            Right text content goes here (full height)
          </p>
        </div>
      </div>
    </SectionWrapper>
  );
}
