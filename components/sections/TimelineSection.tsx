/**
 * HackTVM'26 — Access Point
 * TimelineSection — Timeline (left rail) + Registration Details (right rail).
 */
"use client";

import { SectionWrapper } from "@/components/SectionWrapper";

export function TimelineSection() {
  return (
    <SectionWrapper id="timeline" title="Timeline & Registration">
      <div className="h-full w-full">
        {/* Left rail — Timeline (centred) */}
        <div className="absolute left-5 top-1/2 -translate-y-1/2 sm:left-8 md:left-[6%] max-w-md text-left">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-mid">
            Timeline content goes here
          </p>
        </div>

        {/* Right rail — Registration Details (centred) */}
        <div className="absolute right-5 top-1/2 -translate-y-1/2 sm:right-8 md:right-[6%] max-w-md text-right">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-mid">
            Registration Details go here
          </p>
        </div>
      </div>
    </SectionWrapper>
  );
}
