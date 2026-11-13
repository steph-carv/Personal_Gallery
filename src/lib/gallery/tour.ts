import type { Placement, WallId } from "./types";

/**
 * The order the "next / previous painting" tour visits works in: a loop
 * around the room, starting on the left wall as you walk in from the south.
 *
 * Within a wall, works go left to right as you face it. Walls go west →
 * north → east → south, so the tour is one continuous clockwise loop.
 */
const WALL_ORDER: WallId[] = ["west", "north", "east", "south"];

export function tourOrder(placements: Placement[]): Placement[] {
  return [...placements].sort(
    (a, b) => WALL_ORDER.indexOf(a.wall) - WALL_ORDER.indexOf(b.wall) || a.x - b.x,
  );
}
