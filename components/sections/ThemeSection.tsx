/**
 * HackTVM'26 — Access Point
 * ThemeSection — content on the full left rail and a bottom-right slot.
 */
"use client";

import { SectionWrapper } from "@/components/SectionWrapper";

export function ThemeSection() {
  return (
    <SectionWrapper id="theme" title="Theme">
      <div className="h-full w-full">
        {/* Full left rail — vertically centred */}
        <div className="absolute left-5 top-1/2 -translate-y-1/2 sm:left-8 md:left-[6%] max-w-md text-left">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-mid">
            Left content goes here (full height)
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
