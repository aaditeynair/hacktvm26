/**
 * Hook: useIsTouch
 *
 * Detects whether the current device is touch-capable.
 * Returns `true` on touch devices, `false` otherwise.
 *
 * Safe for SSR: returns `false` on the server, then resolves on mount.
 */
"use client";

import { useEffect, useState } from "react";

function detect(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0
  );
}

export function useIsTouch(): boolean {
  const [isTouch, setIsTouch] = useState<boolean>(false);

  useEffect(() => {
    setIsTouch(detect());
  }, []);

  return isTouch;
}
