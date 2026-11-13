"use client";

import { makeCanvas, useCanvasTexture, wrapText } from "../textures/canvasText";

const SIZE = { width: 4.2, height: 1.7 };

/**
 * Shown on the far wall of a room with nothing in it yet (like Room 3, Your
 * Picks): two dashed outlines of empty hooks either side of a cream card,
 * as in the design mock-up. Drawn in the wall's local frame.
 */
export function EmptyRoomSign({ y = 1.75 }: { y?: number }) {
  const texture = useCanvasTexture("empty-room", (fonts) => {
    const px = 600;
    const w = SIZE.width * px;
    const h = SIZE.height * px;
    const { canvas, ctx } = makeCanvas(w, h);

    // Empty hooks: dashed outlines, left (portrait) and right (landscape).
    ctx.strokeStyle = "rgba(239, 231, 212, 0.55)";
    ctx.lineWidth = 7;
    ctx.setLineDash([26, 18]);
    ctx.strokeRect(0.05 * w, 0.14 * h, 0.17 * w, 0.72 * h);
    ctx.strokeRect(0.76 * w, 0.26 * h, 0.21 * w, 0.48 * h);
    ctx.setLineDash([]);

    // The card.
    const card = { x: 0.29 * w, y: 0.12 * h, w: 0.42 * w, h: 0.76 * h };
    ctx.fillStyle = "#efe7d4";
    ctx.fillRect(card.x, card.y, card.w, card.h);
    ctx.fillStyle = "#1b1612";
    ctx.textAlign = "center";
    ctx.font = `italic 500 92px ${fonts.serif}`;
    let ty = card.y + 160;
    for (const row of wrapText(ctx, "This room is waiting for your first piece.", card.w - 120)) {
      ctx.fillText(row, w / 2, ty);
      ty += 100;
    }
    ctx.fillStyle = "#4e463d";
    ctx.font = `400 40px ${fonts.sans}`;
    ty += 30;
    for (const row of wrapText(
      ctx,
      "Find famous works, or discover lesser-known artists, and hang them here.",
      card.w - 160,
    )) {
      ctx.fillText(row, w / 2, ty);
      ty += 56;
    }
    return canvas;
  });

  if (!texture) return null;
  return (
    <mesh position={[0, y, 0.01]}>
      <planeGeometry args={[SIZE.width, SIZE.height]} />
      <meshStandardMaterial map={texture} transparent alphaTest={0.05} roughness={0.85} />
    </mesh>
  );
}
