"use server";

import { getViewer } from "@/lib/auth";
import { getCatalogueWork } from "@/lib/catalogue";
import { getCollection } from "@/lib/data/collections";
import { catalogueArtworkId, DEFAULT_FRAME, HangingError, spotInRoom } from "@/lib/data/hanging";
import type { Artwork } from "@/lib/gallery/types";
import { createClient } from "@/lib/supabase/server";

/**
 * Hanging works (HANDOVER.md §2.3). Every action checks who's asking; the
 * database's row-level security then only lets you change your own rooms.
 */

export type HangResult =
  { ok: true; message: string; href: string } | { ok: false; message: string };

async function signedIn() {
  const viewer = await getViewer();
  if (!viewer) throw new HangingError("Please sign in again.");
  const collection = await getCollection(viewer.username);
  if (!collection) throw new HangingError("Couldn't load your collection.");
  return { viewer, collection, supabase: await createClient() };
}

/** Run an action, turning expected problems into a message for the page. */
async function attempt(action: () => Promise<HangResult>): Promise<HangResult> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof HangingError) return { ok: false, message: error.message };
    console.error("Hanging failed", error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

/**
 * Hang a work from the museum search. Only the source and its id come from
 * the browser: the work is looked up again at the museum (which also
 * re-checks it's public domain) before anything is saved.
 */
export async function hangFromCatalogue(source: string, sourceId: string, roomId: string) {
  return attempt(async () => {
    const work = await getCatalogueWork(source, sourceId).catch((error) => {
      console.error("Looking up a work to hang failed", error);
      throw new HangingError(
        "Couldn't reach the museum just now to check that work. Please try again in a moment.",
      );
    });
    if (!work)
      throw new HangingError("That work isn't available to hang (it may not be public domain).");
    const { viewer, collection, supabase } = await signedIn();
    const artworkId = await catalogueArtworkId(supabase, work);
    return placeArtwork(
      viewer.username,
      collection,
      supabase,
      artworkId,
      { id: artworkId, ...work },
      roomId,
    );
  });
}

/** Hang a work you saved from someone else's gallery. */
export async function hangSaved(artworkId: string, roomId: string) {
  return attempt(async () => {
    const { viewer, collection, supabase } = await signedIn();
    const { data } = await supabase
      .from("saved_artworks")
      .select("artwork:artworks(*)")
      .eq("user_id", viewer.id)
      .eq("artwork_id", artworkId)
      .maybeSingle();
    const row = data?.artwork as unknown as Record<string, unknown> | null;
    if (!row) throw new HangingError("That work isn't in your saved list.");
    return placeArtwork(
      viewer.username,
      collection,
      supabase,
      artworkId,
      rowToArtwork(row),
      roomId,
    );
  });
}

/** Hang a work from the storeroom in a room. */
export async function hangFromStoreroom(placementId: string, roomId: string) {
  return attempt(async () => {
    const { viewer, collection, supabase } = await signedIn();
    const { data } = await supabase
      .from("placements")
      .select("id, artwork:artworks(*)")
      .eq("id", placementId)
      .eq("owner_id", viewer.id)
      .is("room_id", null)
      .maybeSingle();
    const row = data?.artwork as unknown as Record<string, unknown> | null;
    if (!row) throw new HangingError("That work isn't in your storeroom.");
    const spot = spotInRoom(collection, roomId, rowToArtwork(row));
    if (!spot) throw new HangingError("There's no space left on that room's walls.");
    const { error } = await supabase
      .from("placements")
      .update({ room_id: roomId, ...spot })
      .eq("id", placementId);
    if (error) throw new HangingError("Couldn't hang it. Please try again.");
    return hung(viewer.username, collection, roomId, placementId);
  });
}

/** Take a work out of the storeroom altogether. */
export async function removeFromStoreroom(placementId: string) {
  return attempt(async () => {
    const { viewer, supabase } = await signedIn();
    const { error } = await supabase
      .from("placements")
      .delete()
      .eq("id", placementId)
      .eq("owner_id", viewer.id)
      .is("room_id", null);
    if (error) throw new HangingError("Couldn't remove it. Please try again.");
    return { ok: true, message: "Removed from your storeroom.", href: "/add?tab=storeroom" };
  });
}

/** Put an artwork on the walls of a room, or in the storeroom if they're full. */
async function placeArtwork(
  username: string,
  collection: NonNullable<Awaited<ReturnType<typeof getCollection>>>,
  supabase: Awaited<ReturnType<typeof createClient>>,
  artworkId: string,
  artwork: Artwork,
  roomId: string,
): Promise<HangResult> {
  const spot = spotInRoom(collection, roomId, artwork);
  const { data, error } = await supabase
    .from("placements")
    .insert({
      owner_id: collection.ownerId,
      artwork_id: artworkId,
      room_id: spot ? roomId : null,
      wall: spot?.wall ?? null,
      x: spot?.x ?? 0,
      y: spot?.y ?? 1.6,
      frame: { version: 1, ...DEFAULT_FRAME },
      show_label: true,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("Hanging failed", error);
    throw new HangingError("Couldn't hang it. Please try again.");
  }
  if (!spot) {
    return {
      ok: true,
      message: "That room's walls are full, so it's waiting in your storeroom.",
      href: "/add?tab=storeroom",
    };
  }
  return hung(username, collection, roomId, data.id as string);
}

function hung(
  username: string,
  collection: { rooms: { id: string; name: string; number: number }[] },
  roomId: string,
  placementId: string,
): HangResult {
  const room = collection.rooms.find((r) => r.id === roomId)!;
  return {
    ok: true,
    message: `Hung in Room ${room.number} · ${room.name}.`,
    href: `/g/${username}/work/${placementId}`,
  };
}

/** A database artwork row in the shape the hanging maths needs. */
function rowToArtwork(row: Record<string, unknown>): Artwork {
  return {
    id: String(row.id),
    source: row.source as Artwork["source"],
    sourceId: String(row.source_id ?? row.id),
    title: String(row.title),
    artist: String(row.artist ?? ""),
    artistMeta: {},
    dateText: String(row.date_text ?? ""),
    medium: String(row.medium ?? ""),
    dimensionsText: String(row.dimensions_text ?? ""),
    widthCm: Number(row.width_cm ?? 0),
    heightCm: Number(row.height_cm ?? 0),
    holder: String(row.holder ?? ""),
    imageUrl: String(row.image_url),
    imageWidth: Number(row.image_width),
    imageHeight: Number(row.image_height),
    attribution: String(row.attribution ?? ""),
    sourceUrl: String(row.source_url ?? ""),
  };
}
