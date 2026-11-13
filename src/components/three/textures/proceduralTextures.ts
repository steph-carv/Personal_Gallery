import {
  CanvasTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";

/**
 * Textures drawn with the 2D canvas API at runtime, so there are no image
 * files to download or license. Every one uses a seeded random generator, so
 * the room looks exactly the same on every visit.
 *
 * Browser-only: call these from components (inside the R3F <Canvas>), never
 * on the server.
 */

/** Small, fast, seeded random number generator (mulberry32). */
export function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(width: number, height = width) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  return { canvas, ctx };
}

function toTexture(canvas: HTMLCanvasElement, { color = false } = {}): Texture {
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 8;
  // Colour images are sRGB; data maps (roughness, bump) stay linear.
  if (color) texture.colorSpace = SRGBColorSpace;
  return texture;
}

/* ------------------------------------------------------------------------ */

/** How many metres one tile of the oak floor texture covers (square). */
export const FLOOR_TILE_METRES = 4;

/**
 * Oak floorboards running north–south: a colour map (the boards and grain)
 * and a roughness map (worn varnish varies board to board).
 */
export function createOakFloorTextures() {
  const size = 2048;
  const pxPerMetre = size / FLOOR_TILE_METRES;
  const boardWidth = 0.16 * pxPerMetre;
  const columns = Math.round(size / boardWidth);
  const random = seededRandom(1824);

  const { canvas: colorCanvas, ctx: color } = makeCanvas(size);
  const { canvas: roughCanvas, ctx: rough } = makeCanvas(size);

  for (let c = 0; c < columns; c++) {
    const x = c * boardWidth;
    // Boards of random length, staggered so the joints don't line up.
    let y = -random() * 2.2 * pxPerMetre;
    while (y < size) {
      const length = (1.1 + random() * 1.4) * pxPerMetre;
      const hue = 27 + random() * 6;
      const light = 24 + random() * 7;
      color.fillStyle = `hsl(${hue} ${34 + random() * 8}% ${light}%)`;
      // Draw wrapped so the texture tiles seamlessly top to bottom.
      for (const offset of [0, size, -size]) {
        color.fillRect(x, y + offset, boardWidth, length);
      }

      // Grain: long, slightly wavy streaks along the board.
      const streaks = 26;
      for (let s = 0; s < streaks; s++) {
        const gx = x + random() * boardWidth;
        const dark = random() < 0.5;
        color.strokeStyle = dark
          ? `rgba(40, 22, 10, ${0.06 + random() * 0.1})`
          : `rgba(255, 220, 170, ${0.02 + random() * 0.04})`;
        color.lineWidth = 0.6 + random() * 1.8;
        const wobble = 1 + random() * 3;
        const phase = random() * Math.PI * 2;
        for (const offset of [0, size, -size]) {
          color.beginPath();
          for (let gy = 0; gy <= length; gy += 12) {
            const px = gx + Math.sin(gy / (40 + wobble * 20) + phase) * wobble;
            if (gy === 0) color.moveTo(px, y + offset + gy);
            else color.lineTo(px, y + offset + gy);
          }
          color.stroke();
        }
      }

      const roughness = 150 + random() * 60;
      rough.fillStyle = `rgb(${roughness}, ${roughness}, ${roughness})`;
      for (const offset of [0, size, -size]) {
        rough.fillRect(x, y + offset, boardWidth, length);
      }

      // Dark joint at the end of each board.
      color.fillStyle = "rgba(20, 10, 4, 0.75)";
      for (const offset of [0, size, -size])
        color.fillRect(x, y + offset + length - 2, boardWidth, 2);
      y += length;
    }
    // Gap between columns of boards.
    color.fillStyle = "rgba(20, 10, 4, 0.8)";
    color.fillRect(x, 0, 2, size);
    rough.fillStyle = "rgb(255, 255, 255)";
    rough.fillRect(x, 0, 2, size);
  }

  return { map: toTexture(colorCanvas, { color: true }), roughnessMap: toTexture(roughCanvas) };
}

/**
 * Painted plaster: near-white blotches and fine speckle. Used as a colour map
 * (multiplied by the wall colour, so one texture suits any colour) and as a
 * bump map for a faint, matte surface.
 */
export function createPlasterTexture() {
  const size = 512;
  const random = seededRandom(77);
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = "rgb(236, 236, 236)";
  ctx.fillRect(0, 0, size, size);

  // Soft, wide blotches: uneven paint coverage.
  for (let i = 0; i < 90; i++) {
    const x = random() * size;
    const y = random() * size;
    const r = 30 + random() * 90;
    const v = random() < 0.5 ? 255 : 210;
    for (const [ox, oy] of tileOffsets(size)) {
      const gradient = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      gradient.addColorStop(0, `rgba(${v}, ${v}, ${v}, 0.12)`);
      gradient.addColorStop(1, `rgba(${v}, ${v}, ${v}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  }

  // Fine speckle.
  const image = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < image.data.length; i += 4) {
    const n = (random() - 0.5) * 14;
    image.data[i] += n;
    image.data[i + 1] += n;
    image.data[i + 2] += n;
  }
  ctx.putImageData(image, 0, 0);

  return toTexture(canvas, { color: true });
}

/**
 * Gilding: a roughness map where the gold is worn smoother on the high spots,
 * plus a bump map of a small repeating leaf-and-bead pattern that reads as
 * carving from a few metres away.
 */
export function createGiltTextures() {
  const size = 256;
  const random = seededRandom(1503);

  const { canvas: roughCanvas, ctx: rough } = makeCanvas(size);
  rough.fillStyle = "rgb(95, 95, 95)";
  rough.fillRect(0, 0, size, size);
  for (let i = 0; i < 400; i++) {
    const v = 75 + random() * 45;
    rough.fillStyle = `rgba(${v}, ${v}, ${v}, 0.25)`;
    const r = 2 + random() * 10;
    rough.beginPath();
    rough.arc(random() * size, random() * size, r, 0, Math.PI * 2);
    rough.fill();
  }

  const { canvas: bumpCanvas, ctx: bump } = makeCanvas(size);
  bump.fillStyle = "rgb(128, 128, 128)";
  bump.fillRect(0, 0, size, size);
  // Leaves: raised ovals in a row, with beads between them.
  const leaves = 4;
  for (let i = 0; i < leaves; i++) {
    const cx = (i + 0.5) * (size / leaves);
    for (const cy of [size * 0.25, size * 0.75]) {
      const leaf = bump.createRadialGradient(cx, cy, 2, cx, cy, size / leaves / 2);
      leaf.addColorStop(0, "rgb(210, 210, 210)");
      leaf.addColorStop(0.7, "rgb(150, 150, 150)");
      leaf.addColorStop(1, "rgb(70, 70, 70)");
      bump.fillStyle = leaf;
      bump.beginPath();
      bump.ellipse(cx, cy, size / leaves / 2.4, size / 5, 0, 0, Math.PI * 2);
      bump.fill();
      bump.fillStyle = "rgb(200, 200, 200)";
      bump.beginPath();
      bump.arc(cx + size / leaves / 2, cy, 6, 0, Math.PI * 2);
      bump.fill();
    }
  }

  return { roughnessMap: toTexture(roughCanvas), bumpMap: toTexture(bumpCanvas) };
}

/**
 * Buttoned (chesterfield) leather: a bump map with a dimple at each button
 * and soft pleats running diagonally between them. One tile holds one
 * diamond; `TUFT_SPACING` is its size in metres.
 */
export const TUFT_SPACING = 0.16;

export function createTuftedLeatherTextures() {
  const size = 256;
  const random = seededRandom(9);
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = "rgb(190, 190, 190)";
  ctx.fillRect(0, 0, size, size);

  // Buttons sit at the corners and the centre of the tile: a diamond grid.
  const buttons = [
    [0, 0],
    [size, 0],
    [0, size],
    [size, size],
    [size / 2, size / 2],
  ];
  // Pleats: dark creases from each corner button to the centre one.
  ctx.strokeStyle = "rgba(60, 60, 60, 0.45)";
  ctx.lineWidth = 5;
  for (const [x, y] of buttons.slice(0, 4)) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(size / 2, size / 2);
    ctx.stroke();
  }
  // Dimples: each button pulls the leather down around it.
  for (const [x, y] of buttons) {
    const dimple = ctx.createRadialGradient(x, y, 0, x, y, size * 0.42);
    dimple.addColorStop(0, "rgba(20, 20, 20, 1)");
    dimple.addColorStop(0.35, "rgba(90, 90, 90, 0.6)");
    dimple.addColorStop(1, "rgba(190, 190, 190, 0)");
    ctx.fillStyle = dimple;
    ctx.fillRect(x - size, y - size, size * 2, size * 2);
  }
  // Leather grain.
  const image = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < image.data.length; i += 4) {
    const n = (random() - 0.5) * 18;
    image.data[i] += n;
    image.data[i + 1] += n;
    image.data[i + 2] += n;
  }
  ctx.putImageData(image, 0, 0);

  return { bumpMap: toTexture(canvas) };
}

/** Offsets to draw a shape nine times so it wraps across tile edges. */
function tileOffsets(size: number): [number, number][] {
  const out: [number, number][] = [];
  for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) out.push([ox, oy]);
  return out;
}
