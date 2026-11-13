import type { Metadata } from "next";
import { starterRoom } from "@/lib/gallery/starterRoom";

/**
 * A painting's own link: /work/[placementId]. The gallery layout reads the id
 * from the URL and opens the detail view (or, for an id that isn't hanging
 * here, returns to the room with a note), so this page renders nothing. It
 * sets the page title so shared links read well.
 */

function findPlacement(id: string) {
  return starterRoom.placements.find((p) => p.id === id);
}

// Known ids are built ahead of time, so the links load instantly.
export function generateStaticParams() {
  return starterRoom.placements.map((p) => ({ placementId: p.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/work/[placementId]">): Promise<Metadata> {
  const { placementId } = await params;
  const placement = findPlacement(placementId);
  if (!placement) return { title: "Salon" };
  const { artwork } = placement;
  return {
    title: `${artwork.title} · Salon`,
    description: `${artwork.title} by ${artwork.artist}, ${artwork.dateText}. ${artwork.holder}.`,
  };
}

export default function WorkPage() {
  return null;
}
