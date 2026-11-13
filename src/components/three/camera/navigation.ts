/**
 * Where you can stand, and how to get from A to B: through doorways from
 * room to room, and round the benches. Works on the floor plan in world
 * (x, z) metres. No three.js or React, just geometry.
 */

import { WALL_THICKNESS, type PlacedRoom } from "@/lib/gallery/layout";

/** How close you can get to a wall or a bench, in metres. */
export const BODY_RADIUS = 0.35;

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Obstacle {
  /** Axis-aligned box on the floor: centre and size in metres. */
  x: number;
  z: number;
  width: number;
  depth: number;
}

export interface FloorDoor {
  rooms: [string, string];
  /** Centre of the opening, in the middle of the wall's thickness. */
  x: number;
  z: number;
  width: number;
  /** The direction you walk through it. */
  axis: "x" | "z";
}

export interface FloorPlan {
  rooms: { id: string; bounds: Rect }[];
  doors: FloorDoor[];
  obstacles: Obstacle[];
}

export type Point = { x: number; z: number };

/** Build the walkable plan from the laid-out rooms and their obstacles. */
export function buildFloorPlan(
  rooms: PlacedRoom[],
  obstaclesFor: (room: PlacedRoom) => Obstacle[],
): FloorPlan {
  const doors = new Map<string, FloorDoor>();
  for (const room of rooms) {
    const { x: ox, z: oz } = room.origin;
    for (const door of room.doors) {
      const key = [room.id, door.toRoomId].sort().join("|");
      if (doors.has(key)) continue;
      const half = WALL_THICKNESS / 2;
      const at = {
        north: { x: ox + door.x, z: oz - room.depth / 2 - half, axis: "z" },
        south: { x: ox - door.x, z: oz + room.depth / 2 + half, axis: "z" },
        east: { x: ox + room.width / 2 + half, z: oz + door.x, axis: "x" },
        west: { x: ox - room.width / 2 - half, z: oz - door.x, axis: "x" },
      }[door.wall] as Omit<FloorDoor, "rooms" | "width">;
      doors.set(key, { ...at, width: door.width, rooms: [room.id, door.toRoomId] });
    }
  }
  return {
    rooms: rooms.map((r) => ({
      id: r.id,
      bounds: {
        minX: r.origin.x - r.width / 2,
        maxX: r.origin.x + r.width / 2,
        minZ: r.origin.z - r.depth / 2,
        maxZ: r.origin.z + r.depth / 2,
      },
    })),
    doors: [...doors.values()],
    obstacles: rooms.flatMap(obstaclesFor),
  };
}

function inflate(o: Obstacle, by: number): Rect {
  return {
    minX: o.x - o.width / 2 - by,
    maxX: o.x + o.width / 2 + by,
    minZ: o.z - o.depth / 2 - by,
    maxZ: o.z + o.depth / 2 + by,
  };
}

const inside = (p: Point, r: Rect) => p.x > r.minX && p.x < r.maxX && p.z > r.minZ && p.z < r.maxZ;
const shrink = (r: Rect, by: number): Rect => ({
  minX: r.minX + by,
  maxX: r.maxX - by,
  minZ: r.minZ + by,
  maxZ: r.maxZ - by,
});

/** The strip of floor through a doorway, reaching a little into both rooms. */
function doorCorridor(d: FloorDoor): Rect {
  const across = d.width / 2 - BODY_RADIUS;
  const along = WALL_THICKNESS / 2 + BODY_RADIUS + 0.05;
  return d.axis === "z"
    ? { minX: d.x - across, maxX: d.x + across, minZ: d.z - along, maxZ: d.z + along }
    : { minX: d.x - along, maxX: d.x + along, minZ: d.z - across, maxZ: d.z + across };
}

/** Can you stand here? Inside a room or a doorway, and clear of obstacles. */
export function isWalkable(p: Point, plan: FloorPlan): boolean {
  const onFloor =
    plan.rooms.some((r) => inside(p, shrink(r.bounds, BODY_RADIUS))) ||
    plan.doors.some((d) => inside(p, doorCorridor(d)));
  return onFloor && !plan.obstacles.some((o) => inside(p, inflate(o, BODY_RADIUS)));
}

/** Which room you're in (in a doorway: the nearer room). */
export function roomAt(p: Point, plan: FloorPlan): string | null {
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const { id, bounds } of plan.rooms) {
    const dx = Math.max(bounds.minX - p.x, 0, p.x - bounds.maxX);
    const dz = Math.max(bounds.minZ - p.z, 0, p.z - bounds.maxZ);
    const distance = Math.hypot(dx, dz);
    if (distance < bestDistance) {
      best = id;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Move from `from` towards `to`, stopping at walls and obstacles. Each axis is
 * tried separately, so walking diagonally into a wall slides along it.
 */
export function resolveCollisions(from: Point, to: Point, plan: FloorPlan): Point {
  let x = to.x;
  if (!isWalkable({ x, z: from.z }, plan)) x = from.x;
  let z = to.z;
  if (!isWalkable({ x, z }, plan)) z = from.z;
  return { x, z };
}

/** The nearest spot to `p` where you can actually stand. */
export function clampToWalkable(p: Point, plan: FloorPlan): Point {
  if (isWalkable(p, plan)) return p;
  // Clamp into each room (shrunk by your radius) and take the nearest.
  let best = p;
  let bestDistance = Infinity;
  for (const { bounds } of plan.rooms) {
    const r = shrink(bounds, BODY_RADIUS);
    const c = {
      x: Math.min(r.maxX, Math.max(r.minX, p.x)),
      z: Math.min(r.maxZ, Math.max(r.minZ, p.z)),
    };
    const distance = Math.hypot(c.x - p.x, c.z - p.z);
    if (distance < bestDistance) {
      best = c;
      bestDistance = distance;
    }
  }
  // Then step out of any obstacle through its nearest side.
  for (const o of plan.obstacles) {
    const b = inflate(o, BODY_RADIUS);
    if (!inside(best, b)) continue;
    const exits = [
      { d: best.x - b.minX, x: b.minX, z: best.z },
      { d: b.maxX - best.x, x: b.maxX, z: best.z },
      { d: best.z - b.minZ, x: best.x, z: b.minZ },
      { d: b.maxZ - best.z, x: best.x, z: b.maxZ },
    ].sort((a, c) => a.d - c.d);
    best = { x: exits[0].x, z: exits[0].z };
  }
  return best;
}

/** Does the segment a→b pass through the box? (Liang–Barsky clipping.) */
function segmentHitsBox(a: Point, b: Point, box: Rect) {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const checks: [number, number][] = [
    [-dx, a.x - box.minX],
    [dx, box.maxX - a.x],
    [-dz, a.z - box.minZ],
    [dz, box.maxZ - a.z],
  ];
  for (const [p, q] of checks) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
    if (t0 > t1) return false;
  }
  return true;
}

const pathLength = (pts: Point[]) =>
  pts.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - pts[i].x, p.z - pts[i].z), 0);

/** A route within one room: straight, or via one or two corners of an obstacle. */
function routeInRoom(from: Point, to: Point, plan: FloorPlan): Point[] {
  // A little extra clearance so the smoothed curve doesn't clip the corner.
  const boxes = plan.obstacles
    .map((o) => inflate(o, BODY_RADIUS + 0.2))
    .filter((b) => !inside(from, b) && !inside(to, b));
  const clear = (a: Point, b: Point) => boxes.every((box) => !segmentHitsBox(a, b, box));
  if (clear(from, to)) return [from, to];

  let best: Point[] | null = null;
  const consider = (route: Point[]) => {
    for (let i = 0; i < route.length - 1; i++) if (!clear(route[i], route[i + 1])) return;
    if (!best || pathLength(route) < pathLength(best)) best = route;
  };
  for (const box of boxes) {
    const cx = (box.minX + box.maxX) / 2;
    const cz = (box.minZ + box.maxZ) / 2;
    const corners: Point[] = [
      { x: box.minX, z: box.minZ },
      { x: box.maxX, z: box.minZ },
      { x: box.maxX, z: box.maxZ },
      { x: box.minX, z: box.maxZ },
    ]
      // Nudge outward slightly so the path doesn't graze the box edge.
      .map((c) => ({ x: c.x + Math.sign(c.x - cx) * 0.01, z: c.z + Math.sign(c.z - cz) * 0.01 }))
      .filter((c) => isWalkable(c, plan));
    for (const c of corners) consider([from, c, to]);
    for (const c1 of corners) for (const c2 of corners) if (c1 !== c2) consider([from, c1, c2, to]);
  }
  return best ?? [from, to];
}

/** Rooms to pass through, as the doors between them (breadth-first search). */
function doorsBetween(fromRoom: string, toRoom: string, plan: FloorPlan): FloorDoor[] {
  const previous = new Map<string, { room: string; door: FloorDoor } | null>([[fromRoom, null]]);
  const queue = [fromRoom];
  while (queue.length) {
    const room = queue.shift()!;
    if (room === toRoom) break;
    for (const door of plan.doors) {
      const next =
        door.rooms[0] === room ? door.rooms[1] : door.rooms[1] === room ? door.rooms[0] : null;
      if (next && !previous.has(next)) {
        previous.set(next, { room, door });
        queue.push(next);
      }
    }
  }
  const doors: FloorDoor[] = [];
  for (let room = toRoom; previous.get(room); room = previous.get(room)!.room) {
    doors.unshift(previous.get(room)!.door);
  }
  return doors;
}

/**
 * A walkable route from `from` to `to`: through the doorways between their
 * rooms (straight through each one, square on), and round any obstacle on
 * the way.
 */
export function planPath(from: Point, to: Point, plan: FloorPlan): Point[] {
  const startRoom = roomAt(from, plan);
  const endRoom = roomAt(to, plan);
  if (!startRoom || !endRoom || startRoom === endRoom) return routeInRoom(from, to, plan);

  const waypoints: Point[] = [from];
  let room = startRoom;
  for (const door of doorsBetween(startRoom, endRoom, plan)) {
    const centre = plan.rooms.find((r) => r.id === room)!.bounds;
    const towardsRoom =
      door.axis === "z"
        ? Math.sign((centre.minZ + centre.maxZ) / 2 - door.z)
        : Math.sign((centre.minX + centre.maxX) / 2 - door.x);
    const step = WALL_THICKNESS / 2 + 0.9;
    // Line up in front of the doorway, then come out the other side.
    waypoints.push(
      door.axis === "z"
        ? { x: door.x, z: door.z + towardsRoom * step }
        : { x: door.x + towardsRoom * step, z: door.z },
      door.axis === "z"
        ? { x: door.x, z: door.z - towardsRoom * step }
        : { x: door.x - towardsRoom * step, z: door.z },
    );
    room = door.rooms[0] === room ? door.rooms[1] : door.rooms[0];
  }
  waypoints.push(to);

  const route: Point[] = [from];
  for (let i = 0; i < waypoints.length - 1; i++) {
    route.push(...routeInRoom(waypoints[i], waypoints[i + 1], plan).slice(1));
  }
  return route;
}
