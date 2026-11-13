import type { Metadata } from "next";
import { getCollection } from "@/lib/gallery/collections";

/**
 * A painting's own link: /g/[username]/work/[placementId]. The layout reads
 * the id and opens the detail view (or, for an id that isn't hanging here,
 * returns to the room with a note), so this page renders nothing. It sets
 * the page title so shared links read well.
 */

function findPlacement(username: string, id: string) {
  return getCollection(username)
    ?.rooms.flatMap((r) => r.placements)
    .find((p) => p.id === id);
}

export async function generateStaticParams({ params }: { params: { username: string } }) {
  const collection = getCollection(params.username);
  return (collection?.rooms ?? []).flatMap((r) => r.placements).map((p) => ({ placementId: p.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/g/[username]/work/[placementId]">): Promise<Metadata> {
  const { username, placementId } = await params;
  const placement = findPlacement(username, placementId);
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
