/**
 * Gallery data shapes. These mirror the tables in HANDOVER.md §4 (in
 * camelCase) so the hard-coded Phase 2 room can be swapped for database rows
 * in Phase 5 without touching the 3D code.
 */

export type WallId = "north" | "east" | "south" | "west";

export type ArtworkSource =
  "met" | "aic" | "wikidata" | "rijks" | "smithsonian" | "cleveland" | "europeana" | "user";

export interface Artwork {
  id: string;
  source: ArtworkSource;
  sourceId: string;
  title: string;
  artist: string;
  /** e.g. "Dutch, 1853–1890" */
  artistMeta: { nationality?: string; lifeDates?: string };
  dateText: string;
  medium: string;
  dimensionsText: string;
  /** Real size, used to hang the painting at true scale. */
  widthCm: number;
  heightCm: number;
  /** Museum that holds the work, e.g. "The Metropolitan Museum of Art, New York". */
  holder: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  /** Credit line shown on the detail page, e.g. "Image: The Met, CC0". */
  attribution: string;
  /** Page for the work at its source. */
  sourceUrl: string;
  /**
   * "About the work" text. Museum-written descriptions are often copyrighted
   * even when the image isn't (§5d), so this is either licensed text from the
   * source or our own short summary; `descriptionCredit` says which.
   */
  description?: string;
  descriptionCredit?: string;
}

export type FrameStyle =
  "ornate-gilt" | "simple-gilt" | "ebony" | "natural-oak" | "silver" | "float" | "none";

export interface FrameSettings {
  style: FrameStyle;
  width: "slim" | "standard" | "wide";
}

export interface Placement {
  id: string;
  artwork: Artwork;
  wall: WallId;
  /** Metres along the wall from its centre; positive is to the right as you face the wall. */
  x: number;
  /** Height of the painting's centre above the floor, in metres. */
  y: number;
  frame: FrameSettings;
  showLabel: boolean;
  /** The owner's "Why it's in my collection" note. */
  personalNote?: string;
}

/** Per-room look (§7). Only the options Phase 2 uses so far. */
export interface RoomTheme {
  wallColor: string;
  lowerWallColor: string;
  trimColor: string;
  ceilingColor: string;
  floor: "oak-planks";
  ceiling: "skylight";
  bench: "leather" | "none";
}

export interface Room {
  id: string;
  /** Used in the room's URL: /g/[username]/[slug]. */
  slug: string;
  number: number;
  name: string;
  intro: string;
  /** Interior size in metres: width is east–west (x), depth is north–south (z). */
  width: number;
  depth: number;
  height: number;
  theme: RoomTheme;
  placements: Placement[];
}

/** A user's museum: their rooms, in order (HANDOVER.md §4, `profiles` + `rooms`). */
export interface Collection {
  username: string;
  collectionName: string;
  rooms: Room[];
}
