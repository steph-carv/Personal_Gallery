import type { Metadata } from "next";
import { getCollection } from "@/lib/gallery/collections";
import { roomLabel } from "@/lib/gallery/layout";

/** A room's own link. The layout reads the slug and takes you there. */

export async function generateStaticParams({ params }: { params: { username: string } }) {
  const collection = getCollection(params.username);
  return (collection?.rooms ?? []).slice(1).map((room) => ({ roomSlug: room.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/g/[username]/[roomSlug]">): Promise<Metadata> {
  const { username, roomSlug } = await params;
  const room = getCollection(username)?.rooms.find((r) => r.slug === roomSlug);
  return { title: room ? `${roomLabel(room)} · Salon` : "Salon" };
}

export default function RoomPage() {
  return null;
}
