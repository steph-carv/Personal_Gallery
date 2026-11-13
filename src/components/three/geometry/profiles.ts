import type { FrameSettings, FrameStyle } from "@/lib/gallery/types";
import { arc, curve, joinProfile, type ProfilePoint } from "./sweepProfile";

/**
 * Moulding cross-sections.
 *
 * Frame profiles are drawn at unit width: d runs from 0 (the inner edge,
 * against the painting) to 1 (the outer edge), and z is height off the wall
 * in the same units. `frameProfile()` scales them to a real width in metres.
 * Each starts at the rebate (where the canvas sits) and ends on the wall, with
 * the material on the right-hand side as you walk it (see sweepProfile.ts).
 */

/** Depth of the rebate the canvas sits in, as a fraction of frame width. */
export const REBATE_Z = 0.08;

const ornateGilt: ProfilePoint[] = joinProfile(
  { d: 0, z: REBATE_Z },
  { d: 0, z: 0.15 }, // sight edge
  arc(0.045, 0.15, 0.045, 180, 0, 6), // inner bead
  { d: 0.1, z: 0.13 },
  curve([0.1, 0.13], [0.24, 0.12], [0.26, 0.24], [0.33, 0.33], 7), // hollow cove
  curve([0.33, 0.33], [0.4, 0.42], [0.46, 0.5], [0.54, 0.52], 6), // rising ogee
  arc(0.64, 0.5, 0.1, 168, 12, 10), // main torus: the big rounded top that catches light
  curve([0.738, 0.521], [0.8, 0.46], [0.84, 0.4], [0.88, 0.38], 5),
  arc(0.925, 0.37, 0.045, 160, 0, 6), // outer bead
  { d: 1, z: 0.33 },
  { d: 1, z: 0 },
);

const simpleGilt: ProfilePoint[] = joinProfile(
  { d: 0, z: REBATE_Z },
  { d: 0, z: 0.16 },
  arc(0.04, 0.16, 0.04, 180, 0, 5),
  curve([0.08, 0.16], [0.3, 0.18], [0.5, 0.3], [0.62, 0.36], 6), // gentle slope
  arc(0.75, 0.33, 0.13, 155, 20, 9), // rounded top
  { d: 0.97, z: 0.3 },
  { d: 1, z: 0.27 },
  { d: 1, z: 0 },
);

/** Flat, squared-off profile with small bevels: ebony, oak and silver. */
const flat: ProfilePoint[] = joinProfile(
  { d: 0, z: REBATE_Z },
  { d: 0, z: 0.22 },
  { d: 0.08, z: 0.3 },
  { d: 0.92, z: 0.3 },
  { d: 1, z: 0.24 },
  { d: 1, z: 0 },
);

/** Thin modern frame with a gap around the canvas, as if it floats. */
const float: ProfilePoint[] = joinProfile(
  { d: 0, z: REBATE_Z },
  { d: 0.55, z: REBATE_Z }, // the shadow gap
  { d: 0.55, z: 0.5 },
  { d: 1, z: 0.5 },
  { d: 1, z: 0 },
);

const PROFILES: Record<Exclude<FrameStyle, "none">, ProfilePoint[]> = {
  "ornate-gilt": ornateGilt,
  "simple-gilt": simpleGilt,
  ebony: flat,
  "natural-oak": flat,
  silver: simpleGilt,
  float,
};

const WIDTH_FACTOR: Record<FrameSettings["width"], number> = {
  slim: 0.7,
  standard: 1,
  wide: 1.35,
};

/**
 * Frame width in metres. Bigger paintings get wider frames, as in a real
 * collection: about 9 cm for a small portrait, up to about 20 cm for a large
 * canvas like Madame X.
 */
export function frameWidth(settings: FrameSettings, paintingLongestSide: number): number {
  const base = Math.min(0.2, Math.max(0.075, 0.06 + 0.065 * paintingLongestSide));
  const styleFactor = settings.style === "float" ? 0.35 : 1;
  return base * WIDTH_FACTOR[settings.width] * styleFactor;
}

/** The profile for a frame style, scaled to `width` metres. */
export function frameProfile(style: Exclude<FrameStyle, "none">, width: number): ProfilePoint[] {
  return PROFILES[style].map((p) => ({ ...p, d: p.d * width, z: p.z * width }));
}

/* ------------------------------------------------------------------------ */
/* Room trims, in metres. d ≤ 0 is into the room; walked from bottom to top. */
/* ------------------------------------------------------------------------ */

/** Cornice: the moulding where the walls meet the ceiling. */
export function corniceProfile(ceilingHeight: number): ProfilePoint[] {
  const top = ceilingHeight;
  const base = top - 0.42;
  return joinProfile(
    { d: 0, z: base },
    { d: -0.025, z: base + 0.01 },
    arc(-0.035, base + 0.04, 0.03, 270, 180, 4), // small bead under the cornice
    { d: -0.065, z: base + 0.07 },
    curve([-0.065, base + 0.07], [-0.07, base + 0.18], [-0.2, base + 0.2], [-0.24, base + 0.3], 7), // big cove
    { d: -0.3, z: base + 0.31 },
    { d: -0.3, z: base + 0.36 },
    { d: -0.33, z: base + 0.37 },
    { d: -0.33, z: top - 0.01 },
    { d: -0.36, z: top },
  );
}

/** Dado (chair) rail at about 0.9 m. */
export function dadoProfile(height = 0.9): ProfilePoint[] {
  return joinProfile(
    { d: 0, z: height - 0.04 },
    { d: -0.015, z: height - 0.035 },
    arc(-0.02, height, 0.028, 250, 110, 8),
    { d: -0.012, z: height + 0.035 },
    { d: 0, z: height + 0.04 },
  );
}

/** Skirting board along the floor. */
export function skirtingProfile(height = 0.24): ProfilePoint[] {
  return joinProfile(
    { d: 0, z: 0 },
    { d: -0.022, z: 0 },
    { d: -0.022, z: height - 0.04 },
    arc(-0.012, height - 0.04, 0.01, 180, 90, 3), // rounded top edge
    { d: -0.006, z: height - 0.02 },
    { d: 0, z: height },
  );
}
