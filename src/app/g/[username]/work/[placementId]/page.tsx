import type { Metadata } from "next";
import { DEMO_USERNAME, getCollection } from "@/lib/data/collections";
import { starterCollection } from "@/lib/gallery/starterCollection";

/**
 * A painting's own link: /g/[username]/work/[placementId]. The layout reads
 * the id and opens the detail view (or, for an id that isn't hanging here,
 * returns to the room with a note), so this page renders nothing. It sets
 * the page title so shared links read well.
 */

export function generateStaticParams({ params }: { params: { username: string } }) {
  if (params.username !== DEMO_USERNAME) return [];
  return starterCollection.rooms.flatMap((r) => r.placements).map((p) => ({ placementId: p.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/g/[username]/work/[placementId]">): Promise<Metadata> {
  const { username, placementId } = await params;
  const collection = await getCollection(username);
  const placement = collection?.rooms
    .flatMap((r) => r.placements)
    .find((p) => p.id === placementId);
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
