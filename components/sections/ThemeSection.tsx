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
        <div className="absolute space-y-4 left-5 top-1/2 -translate-y-1/2 sm:left-8 md:left-[6%] max-w-md text-left">
          <div className="pb-2">
            <h1 className="text-2xl font-bold font-mono">Access Point</h1>
          </div>
          <p className="leading-7">If a system or space stands between a person and their independence, it's broken. You're here to build the sledgehammer</p>
          <p className="text-gray-mid leading-7">
            <b>Access Point</b> challenges students to design working technology that closes real, everyday gaps in accessibility and inclusivity, whether that's in navigating a space, communicating, learning, working or getting basic public information everyone else takes for granted.
          </p>
          <div className="leading-7">
            <p>Expect to tackle friction across 5 primary dimensions:</p>
            <ul className="list-disc pl-6 leading-7">
              <li>Physical & Spatial Friction</li>
              <li>Sensory & Perception Walls</li>
              <li>Cognitive Complexity</li>
              <li>Systemic & Public Barriers</li>
              <li>Health Barriers</li>
            </ul>
          </div>
        </div>

        {/* Bottom-right slot */}
        <div className="absolute right-5 bottom-20 sm:right-8 md:right-[6%] md:bottom-[16%] max-w-md text-right">
          <h2 className="py-1 font-mono uppercase tracking-wide text-lg font-bold mb-2">The Hackbook</h2>
          <p className="text-gray-mid">
            Further specifics on the theme, along with research context and reference material will be released on <b>October 3rd</b> in the form of <b>The Hackbook</b>. It will provide additional context with recommended tools/APIs, judging criteria, etc.
          </p>
        </div>
      </div>
    </SectionWrapper>
  );
}
