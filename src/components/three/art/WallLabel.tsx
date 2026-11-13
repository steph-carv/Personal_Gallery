"use client";

import { useEffect, useState } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import type { Artwork } from "@/lib/gallery/types";

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
 * The text is drawn onto a canvas and used as a texture. That lets us use the
 * site's own fonts (loaded by next/font) without shipping separate font files
 * for 3D text, and costs a single draw call per label.
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
      <meshStandardMaterial
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
  const [texture, setTexture] = useState<CanvasTexture | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: CanvasTexture | null = null;

    const fonts = readFontFamilies();
    // Wait for the exact faces we draw with, or the canvas falls back to a
    // system font and never updates.
    Promise.all([
      document.fonts.load(`600 40px ${fonts.sans}`),
      document.fonts.load(`400 40px ${fonts.sans}`),
      document.fonts.load(`italic 500 40px ${fonts.serif}`),
    ])
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        created = drawLabel(artwork, fonts);
        setTexture(created);
      });

    return () => {
      cancelled = true;
      created?.dispose();
    };
  }, [artwork]);

  return texture;
}

/** The font-family strings next/font put in CSS variables (see layout.tsx). */
function readFontFamilies() {
  const style = getComputedStyle(document.documentElement);
  return {
    serif: style.getPropertyValue("--font-cormorant").trim() || "Georgia, serif",
    sans: style.getPropertyValue("--font-inter").trim() || "system-ui, sans-serif",
  };
}

function drawLabel(artwork: Artwork, fonts: { serif: string; sans: string }) {
  const width = Math.round(LABEL_SIZE.width * PX_PER_METRE);
  const height = Math.round(LABEL_SIZE.height * PX_PER_METRE);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

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
    for (const row of wrap(ctx, text, maxWidth)) {
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

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Split text into lines that fit `maxWidth`. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(" ");
  const rows: string[] = [];
  let current = "";
  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word;
    if (ctx.measureText(attempt).width > maxWidth && current) {
      rows.push(current);
      current = word;
    } else {
      current = attempt;
    }
  }
  if (current) rows.push(current);
  return rows;
}
