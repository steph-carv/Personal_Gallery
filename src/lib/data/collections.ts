import "server-only";
import { cache } from "react";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { frameSchema, roomThemeSchema } from "@/lib/gallery/schemas";
import { starterCollection } from "@/lib/gallery/starterCollection";
import type { Artwork, Collection, Placement, Room } from "@/lib/gallery/types";
import { createClient } from "@/lib/supabase/server";

/** The built-in demo gallery, served from code so it works without a database. */
export const DEMO_USERNAME = starterCollection.username;

/** Every room is the same shell for now; room sizes become a theme option later. */
const SHELL = { width: 12, depth: 9, height: 5 };

/**
 * A gallery by username, as the current visitor is allowed to see it, or
 * null if there's no such gallery or it's private and not theirs. (Row-level
 * security does the hiding: a private gallery simply returns no rows.)
 *
 * Cached for the length of one request, so the layout and the page's
 * metadata share one set of queries.
 */
export const getCollection = cache(async (username: string): Promise<Collection | null> => {
  if (username === DEMO_USERNAME) return starterCollection;
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, username, collection_name, visibility")
    .eq("username", username)
    .maybeSingle();
  const profile = profileSchema.safeParse(profileRow);
  if (!profile.success) return null;
  const ownerId = profile.data.id;

  const [rooms, placements, overrides] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, slug, name, intro, position, theme")
      .eq("owner_id", ownerId)
      .order("position"),
    supabase
      .from("placements")
      .select("id, room_id, wall, x, y, frame, show_label, personal_note, artwork:artworks(*)")
      .eq("owner_id", ownerId)
      .not("room_id", "is", null),
    supabase.from("artwork_overrides").select("artwork_id, fields").eq("owner_id", ownerId),
  ]);
  if (rooms.error || placements.error) {
    console.error("Loading gallery failed", rooms.error ?? placements.error);
    return null;
  }

  const labelEdits = new Map(
    z
      .array(overrideSchema)
      .catch([])
      .parse(overrides.data ?? [])
      .map((o) => [o.artwork_id, o.fields]),
  );
  const byRoom = new Map<string, Placement[]>();
  for (const row of placements.data ?? []) {
    const parsed = placementSchema.safeParse(row);
    // Skip works the visitor isn't allowed to see (e.g. a private upload
    // in a shared gallery: its artwork comes back empty).
    if (!parsed.success || !parsed.data.artwork) continue;
    const p = parsed.data;
    const artwork = parsed.data.artwork;
    const placement: Placement = {
      id: p.id,
      artwork: toArtwork(artwork, labelEdits.get(artwork.id)),
      wall: p.wall,
      x: p.x,
      y: p.y,
      frame: frameSchema.parse(p.frame),
      showLabel: p.show_label,
      personalNote: p.personal_note ?? undefined,
    };
    byRoom.set(p.room_id, [...(byRoom.get(p.room_id) ?? []), placement]);
  }

  return {
    username: profile.data.username,
    collectionName: profile.data.collection_name,
    ownerId,
    visibility: profile.data.visibility,
    rooms: z
      .array(roomRowSchema)
      .parse(rooms.data ?? [])
      .map((r): Room => ({
        id: r.id,
        slug: r.slug,
        number: r.position + 1,
        name: r.name,
        intro: r.intro,
        ...SHELL,
        theme: roomThemeSchema.parse(r.theme),
        placements: byRoom.get(r.id) ?? [],
      })),
  };
});

/* ------------------------------------------------------------------------ */
/* Row shapes, checked as they come out of the database                     */
/* ------------------------------------------------------------------------ */

const profileSchema = z.object({
  id: z.string(),
  username: z.string(),
  collection_name: z.string(),
  visibility: z.enum(["public", "private"]),
});

const roomRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  intro: z.string(),
  position: z.number(),
  theme: z.unknown(),
});

const artworkRowSchema = z.object({
  id: z.string(),
  source: z.enum([
    "met",
    "aic",
    "wikidata",
    "rijks",
    "smithsonian",
    "cleveland",
    "europeana",
    "user",
  ]),
  source_id: z.string().nullable(),
  title: z.string(),
  artist: z.string(),
  artist_meta: z
    .object({ nationality: z.string().optional(), lifeDates: z.string().optional() })
    .catch({}),
  date_text: z.string(),
  medium: z.string(),
  dimensions_text: z.string(),
  width_cm: z.coerce.number().nullable(),
  height_cm: z.coerce.number().nullable(),
  holder: z.string(),
  description: z.string().nullable(),
  description_credit: z.string().nullable(),
  image_url: z.string(),
  image_width: z.number(),
  image_height: z.number(),
  attribution: z.string(),
  source_url: z.string().nullable(),
});

const placementSchema = z.object({
  id: z.string(),
  room_id: z.string(),
  wall: z.enum(["north", "east", "south", "west"]),
  x: z.number(),
  y: z.number(),
  frame: z.unknown(),
  show_label: z.boolean(),
  personal_note: z.string().nullable(),
  artwork: artworkRowSchema.nullable(),
});

/** Fields an owner can change on their copy of a label. */
const overrideSchema = z.object({
  artwork_id: z.string(),
  fields: z
    .object({
      title: z.string(),
      artist: z.string(),
      dateText: z.string(),
      medium: z.string(),
      dimensionsText: z.string(),
      holder: z.string(),
      description: z.string(),
    })
    .partial()
    .catch({}),
});

function toArtwork(row: z.infer<typeof artworkRowSchema>, edits: Partial<Artwork> = {}): Artwork {
  return {
    id: row.id,
    source: row.source,
    sourceId: row.source_id ?? row.id,
    title: row.title,
    artist: row.artist,
    artistMeta: row.artist_meta,
    dateText: row.date_text,
    medium: row.medium,
    dimensionsText: row.dimensions_text,
    widthCm: row.width_cm ?? 0,
    heightCm: row.height_cm ?? 0,
    holder: row.holder,
    imageUrl: row.image_url,
    imageWidth: row.image_width,
    imageHeight: row.image_height,
    attribution: row.attribution,
    sourceUrl: row.source_url ?? "",
    description: row.description ?? undefined,
    descriptionCredit: row.description_credit ?? undefined,
    ...edits,
  };
}
