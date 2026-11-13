"use client";

import { useMediaQuery } from "./useMediaQuery";

/**
 * True when the visitor has asked their system for less motion. The gallery
 * then fades between views instead of flying the camera (HANDOVER.md §6).
 */
export function usePrefersReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
