import { framedSize } from "@/components/three/art/placementGeometry";
import { LABEL_GAP, LABEL_SIZE } from "@/components/three/art/labelSize";
import { DADO_HEIGHT } from "@/components/three/room/wallTransforms";
import { ARCHITRAVE_WIDTH, type PlacedRoom } from "./layout";
import type { Artwork, FrameSettings, Placement, WallId } from "./types";

/** Space kept between neighbouring works, and from the room's corners, in metres. */
const SPACING = 0.35;
const FROM_CORNER = 0.6;
/** Gap kept above the dado rail and below the cornice. */
const ABOVE_DADO = 0.15;
const BELOW_CORNICE = 0.6;
/** Usual hanging height for the centre of a painting. */
const EYE_LINE = 1.6;

const WALL_ORDER: WallId[] = ["west", "north", "east", "south"];

export interface WallSpot {
  wall: WallId;
  x: number;
  y: number;
}

/**
 * Where to hang a new work in a room: the middle of the widest stretch of
 * wall that fits it and its label, clear of doorways, corners and the works
 * already there. Hung at eye level, or higher if it's tall, never over the
 * dado rail or into the cornice. Null if no wall has room (it can go to the
 * storeroom instead).
 *
 * Curate mode (Phase 8) adds dragging works anywhere; this is just a sensible
 * first spot.
 */
export function findWallSpot(
  room: PlacedRoom,
  artwork: Artwork,
  frame: FrameSettings,
): WallSpot | null {
  const size = framedSize({ artwork, frame } as Placement);
  // The block that needs space: frame plus label beside it.
  const block = size.width + LABEL_GAP + LABEL_SIZE.width;

  const lowest = DADO_HEIGHT + ABOVE_DADO + size.height / 2;
  const highest = room.height - BELOW_CORNICE - size.height / 2;
  if (lowest > highest) return null; // Too tall for the room.
  const y = Math.min(highest, Math.max(EYE_LINE, lowest));

  let best: (WallSpot & { room: number }) | null = null;
  for (const wall of WALL_ORDER) {
    const length = wall === "north" || wall === "south" ? room.width : room.depth;
    const taken: [number, number][] = [
      [-Infinity, -length / 2 + FROM_CORNER],
      [length / 2 - FROM_CORNER, Infinity],
    ];
    for (const p of room.placements.filter((p) => p.wall === wall)) {
      const f = framedSize(p);
      const label = p.showLabel ? LABEL_GAP + LABEL_SIZE.width : 0;
      taken.push([p.x - f.width / 2 - SPACING, p.x + f.width / 2 + label + SPACING]);
    }
    for (const d of room.doors.filter((d) => d.wall === wall)) {
      const half = d.width / 2 + ARCHITRAVE_WIDTH + SPACING;
      taken.push([d.x - half, d.x + half]);
    }

    // Walk the gaps between the taken stretches.
    taken.sort((a, b) => a[0] - b[0]);
    let reach = -Infinity;
    for (const [start, end] of taken) {
      if (start > reach && start - reach >= block && Number.isFinite(reach)) {
        const gap = start - reach;
        if (!best || gap > best.room) {
          // Centre the frame-plus-label block in the gap.
          const blockStart = reach + (gap - block) / 2;
          best = { wall, x: blockStart + size.width / 2, y, room: gap };
        }
      }
      reach = Math.max(reach, end);
    }
  }
  return best ? { wall: best.wall, x: round(best.x), y: round(best.y) } : null;
}

const round = (n: number) => Math.round(n * 100) / 100;
