/**
 * HackTVM'26 — Access Point
 * Persistent header with centered word logo.
 *
 * Fixed to top of viewport, z-index above scroll content.
 * Hidden during the loading screen (isLoading === true).
 * Uses Framer Motion for fade-in/out on loading transition.
 */
"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { DURATIONS } from "@/lib/constants";

export function Header() {
  const { isLoading, isReducedMotion } = useApp();

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none pt-4"
      aria-hidden={isLoading}
      initial={{ opacity: 0 }}
      animate={{ opacity: isLoading ? 0 : 1 }}
      transition={{
        duration: isReducedMotion ? 0 : DURATIONS.normal,
        delay: isReducedMotion ? 0 : 0.3,
      }}
    >
      <Image
        src="/logo.png"
        alt="HackTVM'26"
        width={240}
        height={40}
        priority
        className="select-none py-4 h-auto w-auto max-h-12"
      />
    </motion.header>
  );
}
