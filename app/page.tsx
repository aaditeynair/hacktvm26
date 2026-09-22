/**
 * HackTVM'26 — Access Point
 * Root page: renders the mobile experience below 768px and the desktop
 * snap-scroll experience at >= 768px. Only one experience mounts at a time,
 * so only one of them feeds activeSection / activeBeat / blob progress.
 *
 * useIsMobile() starts as false (SSR-safe); the swap to the mobile tree is
 * masked by the full-screen LoadingScreen in root layout.
 */
"use client";

import { useIsMobile } from "@/hooks/useMediaQuery";
import { DesktopExperience } from "@/components/experience/DesktopExperience";
import { MobileExperience } from "@/components/mobile/MobileExperience";

export default function Home() {
  const isMobile = useIsMobile();

  return isMobile ? <MobileExperience /> : <DesktopExperience />;
}