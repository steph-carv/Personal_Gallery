import type { Room, WallId } from "./types";

/**
 * Where each room sits in the 3D world, and the doorways between them.
 *
 * Rooms are laid out as an enfilade, the classic museum plan: a straight
 * line of rooms running north, each joined to the next by a doorway in the
 * middle of the shared wall. Room 1 is centred on the origin; each following
 * room sits further north (−z), separated by a wall of WALL_THICKNESS.
 * Standing in Room 1 you can look through the doorways down the whole line.
 *
 * Only the order of rooms is stored (HANDOVER.md §4 `rooms.position`); the
 * layout is worked out here, so adding or reordering rooms just works.
 */

export const WALL_THICKNESS = 0.4;
export const DOOR_WIDTH = 1.8;
export const DOOR_HEIGHT = 3.0;
/** Width of the moulded architrave around each doorway. */
export const ARCHITRAVE_WIDTH = 0.16;

export interface Doorway {
  /** Which wall of this room it's in, and its centre along that wall (wall-local x). */
  wall: WallId;
  x: number;
  width: number;
  height: number;
  /** The room on the other side. */
  toRoomId: string;
  /** Shown on the plaque above the doorway. */
  toLabel: string;
}

export interface PlacedRoom extends Room {
  /** Position in the collection, from 0. */
  index: number;
  /** World position of the room's centre, at floor level. */
  origin: { x: number; z: number };
  doors: Doorway[];
}

export function roomLabel(room: Pick<Room, "number" | "name">) {
  return `Room ${room.number} · ${room.name}`;
}

export function layoutRooms(rooms: Room[]): PlacedRoom[] {
  const placed: PlacedRoom[] = [];
  let z = 0;
  rooms.forEach((room, index) => {
    if (index > 0) {
      const previous = rooms[index - 1];
      z -= previous.depth / 2 + WALL_THICKNESS + room.depth / 2;
    }
    const doors: Doorway[] = [];
    const before = rooms[index - 1];
    const after = rooms[index + 1];
    // On the south wall "right" is west, so a centred door is x = 0 either way.
    if (before) doors.push(door("south", before));
    if (after) doors.push(door("north", after));
    placed.push({ ...room, index, origin: { x: 0, z }, doors });
  });
  return placed;
}

function door(wall: WallId, to: Room): Doorway {
  return {
    wall,
    x: 0,
    width: DOOR_WIDTH,
    height: DOOR_HEIGHT,
    toRoomId: to.id,
    toLabel: roomLabel(to),
  };
}
