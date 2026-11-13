import { GalleryExperience } from "@/components/gallery/GalleryExperience";
import { starterRoom } from "@/lib/gallery/starterRoom";

/**
 * Phase 2: one hard-coded room. From Phase 4/5 the gallery moves to
 * /g/[username] and rooms come from the database.
 */
export default function Home() {
  return <GalleryExperience room={starterRoom} />;
}
