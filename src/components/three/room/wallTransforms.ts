import type { Room, WallId } from "@/lib/gallery/types";

/**
 * World axes: x runs west → east, z runs north → south, y is up. The floor is
 * at y = 0 and the room is centred on the origin.
 *
 * Each wall has its own local frame, used for hanging paintings:
 * - origin at the middle of the wall, at floor level, on the wall surface;
 * - local x runs along the wall, to the right as you stand facing it;
 * - local z points out of the wall into the room.
 * So a painting at local (x, y, 0) hangs flat on the wall.
 */
export interface WallTransform {
  position: [number, number, number];
  /** Rotation about the vertical axis, in radians. */
  rotationY: number;
  /** Wall length in metres. */
  length: number;
}

export function wallTransform(room: Pick<Room, "width" | "depth">, wall: WallId): WallTransform {
  const halfW = room.width / 2;
  const halfD = room.depth / 2;
  switch (wall) {
    case "north":
      return { position: [0, 0, -halfD], rotationY: 0, length: room.width };
    case "south":
      return { position: [0, 0, halfD], rotationY: Math.PI, length: room.width };
    case "east":
      return { position: [halfW, 0, 0], rotationY: -Math.PI / 2, length: room.depth };
    case "west":
      return { position: [-halfW, 0, 0], rotationY: Math.PI / 2, length: room.depth };
  }
}

export const WALLS: WallId[] = ["north", "east", "south", "west"];

/** Height of the dado rail. Paintings hang above it. */
export const DADO_HEIGHT = 0.9;
