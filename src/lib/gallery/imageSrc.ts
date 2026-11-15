/**
 * The address to load an artwork image from in code that doesn't use
 * next/image (3D textures, the zoom viewer).
 *
 * Images in /public are served as they are. Museum images go through our
 * own image optimiser, which fetches the original once, resizes it and
 * caches it (next.config.ts): no hot-linking, and since it's our own domain
 * the browser lets WebGL use it as a texture.
 *
 * `width` must be one of Next's device sizes; quality one of `images.qualities`.
 */
export function imageSrc(url: string, width: 1080 | 1920 | 2048 | 3840 = 2048) {
  if (url.startsWith("/")) return url;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=75`;
}
