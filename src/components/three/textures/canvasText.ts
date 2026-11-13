"use client";

import { useEffect, useState } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";

/**
 * Text in the 3D scene (wall labels, doorway plaques, signs) is drawn onto a
 * 2D canvas with the site's own fonts and used as a texture. One draw call
 * per sign, and no separate font files for 3D text.
 */

export interface Fonts {
  serif: string;
  sans: string;
}

/** The font-family strings next/font put in CSS variables (see app/layout.tsx). */
export function readFontFamilies(): Fonts {
  const style = getComputedStyle(document.documentElement);
  return {
    serif: style.getPropertyValue("--font-cormorant").trim() || "Georgia, serif",
    sans: style.getPropertyValue("--font-inter").trim() || "system-ui, sans-serif",
  };
}

/**
 * Draws a texture once the fonts it uses have loaded (otherwise the canvas
 * would fall back to a system font and never update). Redraws when `key`
 * changes; disposes the old texture.
 */
export function useCanvasTexture(
  key: string,
  draw: (fonts: Fonts) => HTMLCanvasElement,
): CanvasTexture | null {
  const [texture, setTexture] = useState<CanvasTexture | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: CanvasTexture | null = null;
    const fonts = readFontFamilies();
    Promise.all([
      document.fonts.load(`600 40px ${fonts.sans}`),
      document.fonts.load(`400 40px ${fonts.sans}`),
      document.fonts.load(`italic 500 40px ${fonts.serif}`),
    ])
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        created = new CanvasTexture(draw(fonts));
        created.colorSpace = SRGBColorSpace;
        created.anisotropy = 8;
        setTexture(created);
      });
    return () => {
      cancelled = true;
      created?.dispose();
    };
    // `draw` is expected to depend only on what `key` describes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return texture;
}

/** Split text into lines that fit `maxWidth` with the context's current font. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const rows: string[] = [];
  let current = "";
  for (const word of text.split(" ")) {
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

export function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext("2d")! };
}
