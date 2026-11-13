import { create } from "zustand";

/**
 * Shared state between the 3D scene and the 2D interface around it.
 * (Zustand: components subscribe to just the pieces they read.)
 *
 * Who writes what:
 * - The camera rig (inside the 3D canvas) writes `hoveredId`, `focusedId`,
 *   `detailReady` and `mouseLook`, and registers `camera` commands.
 * - The page writes `detailId` from the URL (/work/[placementId]) and
 *   registers `openDetail` / `closeDetail`, which change the URL.
 */

export interface CameraCommands {
  /** Glide to stand in front of a painting. */
  tourTo: (placementId: string) => void;
  /** Glide to the next (+1) or previous (−1) painting on the tour. */
  tourStep: (direction: 1 | -1) => void;
  /** Glide to the first painting on the tour. */
  tourStart: () => void;
  /** Capture the mouse for first-person looking (desktop). */
  startMouseLook: () => void;
}

export interface GalleryState {
  /** Painting under the cursor (or crosshair), if any. */
  hoveredId: string | null;
  /** Painting the tour is currently standing at, if any. */
  focusedId: string | null;
  /** Painting whose detail view is open, from the URL. */
  detailId: string | null;
  /** True once the camera has arrived at the open painting. */
  detailReady: boolean;
  /** True while the mouse is captured (pointer lock). */
  mouseLook: boolean;
  /** The welcome card has been dismissed. */
  introDismissed: boolean;
  /**
   * Counts instant camera jumps. With reduced motion the camera cuts instead
   * of gliding, and the page briefly fades the view on each cut.
   */
  cuts: number;
  /** A short message shown briefly at the top of the screen. */
  notice: string | null;

  camera: CameraCommands;
  openDetail: (placementId: string, options?: { replace?: boolean }) => void;
  closeDetail: () => void;
}

const noop = () => {};

export const useGalleryStore = create<GalleryState>(() => ({
  hoveredId: null,
  focusedId: null,
  detailId: null,
  detailReady: false,
  mouseLook: false,
  introDismissed: false,
  cuts: 0,
  notice: null,
  camera: { tourTo: noop, tourStep: noop, tourStart: noop, startMouseLook: noop },
  openDetail: noop,
  closeDetail: noop,
}));
