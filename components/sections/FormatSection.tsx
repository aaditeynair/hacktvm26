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
          <div className="mb-4 ">
            <h1 className="text-2xl font-bold font-mono">Event Format</h1>
          </div>
          <p className="text-gray-mid leading-7">
            Most hackathons end when the timer hits zero. We give you the funding and the runway to actually finish what you started.
          </p>
          <div className="my-6">
            <h2 className="pb-1 font-mono uppercase tracking-wide">Phase I - The Hackathon:</h2>
            <p>A 7-hour sprint where teams conceptualize, design, and build a solution to any one of the problem statements presented to them.</p>
          </div>
          <div className="mb-6">
            <h2 className="pb-1 font-mono uppercase tracking-wide">Development Phase:</h2>
            <p>Top 5 teams from Phase I will receive a &#8377;10,000 development grant and 3 weeks to refine their prototypes and work on their final pitch.</p>
          </div>
          <div className="mb-6">
            <h2 className="pb-1 font-mono uppercase tracking-wide">Phase II - Demo Day:</h2>
            <p>The top 5 teams present their finished products to a panel of industry judges. The top 3 teams will be offered internship opportunities with partnership companies along with cash prizes.</p>
          </div>
        </div>

        {/* Right rail — full, vertically centred */}
        <div className="absolute right-5 top-1/2 -translate-y-1/2 sm:right-8 md:right-[6%] w-full max-w-md font-mono uppercase tracking-wide space-y-4">
          <div className="grid grid-cols-3 w-full">
            <p className="text-left">Registrations</p>
            <p className="text-center">—</p>
            <p className="text-right">Sep 1 to 16</p>
          </div>
          <div className="grid grid-cols-3 w-full items-center">
            <p className="text-left">Orientation on Screening</p>
            <p className="text-center">—</p>
            <p className="text-right">Sep 20</p>
          </div>
          <div className="grid grid-cols-3 w-full">
            <p className="text-left">Screening</p>
            <p className="text-center">—</p>
            <p className="text-right">Sep 21 to 27</p>
          </div>
          <div className="grid grid-cols-3 w-full items-center">
            <p className="text-left">Hackbook Release</p>
            <p className="text-center">—</p>
            <p className="text-right">Oct 3</p>
          </div>
          <div className="grid grid-cols-3 w-full">
            <p className="text-left">Phase I</p>
            <p className="text-center">—</p>
            <p className="text-right">Oct 10</p>
          </div>
          <div className="grid grid-cols-3 w-full">
            <p className="text-left">Phase II</p>
            <p className="text-center">—</p>
            <p className="text-right">Oct 31</p>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
