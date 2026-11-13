import { MathUtils, Vector3 } from "three";
import type { Placement, Room } from "@/lib/gallery/types";
import { paintingSize } from "../art/paintingSize";
import { LABEL_GAP, LABEL_SIZE } from "../art/WallLabel";
import { frameWidth } from "../geometry/profiles";
import { wallTransform } from "../room/wallTransforms";
import { BODY_RADIUS, clampToWalkable, type FloorPlan } from "./navigation";

/** Eye height in metres. */
export const EYE_HEIGHT = 1.62;

/**
 * Where the camera is and which way it looks. Yaw is rotation about the
 * vertical axis (0 = looking north, along −z; positive turns left), pitch is
 * up/down (positive looks up). Applied in that order ("YXZ"), so the horizon
 * never tilts.
 */
export interface CameraPose {
  position: Vector3;
  yaw: number;
  pitch: number;
}

interface Lens {
  /** Vertical field of view in degrees, and width / height. */
  fov: number;
  aspect: number;
}

/**
 * A point in front of a placement, in world space. `localZ` is the distance
 * out from the wall, `localY` the height (default: the painting's centre) and
 * `offsetX` a shift along the wall to the right (see wallTransforms.ts).
 */
export function wallToWorld(
  room: Room,
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
    t.position[0] + x * cos + localZ * sin,
    localY ?? placement.y,
    t.position[2] - x * sin + localZ * cos,
  );
}

/** The painting's outer size including its frame, in metres. */
function framedSize(placement: Placement) {
  const { width, height } = paintingSize(placement.artwork);
  const fw =
    placement.frame.style === "none" ? 0 : frameWidth(placement.frame, Math.max(width, height));
  return { width: width + fw * 2, height: height + fw * 2 };
}

/** Distance at which a `w` × `h` rectangle just fills the view. */
function fitDistance(w: number, h: number, lens: Lens) {
  const halfV = MathUtils.degToRad(lens.fov) / 2;
  const halfH = Math.atan(Math.tan(halfV) * lens.aspect);
  return Math.max(h / 2 / Math.tan(halfV), w / 2 / Math.tan(halfH));
}

/** Facing the wall a placement hangs on, looking at the painting's centre from `distance` away at `eyeY`. */
function facing(room: Room, placement: Placement, distance: number, eyeY: number) {
  const yaw = wallTransform(room, placement.wall).rotationY;
  const pitch = Math.atan2(placement.y - eyeY, distance);
  return { yaw, pitch };
}

/**
 * Standing in front of a painting on the tour: far enough back to see the
 * whole frame and its label, at eye height, nudged off the bench if needed.
 */
export function tourPose(
  room: Room,
  placement: Placement,
  plan: FloorPlan,
  lens: Lens,
): CameraPose {
  const framed = framedSize(placement);
  // Keep the painting centred but leave room for the label on its right.
  const width = 2 * (framed.width / 2 + LABEL_GAP + LABEL_SIZE.width);
  const wallToWall =
    placement.wall === "north" || placement.wall === "south" ? room.depth : room.width;
  const distance = MathUtils.clamp(
    fitDistance(width, framed.height, lens) * 1.15,
    1.5,
    wallToWall - BODY_RADIUS * 2,
  );
  const wanted = wallToWorld(room, placement, distance, EYE_HEIGHT);
  const spot = clampToWalkable({ x: wanted.x, z: wanted.z }, plan);
  // If the spot was nudged (e.g. off the bench), aim from where we really are.
  const onWall = wallToWorld(room, placement, 0);
  const actualDistance = Math.hypot(spot.x - onWall.x, spot.z - onWall.z);
  return {
    position: new Vector3(spot.x, EYE_HEIGHT, spot.z),
    ...facing(room, placement, actualDistance, EYE_HEIGHT),
  };
}

/**
 * "Stepping closer": square on to the painting at its own height, close
 * enough that the frame nearly fills the view. The 2D detail overlay then
 * fades in on top.
 *
 * On wide screens the overlay puts the painting in the left ~60% and the
 * catalogue card on the right. With `sideBySide`, the camera steps to the
 * right so the 3D painting lands where the 2D one appears, and the overlay
 * fades in over it instead of showing two paintings at once.
 */
export function detailPose(
  room: Room,
  placement: Placement,
  lens: Lens,
  sideBySide = false,
): CameraPose {
  const framed = framedSize(placement);
  const eyeY = MathUtils.clamp(placement.y, 1.1, room.height - 0.8);
  if (!sideBySide) {
    const distance = Math.max(0.55, fitDistance(framed.width, framed.height, lens) * 1.1);
    return {
      position: wallToWorld(room, placement, distance, eyeY),
      ...facing(room, placement, distance, eyeY),
    };
  }
  // Fit the frame into the left 55% of the screen and ~68% of its height,
  // about the size the overlay shows the 2D painting at.
  const distance = Math.max(0.55, fitDistance(framed.width / 0.55, framed.height / 0.68, lens));
  // Shifting the camera right by s moves the painting left on screen by
  // s / (distance · tan(hfov/2)) in screen units (−1 … 1). Aim for −0.4,
  // the middle of the left 60%.
  const halfH = Math.atan(Math.tan(MathUtils.degToRad(lens.fov) / 2) * lens.aspect);
  const shift = 0.4 * distance * Math.tan(halfH);
  return {
    position: wallToWorld(room, placement, distance, eyeY, shift),
    ...facing(room, placement, distance, eyeY),
  };
}

/** Yaw that looks along the direction from `a` to `b` on the floor. */
export function headingYaw(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.atan2(-(b.x - a.x), -(b.z - a.z));
}
