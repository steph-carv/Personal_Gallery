import { BufferGeometry, Float32BufferAttribute } from "three";

/**
 * Sweep a moulding cross-section ("profile") along a 2D path.
 *
 * This one function builds every moulding in the gallery:
 * - picture frames: the path is the painting's rectangle, the profile is the
 *   frame's cross-section, and the result fits any painting size;
 * - room trims (cornice, dado rail, skirting): the path is the room's floor
 *   plan, and the geometry is then rotated to stand upright.
 *
 * Coordinates
 * - The path lies in the XY plane and must run anticlockwise.
 * - Each profile point is { d, z }: `d` is the offset from the path (positive
 *   is outward, away from the shape's middle; negative is inward) and `z` is
 *   height out of the XY plane.
 * - Walk the profile so the solid material is on your right-hand side. For a
 *   picture frame that means inner edge → over the face → outer edge; for a
 *   room trim (d ≤ 0) it means bottom → top.
 *
 * Corners are mitred, like a real frame cut at 45°. Each straight side gets its
 * own vertices so corners stay crisp. Along the profile, points marked
 * `smooth` share a normal with their neighbours (for curves); others make a
 * hard edge.
 */

export interface ProfilePoint {
  d: number;
  z: number;
  /** Blend normals at this point so curved parts render smooth. */
  smooth?: boolean;
}

export type Vec2 = readonly [number, number];

export interface SweepOptions {
  /** Join the last path point back to the first (frames, whole-room trims). */
  closed?: boolean;
  /**
   * Optional per-point brightness (0–1) baked into vertex colours. Frames use
   * it to darken recesses: a cheap stand-in for ambient occlusion.
   */
  shade?: (point: ProfilePoint) => number;
}

export function sweepProfile(
  path: readonly Vec2[],
  profile: readonly ProfilePoint[],
  { closed = false, shade }: SweepOptions = {},
): BufferGeometry {
  const pointCount = path.length;
  const edgeCount = closed ? pointCount : pointCount - 1;

  // Outward normal of each path edge. For an anticlockwise path, outward is
  // the edge direction turned 90° clockwise.
  const edgeNormals: Vec2[] = [];
  const edgeLengths: number[] = [];
  for (let e = 0; e < edgeCount; e++) {
    const [ax, ay] = path[e];
    const [bx, by] = path[(e + 1) % pointCount];
    const length = Math.hypot(bx - ax, by - ay);
    edgeLengths.push(length);
    edgeNormals.push([(by - ay) / length, -(bx - ax) / length]);
  }

  // Mitre vector at each path point: moving a point by `mitre * d` offsets both
  // neighbouring edges by exactly `d`, which is what makes the 45° corner.
  const mitres: Vec2[] = path.map((_, i) => {
    const hasPrev = closed || i > 0;
    const hasNext = closed || i < pointCount - 1;
    const prev = hasPrev ? edgeNormals[(i - 1 + edgeCount) % edgeCount] : null;
    const next = hasNext ? edgeNormals[i % edgeCount] : null;
    if (!prev) return next!;
    if (!next) return prev;
    const scale = 1 / (1 + prev[0] * next[0] + prev[1] * next[1]);
    return [(prev[0] + next[0]) * scale, (prev[1] + next[1]) * scale];
  });

  // Normals of each profile segment, in (d, z) space. With the material on
  // the right, the surface faces left of the walking direction.
  const segmentNormals: Vec2[] = [];
  const profileDistance: number[] = [0];
  for (let i = 0; i < profile.length - 1; i++) {
    const td = profile[i + 1].d - profile[i].d;
    const tz = profile[i + 1].z - profile[i].z;
    const length = Math.hypot(td, tz) || 1;
    segmentNormals.push([-tz / length, td / length]);
    profileDistance.push(profileDistance[i] + Math.hypot(td, tz));
  }

  /** Normal at profile point `i`, as used by segment `seg`. */
  const profileNormal = (i: number, seg: number): Vec2 => {
    const point = profile[i];
    const neighbour = i === seg ? seg - 1 : seg + 1;
    if (!point.smooth || neighbour < 0 || neighbour >= segmentNormals.length) {
      return segmentNormals[seg];
    }
    const a = segmentNormals[seg];
    const b = segmentNormals[neighbour];
    const length = Math.hypot(a[0] + b[0], a[1] + b[1]) || 1;
    return [(a[0] + b[0]) / length, (a[1] + b[1]) / length];
  };

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];

  let pathDistance = 0;
  for (let e = 0; e < edgeCount; e++) {
    const a = path[e];
    const b = path[(e + 1) % pointCount];
    const ma = mitres[e];
    const mb = mitres[(e + 1) % pointCount];
    const [ox, oy] = edgeNormals[e];

    for (let s = 0; s < profile.length - 1; s++) {
      const p0 = profile[s];
      const p1 = profile[s + 1];
      if (p0.d === p1.d && p0.z === p1.z) continue;

      // Quad corners: A/B on profile point s (path start/end), D/C on s + 1.
      const A = [a[0] + ma[0] * p0.d, a[1] + ma[1] * p0.d, p0.z];
      const B = [b[0] + mb[0] * p0.d, b[1] + mb[1] * p0.d, p0.z];
      const C = [b[0] + mb[0] * p1.d, b[1] + mb[1] * p1.d, p1.z];
      const D = [a[0] + ma[0] * p1.d, a[1] + ma[1] * p1.d, p1.z];

      // Turn the 2D profile normal into 3D for this side of the path.
      const n0 = profileNormal(s, s);
      const n1 = profileNormal(s + 1, s);
      const N0 = [ox * n0[0], oy * n0[0], n0[1]];
      const N1 = [ox * n1[0], oy * n1[0], n1[1]];

      const u0 = pathDistance;
      const u1 = pathDistance + edgeLengths[e];
      const v0 = profileDistance[s];
      const v1 = profileDistance[s + 1];
      const c0 = shade ? shade(p0) : 1;
      const c1 = shade ? shade(p1) : 1;

      const vertex = (P: number[], N: number[], u: number, v: number, c: number) => {
        positions.push(P[0], P[1], P[2]);
        normals.push(N[0], N[1], N[2]);
        uvs.push(u, v);
        colors.push(c, c, c);
      };

      // Pick the triangle winding so the front face points along the normal
      // (three.js culls back faces).
      const faceNormal = cross(sub(B, A), sub(C, A));
      const flip = dot(faceNormal, [N0[0] + N1[0], N0[1] + N1[1], N0[2] + N1[2]]) < 0;

      const quad = [
        [A, N0, u0, v0, c0],
        [B, N0, u1, v0, c0],
        [C, N1, u1, v1, c1],
        [D, N1, u0, v1, c1],
      ] as const;
      const order = flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
      for (const k of order) {
        const [P, N, u, v, c] = quad[k];
        vertex(P as number[], N as number[], u, v, c);
      }
    }
    pathDistance += edgeLengths[e];
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  if (shade) geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

/** Anticlockwise rectangle centred on the origin, ready for `sweepProfile`. */
export function rectanglePath(width: number, height: number): Vec2[] {
  const w = width / 2;
  const h = height / 2;
  return [
    [-w, -h],
    [w, -h],
    [w, h],
    [-w, h],
  ];
}

/** Points along a circular arc in (d, z) space, for rounded mouldings. */
export function arc(
  centreD: number,
  centreZ: number,
  radius: number,
  fromDeg: number,
  toDeg: number,
  steps = 6,
): ProfilePoint[] {
  const points: ProfilePoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = ((fromDeg + ((toDeg - fromDeg) * i) / steps) * Math.PI) / 180;
    points.push({
      d: centreD + radius * Math.cos(angle),
      z: centreZ + radius * Math.sin(angle),
      // Interior points are smooth; the ends meet neighbouring parts crisply.
      smooth: i > 0 && i < steps,
    });
  }
  return points;
}

/** Points along a cubic Bézier curve in (d, z) space, for coves and ogees. */
export function curve(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, steps = 6): ProfilePoint[] {
  const points: ProfilePoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const m = 1 - t;
    const a = m * m * m;
    const b = 3 * m * m * t;
    const c = 3 * m * t * t;
    const d = t * t * t;
    points.push({
      d: a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
      z: a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
      smooth: i > 0 && i < steps,
    });
  }
  return points;
}

/** Join profile pieces, dropping a point where one piece ends where the next starts. */
export function joinProfile(...pieces: (ProfilePoint | ProfilePoint[])[]): ProfilePoint[] {
  const out: ProfilePoint[] = [];
  for (const piece of pieces.flat()) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.d - piece.d) < 1e-6 && Math.abs(last.z - piece.z) < 1e-6) continue;
    out.push(piece);
  }
  return out;
}

function sub(a: number[], b: number[]) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function cross(a: number[], b: number[]) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a: number[], b: number[]) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
