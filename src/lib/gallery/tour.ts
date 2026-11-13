import type { Placement, Room, WallId } from "./types";

/**
 * The order the "next / previous painting" tour visits works in: a loop
 * around each room, then on through the doorway into the next room.
 *
 * Within a room, walls go west → north → east → south (one continuous
 * clockwise loop, starting on your left as you walk in from the south), and
 * works on a wall go left to right as you face it.
 */
const WALL_ORDER: WallId[] = ["west", "north", "east", "south"];

export function tourOrder(placements: Placement[]): Placement[] {
  return [...placements].sort(
    (a, b) => WALL_ORDER.indexOf(a.wall) - WALL_ORDER.indexOf(b.wall) || a.x - b.x,
  );
}

/** The whole collection's tour, room after room. */
export function galleryTour(rooms: Room[]): Placement[] {
  return rooms.flatMap((room) => tourOrder(room.placements));
}
