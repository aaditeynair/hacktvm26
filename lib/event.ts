/**
 * HackTVM'26 — Access Point
 * Central event configuration — single source of truth for copy, links, and dates.
 * Change things once here instead of inside components.
 */

/* ---------- Identity ---------- */
export const EVENT = {
  name: "HackTVM'26",
  fullName: "HackTVM'26 · Access Point",
  tagline: "Everyone deserves a way in",

  eventDateISO: "2026-10-10T00:00:00+05:30",
  eventLabel: "October 10, 2026",
  venue: "The School of the Good Shepherd",

  /* ---------- Action links (all placeholders — wire before launch) ---------- */
  register: {
    url: "https://example.com/hacktvm-register", // TODO: real registration URL
    label: "Register Now",
    enabled: false, // TODO: flip to true once the link goes live
  },

  brochure: {
    path: "/brochure.pdf", // TODO: real brochure file in /public
    label: "Download Brochure",
  },

  hackbook: {
    path: null as string | null, // TODO: real hackbook file in /public when released
    label: "Download Hackbook",
    comingLabel: "Coming Oct 3",
  },

  /* ---------- Key dates ---------- */
  keyDates: {
    registration: null, // TODO(dates): registration was extended — new dates TBD
    orientation: "Sep 23",
    screening: null, // TODO(dates): may have shifted — confirm before publishing
  },

  /* ---------- Contact & socials (placeholders) ---------- */
  contact: {
    email: "hello@hacktvm.example", // TODO: real contact email
    socials: [
      { label: "Instagram", url: "https://example.com/hacktvm" }, // TODO: real handle
      { label: "X / Twitter", url: "https://example.com/hacktvm" }, // TODO: real handle
      { label: "Discord", url: "https://example.com/hacktvm" }, // TODO: real invite link
    ],
  },
} as const;