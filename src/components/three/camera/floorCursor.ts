import type { Vector3 } from "three";

/**
 * Where the floor cursor ring should be. Written by the camera rig every
 * frame and read by <FloorCursor>. It's a plain mutable object rather than
 * React state because it changes every frame and nothing else needs to
 * re-render when it does.
 */
export const floorCursor: {
  /** Point on the floor under the pointer, if any. */
  hover: Vector3 | null;
  /** Where a click-to-walk is heading, until you arrive. */
  destination: Vector3 | null;
} = { hover: null, destination: null };
