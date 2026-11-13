import type { Metadata } from "next";
import { DEMO_USERNAME, getCollection } from "@/lib/data/collections";
import { roomLabel } from "@/lib/gallery/layout";
import { starterCollection } from "@/lib/gallery/starterCollection";

/** A room's own link. The layout reads the slug and takes you there. */

// The demo's rooms are built ahead of time; other galleries' on request.
export function generateStaticParams({ params }: { params: { username: string } }) {
  if (params.username !== DEMO_USERNAME) return [];
  return starterCollection.rooms.slice(1).map((room) => ({ roomSlug: room.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/g/[username]/[roomSlug]">): Promise<Metadata> {
  const { username, roomSlug } = await params;
  const collection = await getCollection(username);
  const room = collection?.rooms.find((r) => r.slug === roomSlug);
  return { title: room ? `${roomLabel(room)} · ${collection!.collectionName} · Salon` : "Salon" };
}

export default function RoomPage() {
  return null;
}
