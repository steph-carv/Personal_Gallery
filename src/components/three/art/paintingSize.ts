import type { Artwork } from "@/lib/gallery/types";

/** Smallest and largest longest-side, in metres, that a painting is shown at. */
const MIN_LONGEST = 0.35;
const MAX_LONGEST = 2.6;

/**
 * Size of the painting on the wall, in metres. Uses the real dimensions when
 * known, clamped so tiny miniatures stay visible and huge canvases still fit.
 * The aspect ratio comes from the image, so the picture is never stretched.
 */
export function paintingSize(artwork: Artwork): { width: number; height: number } {
  const aspect = artwork.imageWidth / artwork.imageHeight;
  const realLongest = Math.max(artwork.widthCm, artwork.heightCm) / 100 || 0.8;
  const longest = Math.min(MAX_LONGEST, Math.max(MIN_LONGEST, realLongest));
  return aspect >= 1
    ? { width: longest, height: longest / aspect }
    : { width: longest * aspect, height: longest };
}
