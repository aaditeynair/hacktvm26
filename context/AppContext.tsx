/**
 * HackTVM'26 — Access Point
 * Global application state context.
 *
 * Provides:
 * - activeSection: which snap-section is currently visible (0-indexed)
 * - hasUnlocked: true after the user has opened and closed the key modal once
 * - isModalOpen / hasOpenedModal: modal state and first-open tracking
 * - isReducedMotion: system prefers-reduced-motion setting
 * - isTouchDevice: touch-capable device detection
 * - isLoading: loading screen visible (prevents interaction with main content)
 */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useIsTouch } from "@/hooks/useIsTouch";

/* ---------- Shape ---------- */
interface AppState {
  activeSection: number;
  setActiveSection: (n: number) => void;

  hasUnlocked: boolean;
  setHasUnlocked: (v: boolean) => void;

  isModalOpen: boolean;
  setIsModalOpen: (v: boolean) => void;

  hasOpenedModal: boolean;
  setHasOpenedModal: (v: boolean) => void;

  isReducedMotion: boolean;
  isTouchDevice: boolean;

  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}

/* ---------- Context ---------- */
const AppContext = createContext<AppState | null>(null);

/* ---------- Provider ---------- */
export function AppProvider({ children }: { children: ReactNode }) {
  const [activeSection, setActiveSection] = useState(0);
  const [hasUnlocked, setHasUnlocked] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasOpenedModal, setHasOpenedModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isReducedMotion = useReducedMotion();
  const isTouchDevice = useIsTouch();

  const value = useMemo<AppState>(
    () => ({
      activeSection,
      setActiveSection,
      hasUnlocked,
      setHasUnlocked,
      isModalOpen,
      setIsModalOpen,
      hasOpenedModal,
      setHasOpenedModal,
      isReducedMotion,
      isTouchDevice,
      isLoading,
      setIsLoading,
    }),
    [
      activeSection,
      hasUnlocked,
      isModalOpen,
      hasOpenedModal,
      isReducedMotion,
      isTouchDevice,
      isLoading,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/* ---------- Hook ---------- */
export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used within an <AppProvider>");
  }
  return ctx;
}
