/**
 * Hook: useReducedMotion
 *
 * Listens to the system `prefers-reduced-motion` media query.
 * Returns `true` when the user has requested reduced motion.
 * Updates reactively if the preference changes mid-session.
 *
 * Safe for SSR: returns `false` on the server, then resolves on mount.
 */
"use client";

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function getMatch(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(QUERY).matches;
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(false);

  useEffect(() => {
    // Resolve on mount (handles SSR → client hydration)
    setReduced(getMatch());

    const mql = window.matchMedia(QUERY);

    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", handler);

    return () => mql.removeEventListener("change", handler);
  }, []);

  return reduced;
}
