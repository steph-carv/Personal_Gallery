import { Suspense } from "react";
import { DetailRouteSync } from "@/components/gallery/DetailRouteSync";
import { GalleryExperience } from "@/components/gallery/GalleryExperience";
import { starterRoom } from "@/lib/gallery/starterRoom";

/**
 * The gallery lives in a layout so it stays mounted while the URL changes
 * between the room (/) and a painting (/work/[placementId]). The 3D scene
 * keeps running and the camera glides, instead of the page reloading.
 *
 * Phase 2–3: one hard-coded room at the site root. From Phase 4/5 this moves
 * to /g/[username] with rooms from the database.
 */
export default function GalleryLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <GalleryExperience room={starterRoom} />
      {/* Reads the URL's placement id; inside Suspense as Cache Components requires. */}
      <Suspense fallback={null}>
        <DetailRouteSync basePath="" placementIds={starterRoom.placements.map((p) => p.id)} />
      </Suspense>
      {children}
    </>
  );
}
