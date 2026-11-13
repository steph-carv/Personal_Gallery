"use client";

import type { Artwork } from "@/lib/gallery/types";
import { makeCanvas, useCanvasTexture, wrapText, type Fonts } from "../textures/canvasText";

/** Card size in metres: about the size of a real museum label. */
export const LABEL_SIZE = { width: 0.2, height: 0.14 };
/** Gap between a frame's outer edge and its label, in metres. */
export const LABEL_GAP = 0.14;
const LABEL_THICKNESS = 0.004;
const PX_PER_METRE = 5600; // ~1120 × 784 px: crisp when you walk right up to it

/**
 * The cream wall label beside each painting: artist, life dates, title,
 * date, medium and the museum that holds it.
 *
 * The text is drawn onto a canvas texture in the site's fonts (canvasText.ts).
 */
export function WallLabel({ artwork }: { artwork: Artwork }) {
  const texture = useLabelTexture(artwork);
  return (
    <mesh position-z={LABEL_THICKNESS / 2} castShadow receiveShadow>
      <boxGeometry args={[LABEL_SIZE.width, LABEL_SIZE.height, LABEL_THICKNESS]} />
      {/* Box faces: right, left, top, bottom, front, back. Text on the front only. */}
      <meshStandardMaterial attach="material-0" color="#e6dcc4" roughness={0.8} />
      <meshStandardMaterial attach="material-1" color="#e6dcc4" roughness={0.8} />
      <meshStandardMaterial attach="material-2" color="#e6dcc4" roughness={0.8} />
      <meshStandardMaterial attach="material-3" color="#e6dcc4" roughness={0.8} />
      {/* Keyed on the texture: a material built before its map existed
          would keep rendering without it. */}
      <meshStandardMaterial
        key={texture ? "drawn" : "blank"}
        attach="material-4"
        color={texture ? "#ffffff" : "#efe7d4"}
        map={texture}
        roughness={0.75}
      />
      <meshStandardMaterial attach="material-5" color="#e6dcc4" roughness={0.8} />
    </mesh>
  );
}

function useLabelTexture(artwork: Artwork) {
  return useCanvasTexture(artwork.id, (fonts) => drawLabel(artwork, fonts));
}

function drawLabel(artwork: Artwork, fonts: Fonts) {
  const width = Math.round(LABEL_SIZE.width * PX_PER_METRE);
  const height = Math.round(LABEL_SIZE.height * PX_PER_METRE);
  const { canvas, ctx } = makeCanvas(width, height);

  ctx.fillStyle = "#efe7d4";
  ctx.fillRect(0, 0, width, height);

  const pad = 64;
  const maxWidth = width - pad * 2;
  let y = pad;
  const ink = "#1b1612";
  const muted = "#5d544a";

  const line = (text: string, font: string, color: string, size: number, gap = 0.35) => {
    ctx.font = `${font} ${size}px ${font.includes("italic") ? fonts.serif : fonts.sans}`;
    ctx.fillStyle = color;
    for (const row of wrapText(ctx, text, maxWidth)) {
      y += size;
      ctx.fillText(row, pad, y);
      y += size * 0.22;
    }
    y += size * gap;
  };

  line(artwork.artist, "600", ink, 64, 0.05);
  const meta = [artwork.artistMeta.nationality, artwork.artistMeta.lifeDates]
    .filter(Boolean)
    .join(", ");
  if (meta) line(meta, "400", muted, 46, 0.5);
  line(artwork.title, "italic 500", ink, 92, 0.05);
  line(artwork.dateText, "400", ink, 48, 0.4);
  line(artwork.medium, "400", ink, 44, 0.15);

  // Holder pinned to the bottom of the card.
  ctx.font = `400 38px ${fonts.sans}`;
  ctx.fillStyle = muted;
  ctx.fillText(artwork.holder, pad, height - pad + 14, maxWidth);
  return canvas;
}
