import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AddWork, type AddWorkRoom, type ShelfItem } from "@/components/add/AddWork";
import { getViewer } from "@/lib/auth";
import { getCollection } from "@/lib/data/collections";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Add a work · Salon" };

/** Add a work (HANDOVER.md §2.3): find, saved, storeroom. Owners only. */
export default function AddWorkPage({ searchParams }: PageProps<"/add">) {
  return (
    <main className="bg-ink text-cream min-h-dvh">
      <header className="flex items-center justify-between border-b border-[#2a241d] px-4 py-3 sm:px-6">
        <Link href="/" className="font-serif text-2xl font-semibold tracking-[0.22em]">
          SALON
        </Link>
      </header>
      <Suspense fallback={<p className="text-cream/60 p-8 text-sm">Opening your collection…</p>}>
        <AddWorkPanel searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function AddWorkPanel({ searchParams }: { searchParams: PageProps<"/add">["searchParams"] }) {
  if (!isSupabaseConfigured()) redirect("/login");
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.onboarded) redirect("/welcome");
  const collection = await getCollection(viewer.username);
  if (!collection) redirect("/");

  const supabase = await createClient();
  const [saved, stored] = await Promise.all([
    supabase
      .from("saved_artworks")
      .select(
        "artwork:artworks(id, title, artist, date_text, holder, image_url, image_width, image_height)",
      )
      .eq("user_id", viewer.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("placements")
      .select(
        "id, artwork:artworks(id, title, artist, date_text, holder, image_url, image_width, image_height)",
      )
      .eq("owner_id", viewer.id)
      .is("room_id", null)
      .order("created_at", { ascending: false }),
  ]);
  const toItem = (id: string, a: Record<string, unknown>): ShelfItem => ({
    id,
    title: String(a.title),
    artist: String(a.artist ?? ""),
    dateText: String(a.date_text ?? ""),
    holder: String(a.holder ?? ""),
    imageUrl: String(a.image_url),
    imageWidth: Number(a.image_width),
    imageHeight: Number(a.image_height),
  });

  const rooms: AddWorkRoom[] = collection.rooms.map((r) => ({
    id: r.id,
    label: `Room ${r.number} · ${r.name}`,
    wallColor: r.theme.wallColor,
    lowerWallColor: r.theme.lowerWallColor,
    works: r.placements.length,
  }));
  const params = await searchParams;
  const room =
    typeof params.room === "string" && rooms.some((r) => r.id === params.room)
      ? params.room
      : rooms[0]?.id;
  const tab = params.tab === "saved" || params.tab === "storeroom" ? params.tab : "find";

  return (
    <AddWork
      username={viewer.username}
      rooms={rooms}
      initialRoomId={room}
      initialTab={tab}
      saved={(saved.data ?? []).flatMap((row) => {
        const a = row.artwork as unknown as Record<string, unknown> | null;
        return a ? [toItem(String(a.id), a)] : [];
      })}
      storeroom={(stored.data ?? []).flatMap((row) => {
        const a = row.artwork as unknown as Record<string, unknown> | null;
        return a ? [toItem(String(row.id), a)] : [];
      })}
    />
  );
}
