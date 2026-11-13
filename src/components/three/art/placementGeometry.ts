import { Vector3 } from "three";
import type { PlacedRoom } from "@/lib/gallery/layout";
import type { Placement } from "@/lib/gallery/types";
import { frameWidth } from "../geometry/profiles";
import { wallTransform } from "../room/wallTransforms";
import { paintingSize } from "./paintingSize";

/**
 * A point in front of a placement, in world space. `localZ` is the distance
 * out from the wall, `localY` the height (default: the painting's centre) and
 * `offsetX` a shift along the wall to the right (see wallTransforms.ts).
 */
export function wallToWorld(
  room: PlacedRoom,
  placement: Placement,
  localZ: number,
  localY?: number,
  offsetX = 0,
) {
  const t = wallTransform(room, placement.wall);
  const cos = Math.cos(t.rotationY);
  const sin = Math.sin(t.rotationY);
  const x = placement.x + offsetX;
  return new Vector3(
    room.origin.x + t.position[0] + x * cos + localZ * sin,
    localY ?? placement.y,
    room.origin.z + t.position[2] - x * sin + localZ * cos,
  );
}

/** The painting's size and frame width, and its outer size including the frame, in metres. */
export function framedSize(placement: Placement) {
  const { width, height } = paintingSize(placement.artwork);
  const fw =
    placement.frame.style === "none" ? 0 : frameWidth(placement.frame, Math.max(width, height));
  return {
    width: width + fw * 2,
    height: height + fw * 2,
    painting: { width, height },
    frameWidth: fw,
  };
}
