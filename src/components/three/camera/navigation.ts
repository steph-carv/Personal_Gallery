/**
 * Where you can stand, and how to get from A to B without walking through
 * the bench. Works on the floor plan in (x, z) metres. No three.js or React,
 * just geometry.
 */

/** How close you can get to a wall or the bench, in metres. */
export const BODY_RADIUS = 0.35;

export interface Obstacle {
  /** Axis-aligned box on the floor: centre and size in metres. */
  x: number;
  z: number;
  width: number;
  depth: number;
}

export interface FloorPlan {
  /** Interior size of the room, centred on the origin. */
  width: number;
  depth: number;
  obstacles: Obstacle[];
}

export type Point = { x: number; z: number };

function inflate(o: Obstacle, by: number) {
  return {
    minX: o.x - o.width / 2 - by,
    maxX: o.x + o.width / 2 + by,
    minZ: o.z - o.depth / 2 - by,
    maxZ: o.z + o.depth / 2 + by,
  };
}

function insideBox(p: Point, b: ReturnType<typeof inflate>) {
  return p.x > b.minX && p.x < b.maxX && p.z > b.minZ && p.z < b.maxZ;
}

/**
 * Move from `from` towards `to`, stopping at walls and obstacles. Each axis is
 * tried separately, so walking diagonally into a wall slides along it.
 */
export function resolveCollisions(from: Point, to: Point, plan: FloorPlan): Point {
  const maxX = plan.width / 2 - BODY_RADIUS;
  const maxZ = plan.depth / 2 - BODY_RADIUS;
  const boxes = plan.obstacles.map((o) => inflate(o, BODY_RADIUS));
  const blocked = (p: Point) => boxes.some((b) => insideBox(p, b));

  let x = Math.max(-maxX, Math.min(maxX, to.x));
  if (blocked({ x, z: from.z })) x = from.x;
  let z = Math.max(-maxZ, Math.min(maxZ, to.z));
  if (blocked({ x, z })) z = from.z;
  return { x, z };
}

/** The nearest spot to `p` where you can actually stand. */
export function clampToWalkable(p: Point, plan: FloorPlan): Point {
  const maxX = plan.width / 2 - BODY_RADIUS;
  const maxZ = plan.depth / 2 - BODY_RADIUS;
  let x = Math.max(-maxX, Math.min(maxX, p.x));
  let z = Math.max(-maxZ, Math.min(maxZ, p.z));
  for (const o of plan.obstacles) {
    const b = inflate(o, BODY_RADIUS);
    if (!insideBox({ x, z }, b)) continue;
    // Push out through the nearest side.
    const exits = [
      { d: x - b.minX, x: b.minX, z },
      { d: b.maxX - x, x: b.maxX, z },
      { d: z - b.minZ, x, z: b.minZ },
      { d: b.maxZ - z, x, z: b.maxZ },
    ].sort((a, c) => a.d - c.d);
    x = exits[0].x;
    z = exits[0].z;
  }
  return { x, z };
}

/** Does the segment a→b pass through the box? (Liang–Barsky clipping.) */
function segmentHitsBox(a: Point, b: Point, box: ReturnType<typeof inflate>) {
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

const length = (pts: Point[]) =>
  pts.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - pts[i].x, p.z - pts[i].z), 0);

/**
 * A short route from `from` to `to` that goes round obstacles: either a
 * straight line, or via one or two corners of an obstacle. Good enough for a
 * room with a bench in it; a real navmesh can come later if rooms get busier.
 */
export function planPath(from: Point, to: Point, plan: FloorPlan): Point[] {
  // A little extra clearance so the smoothed curve doesn't clip the corner.
  const boxes = plan.obstacles
    .map((o) => inflate(o, BODY_RADIUS + 0.2))
    .filter((b) => !insideBox(from, b) && !insideBox(to, b));
  const clear = (a: Point, b: Point) => boxes.every((box) => !segmentHitsBox(a, b, box));
  if (clear(from, to)) return [from, to];

  const maxX = plan.width / 2 - BODY_RADIUS;
  const maxZ = plan.depth / 2 - BODY_RADIUS;
  const inRoom = (p: Point) => Math.abs(p.x) <= maxX && Math.abs(p.z) <= maxZ;

  let best: Point[] | null = null;
  const consider = (route: Point[]) => {
    for (let i = 0; i < route.length - 1; i++) if (!clear(route[i], route[i + 1])) return;
    if (!best || length(route) < length(best)) best = route;
  };

  for (const box of boxes) {
    const corners: Point[] = [
      { x: box.minX, z: box.minZ },
      { x: box.maxX, z: box.minZ },
      { x: box.maxX, z: box.maxZ },
      { x: box.minX, z: box.maxZ },
    ].filter(inRoom);
    // Nudge corners outward slightly so the path doesn't graze the box edge.
    const out = corners.map((c) => ({
      x: c.x + Math.sign(c.x - (box.minX + box.maxX) / 2) * 0.01,
      z: c.z + Math.sign(c.z - (box.minZ + box.maxZ) / 2) * 0.01,
    }));
    for (const c of out) consider([from, c, to]);
    for (const c1 of out) for (const c2 of out) if (c1 !== c2) consider([from, c1, c2, to]);
  }
  return best ?? [from, to];
}
