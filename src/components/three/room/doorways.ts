import { BufferGeometry, Float32BufferAttribute } from "three";
import { ARCHITRAVE_WIDTH, type Doorway, type PlacedRoom } from "@/lib/gallery/layout";
import type { WallId } from "@/lib/gallery/types";
import { rectanglePath, type Vec2 } from "../geometry/sweepProfile";

/**
 * Geometry helpers for walls that have doorways in them.
 *
 * Coordinates: wall rectangles are in the wall's local frame (x along the
 * wall, y up; see wallTransforms.ts). Trim paths are in the room's floor plan
 * as used by sweepProfile: plan (x, y) becomes world (x, −y) once the trim is
 * rotated upright, relative to the room's centre.
 */

export interface WallRect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export function doorsOn(room: PlacedRoom, wall: WallId): Doorway[] {
  return room.doors.filter((d) => d.wall === wall);
}

/**
 * The solid parts of a horizontal band of wall (from y0 to y1), with door
 * openings cut out: pieces either side of each door, plus a lintel above it
 * where the band is taller than the door.
 */
export function wallRects(length: number, y0: number, y1: number, doors: Doorway[]): WallRect[] {
  const rects: WallRect[] = [];
  const sorted = [...doors].sort((a, b) => a.x - b.x);
  let x = -length / 2;
  for (const door of sorted) {
    const left = door.x - door.width / 2;
    const right = door.x + door.width / 2;
    if (left > x) rects.push({ x0: x, x1: left, y0, y1 });
    if (y1 > door.height) rects.push({ x0: left, x1: right, y0: Math.max(y0, door.height), y1 });
    x = right;
  }
  if (x < length / 2) rects.push({ x0: x, x1: length / 2, y0, y1 });
  return rects;
}

/**
 * A flat rectangle facing out of the wall (+z), with UVs in metres scaled by
 * `uvScale`. Because UVs come from the position on the wall, a texture runs
 * continuously across separate pieces, with no seams around a doorway.
 */
export function wallRectGeometry(r: WallRect, uvScale: number) {
  const geometry = new BufferGeometry();
  const positions = [r.x0, r.y0, 0, r.x1, r.y0, 0, r.x1, r.y1, 0, r.x0, r.y1, 0];
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute(
    "normal",
    new Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3),
  );
  geometry.setAttribute(
    "uv",
    new Float32BufferAttribute(
      [r.x0, r.y0, r.x1, r.y0, r.x1, r.y1, r.x0, r.y1].map((v) => v * uvScale),
      2,
    ),
  );
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Paths for low trims (dado rail, skirting) round the room, broken where
 * they meet a doorway's architrave. With no doorways it's one closed loop.
 */
export function trimPaths(room: PlacedRoom): { path: Vec2[]; closed: boolean }[] {
  const w = room.width / 2;
  const h = room.depth / 2;
  if (room.doors.length === 0)
    return [{ path: rectanglePath(room.width, room.depth), closed: true }];

  // The four edges of the plan, anticlockwise, and how to turn a door's
  // wall-local x into a 0–1 position along each edge.
  const edges: { wall: WallId; from: Vec2; to: Vec2; t: (x: number) => number }[] = [
    { wall: "south", from: [-w, -h], to: [w, -h], t: (x) => (-x + w) / (2 * w) },
    { wall: "east", from: [w, -h], to: [w, h], t: (x) => (-x + h) / (2 * h) },
    { wall: "north", from: [w, h], to: [-w, h], t: (x) => (w - x) / (2 * w) },
    { wall: "west", from: [-w, h], to: [-w, -h], t: (x) => (h - x) / (2 * h) },
  ];

  // Solid stretches of each edge, as [start, end] fractions.
  type Piece = { from: Vec2; to: Vec2; atStartCorner: boolean; atEndCorner: boolean };
  const pieces: Piece[] = [];
  for (const edge of edges) {
    const length = edge.wall === "north" || edge.wall === "south" ? room.width : room.depth;
    const gaps = doorsOn(room, edge.wall)
      .map((d) => {
        const half = (d.width / 2 + ARCHITRAVE_WIDTH) / length;
        const centre = edge.t(d.x);
        return [centre - half, centre + half] as const;
      })
      .sort((a, b) => a[0] - b[0]);
    let start = 0;
    const lerp = (t: number): Vec2 => [
      edge.from[0] + (edge.to[0] - edge.from[0]) * t,
      edge.from[1] + (edge.to[1] - edge.from[1]) * t,
    ];
    for (const [a, b] of [...gaps, [1, 1] as const]) {
      if (a > start) {
        pieces.push({
          from: lerp(start),
          to: lerp(a),
          atStartCorner: start === 0,
          atEndCorner: a === 1,
        });
      }
      start = Math.max(start, b);
    }
  }

  // Join pieces that meet at a corner into longer runs.
  const runs: Vec2[][] = [];
  for (const piece of pieces) {
    const last = runs[runs.length - 1];
    const previous = pieces[pieces.indexOf(piece) - 1];
    if (last && piece.atStartCorner && previous?.atEndCorner) last.push(piece.to);
    else runs.push([piece.from, piece.to]);
  }
  // The last run may continue round the corner into the first.
  const first = pieces[0];
  const lastPiece = pieces[pieces.length - 1];
  if (runs.length > 1 && first.atStartCorner && lastPiece.atEndCorner) {
    const tail = runs.pop()!;
    runs[0] = [...tail, ...runs[0].slice(1)];
  }
  return runs.map((path) => ({ path, closed: false }));
}
