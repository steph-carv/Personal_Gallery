import "server-only";
import { apiUserAgent } from "@/lib/env.server";

/**
 * The pixel size of a remote JPEG or PNG, read from the first bytes of the
 * file (a range request, so we don't download the whole image). Some
 * museums (the Met) don't say how big their images are, and the 3D frame
 * needs the exact shape. Null if it can't be read.
 */
export async function remoteImageSize(
  url: string,
): Promise<{ width: number; height: number } | null> {
  try {
    const response = await fetch(url, {
      headers: { Range: "bytes=0-262143", "User-Agent": apiUserAgent() },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok && response.status !== 206) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    return pngSize(bytes) ?? jpegSize(bytes);
  } catch {
    return null;
  }
}

function pngSize(b: Uint8Array) {
  const signature = [0x89, 0x50, 0x4e, 0x47];
  if (!signature.every((v, i) => b[i] === v)) return null;
  const view = new DataView(b.buffer, b.byteOffset);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/** Walk JPEG markers until a start-of-frame, which holds the size. */
function jpegSize(b: Uint8Array) {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    const length = (b[i + 2] << 8) | b[i + 3];
    // SOF0–SOF15, except DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: (b[i + 5] << 8) | b[i + 6], width: (b[i + 7] << 8) | b[i + 8] };
    }
    i += 2 + length;
  }
  return null;
}
