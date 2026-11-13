import { create } from "zustand";

/**
 * Shared state between the 3D scene and the 2D interface around it.
 * (Zustand: components subscribe to just the pieces they read.)
 */
interface GalleryState {
  /** True while the mouse is captured and you're walking the room. */
  walking: boolean;
  setWalking: (walking: boolean) => void;
  /** Capture the mouse and start walking. Registered by WalkControls. */
  startWalking: () => void;
  registerStartWalking: (fn: () => void) => void;
}

export const useGalleryStore = create<GalleryState>((set) => ({
  walking: false,
  setWalking: (walking) => set({ walking }),
  startWalking: () => {},
  registerStartWalking: (fn) => set({ startWalking: fn }),
}));
