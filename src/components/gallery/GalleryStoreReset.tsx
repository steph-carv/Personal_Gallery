"use client";

import { useLayoutEffect } from "react";
import { useGalleryStore } from "@/lib/gallery/useGalleryStore";

/**
 * The gallery's shared state lives for the whole visit. When you go from one
 * gallery to another, clear what belonged to the last one (its room, open
 * painting, focus) before the new gallery's components read it. A layout
 * effect, rendered first, runs before any of their effects.
 */
export function GalleryStoreReset({ galleryKey }: { galleryKey: string }) {
  useLayoutEffect(() => {
    useGalleryStore.setState({
      currentRoomId: null,
      roomRequest: null,
      hoveredId: null,
      focusedId: null,
      detailId: null,
      detailReady: false,
      introDismissed: false,
    });
  }, [galleryKey]);
  return null;
}
