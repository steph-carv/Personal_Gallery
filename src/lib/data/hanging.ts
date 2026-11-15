import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { remoteImageSize } from "@/lib/catalogue/imageSize";
import type { CatalogueWork } from "@/lib/catalogue/types";
import { findWallSpot, type WallSpot } from "@/lib/gallery/hanging";
import { layoutRooms } from "@/lib/gallery/layout";
import type { Artwork, Collection, FrameSettings } from "@/lib/gallery/types";
import { createAdminClient } from "@/lib/supabase/admin";

/** The frame new works get until collection defaults arrive (Phase 9). */
export const DEFAULT_FRAME: FrameSettings = { style: "simple-gilt", width: "standard" };

export class HangingError extends Error {}

/**
 * The database id of a catalogue work, adding it to the shared catalogue
 * first if nobody has hung it before. `work` must come from the server's own
 * lookup at the museum, never from the browser.
 */
export async function catalogueArtworkId(
  supabase: SupabaseClient,
  work: CatalogueWork,
): Promise<string> {
  // Catalogue works are public, so any signed-in user can see if it's there.
  const { data: existing } = await supabase
    .from("artworks")
    .select("id")
    .eq("source", work.source)
    .eq("source_id", work.sourceId)
    .maybeSingle();
  if (existing) return existing.id as string;

  const admin = createAdminClient();
  if (!admin) {
    throw new HangingError(
      "Adding new works needs the server's Supabase secret key (SUPABASE_SECRET_KEY). See the README.",
    );
  }
  // Some museums don't say how big the image is; read it from the file so
  // the frame fits exactly.
  const size = work.source === "met" ? await remoteImageSize(work.imageUrl) : null;
  const { data, error } = await admin
    .from("artworks")
    .upsert(
      {
        kind: "catalogue",
        source: work.source,
        source_id: work.sourceId,
        title: work.title,
        artist: work.artist,
        artist_meta: work.artistMeta,
        date_text: work.dateText,
        medium: work.medium,
        dimensions_text: work.dimensionsText,
        width_cm: work.widthCm || null,
        height_cm: work.heightCm || null,
        holder: work.holder,
        description: work.description ?? null,
        description_credit: work.descriptionCredit ?? null,
        image_url: work.imageUrl,
        image_width: size?.width ?? work.imageWidth,
        image_height: size?.height ?? work.imageHeight,
        is_public_domain: true,
        attribution: work.attribution,
        source_url: work.sourceUrl,
      },
      { onConflict: "source,source_id" },
    )
    .select("id")
    .single();
  if (error || !data) {
    console.error("Adding catalogue work failed", error);
    throw new HangingError("Couldn't add that work to the catalogue. Please try again.");
  }
  return data.id as string;
}

/** Where a work would go in a room, or null if the walls are full. */
export function spotInRoom(
  collection: Collection,
  roomId: string,
  artwork: Artwork,
): WallSpot | null {
  const room = layoutRooms(collection.rooms).find((r) => r.id === roomId);
  if (!room) throw new HangingError("That room isn't in your collection.");
  return findWallSpot(room, artwork, DEFAULT_FRAME);
}
