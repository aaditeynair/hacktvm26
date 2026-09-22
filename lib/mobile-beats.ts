/**
 * HackTVM'26 — Access Point
 * Mobile beat content.
 *
 * The mobile experience is a single full-screen scroller of invisible
 * "spacers" — one per beat. Each beat's `weight` scales the spacer's
 * min-height (weight × 80dvh), so denser beats get more scroll room. The
 * scroller never shows content; the active beat is rendered into the fixed
 * bottom panel by MobileBeatPanel.
 *
 * Copy is mirrored from the desktop sections. All numbers and dates come from
 * lib/event.ts where they exist there; anything event.ts doesn't carry is
 * hard-coded here (and only here on mobile).
 */
import { EVENT } from "@/lib/event";

/* ---------- Beat content ---------- */
export type BeatContent =
  | { kind: "hero"; title: string; tagline: string; body: string }
  | { kind: "facts"; facts: { label: string; value: string }[] }
  | { kind: "statement"; title: string; body: string }
  | { kind: "list"; title: string; intro?: string; items: string[] }
  | {
      kind: "points";
      title: string;
      intro?: string;
      entries: { heading: string; body: string }[];
    }
  | { kind: "note"; title: string; body: string }
  | { kind: "key"; hint: string };

export interface Beat {
  id: string;
  phase: number;
  weight: number;
  content: BeatContent;
}

/**
 * Spacer min-height for a beat. The last beat is forced to at least 100dvh so
 * its top edge is exactly reachable at maximum scroll (mirrors a desktop snap
 * section's "lands at the bottom" behaviour); 0.8×80dvh alone would leave its
 * start unobtainable.
 */
export function spacerHeight(beat: Beat, isLast: boolean): string {
  const base = `calc(${beat.weight} * 80dvh)`;
  return isLast ? `max(${base}, 100dvh)` : base;
}

export const BEATS: readonly Beat[] = [
  /* ---- Phase 0 · Overview ---- */
  {
    id: "intro",
    phase: 0,
    weight: 1,
    content: {
      kind: "hero",
      title: "HackTVM'26: Access Point",
      tagline: "Everyone deserves a way in",
      body: "Organized by the School of the Good Shepherd's HackTVM, HackTVM'26 is the Second Edition of Trivandrum's first and only inter-school hackathon. It gives student innovators a direct inroad to the tech industry by challenging them to build working technology that solves real-world challenges.",
    },
  },
  {
    id: "overview-facts",
    phase: 0,
    weight: 1,
    content: {
      kind: "facts",
      facts: [
        { label: "Date", value: EVENT.eventLabel },
        { label: "Venue", value: EVENT.venue },
        { label: "Eligibility", value: "Grades 8 to 12" },
        { label: "Entry Fee", value: "₹1,200 per team (after screening)" },
      ],
    },
  },
  {
    id: "opportunity",
    phase: 0,
    weight: 0.6,
    content: {
      kind: "statement",
      title: "The Opportunity",
      body: "₹10,000 development grant for finalist teams — plus tech internships and cash prizes for the top 3 winners.",
    },
  },

  /* ---- Phase 1 · Theme ---- */
  {
    id: "theme",
    phase: 1,
    weight: 0.8,
    content: {
      kind: "statement",
      title: "Access Point",
      body: "If a system or space stands between a person and their independence, it's broken — you're here to build the sledgehammer. Access Point challenges students to design working technology that closes real, everyday gaps in accessibility and inclusivity: navigating a space, communicating, learning, working, or getting basic public information everyone else takes for granted.",
    },
  },
  {
    id: "friction",
    phase: 1,
    weight: 1,
    content: {
      kind: "list",
      title: "5 Frictions to Tackle",
      intro: "Expect to tackle friction across 5 primary dimensions:",
      items: [
        "Physical & Spatial Friction",
        "Sensory & Perception Walls",
        "Cognitive Complexity",
        "Systemic & Public Barriers",
        "Health Barriers",
      ],
    },
  },
  {
    id: "hackbook",
    phase: 1,
    weight: 0.8,
    content: {
      kind: "note",
      title: "The Hackbook",
      body: `Further specifics on the theme, research context, and reference material will be released on ${EVENT.hackbook.releaseLabel} in the form of The Hackbook — it will provide additional context with recommended tools and APIs, judging criteria, and more.`,
    },
  },

  /* ---- Phase 2 · Event Format ---- */
  {
    id: "format",
    phase: 2,
    weight: 1.3,
    content: {
      kind: "points",
      title: "Event Format",
      intro:
        "Most hackathons end when the timer hits zero. We give you the funding and the runway to actually finish what you started.",
      entries: [
        {
          heading: `${EVENT.phaseI.label} — The Hackathon`,
          body: "A 7-hour sprint where teams conceptualize, design, and build a solution to any one of the problem statements presented to them.",
        },
      ],
    },
  },
  {
    id: "development",
    phase: 2,
    weight: 1.3,
    content: {
      kind: "points",
      title: "Development Phase",
      entries: [
        {
          heading: "The Grant",
          body: "Top 5 teams from Phase I receive a ₹10,000 development grant and 3 weeks to refine their prototypes and work on their final pitch.",
        },
        {
          heading: `${EVENT.phaseII.label} — Demo Day`,
          body: "The top 5 teams present their finished products to a panel of industry judges. The top 3 teams are offered internship opportunities with partnership companies along with cash prizes.",
        },
      ],
    },
  },
  {
    id: "timeline-in",
    phase: 2,
    weight: 1,
    content: {
      kind: "facts",
      facts: [
        {
          label: "Registrations",
          value: "TBD", // TODO(dates): registration was extended — new dates TBD
        },
        {
          label: "Orientation on Screening",
          value: EVENT.keyDates.orientation,
        },
        {
          label: "Screening",
          value: "TBD", // TODO(dates): screening dates may have shifted — confirm before publishing
        },
      ],
    },
  },
  {
    id: "timeline-event",
    phase: 2,
    weight: 1,
    content: {
      kind: "facts",
      facts: [
        {
          label: "Hackbook Release",
          value: EVENT.hackbook.releaseLabel,
        },
        {
          label: EVENT.phaseI.label,
          value: EVENT.phaseI.dateLabel,
        },
        {
          label: EVENT.phaseII.label,
          value: EVENT.phaseII.dateLabel,
        },
      ],
    },
  },

  /* ---- Phase 3 · Timeline & Registration ---- */
  {
    id: "prizes",
    phase: 3,
    weight: 1.3,
    content: {
      kind: "points",
      title: "What You Can Win",
      entries: [
        {
          heading: "Top 5 Finalists",
          body: "₹10,000 development grant per team to build out your prototype.",
        },
        {
          heading: "Top 3 Winners",
          body: "Cash prizes of ₹25,000, ₹15,000 and ₹10,000 — and project-based internships with partner tech companies.",
        },
        {
          heading: "All Participants",
          body: "Official certificates, direct tech-industry exposure, and mentor feedback.",
        },
      ],
    },
  },
  {
    id: "judging",
    phase: 3,
    weight: 1,
    content: {
      kind: "points",
      title: "How We Judge",
      entries: [
        {
          heading: "Concept & Vision",
          body: "Idea originality and a realistic roadmap to scale it.",
        },
        {
          heading: "Theme Alignment",
          body: "Real-world impact solved from the user's perspective, not assumptions.",
        },
        {
          heading: "Technical Execution",
          body: "Working code or hardware that you can defend in technical Q&A.",
        },
      ],
    },
  },
  {
    id: "checklist",
    phase: 3,
    weight: 1,
    content: {
      kind: "list",
      title: "Registration Checklist",
      intro: "Before you hit submit, make sure your team has all of this sorted out:",
      items: [
        "Students in Grades 8 to 12",
        "2 to 4 students per team",
        "Strictly 1 team per school",
        "1 teacher or faculty member to accompany the team as a mentor",
        "A signed and stamped Letter of Authorization from your school Principal",
      ],
    },
  },

  /* ---- Phase 4 · The Key ---- */
  {
    id: "key",
    phase: 4,
    weight: 0.8,
    content: {
      kind: "key",
      hint: "Your key is ready. Tap the key above to open registration and contact details.",
    },
  },
];

/** Number of dots shown in the mobile footer (one per phase). */
export const PHASE_COUNT = 5;