import "server-only";
import { cacheLife } from "next/cache";
import { apiUserAgent } from "@/lib/env.server";
import { getJson } from "./http";
import { plainText, WALL_ART, type CatalogueWork } from "./types";

/**
 * The Art Institute of Chicago's public API (no key). Public-domain works
 * only; images come from their IIIF image server. AIC's data, including
 * descriptions, is released CC0. They ask clients to identify themselves
 * with an AIC-User-Agent header.
 */

const API = "https://api.artic.edu/api/v1/artworks";
const FIELDS = [
  "id",
  "title",
  "artist_title",
  "artist_display",
  "date_display",
  "medium_display",
  "dimensions",
  "dimensions_detail",
  "image_id",
  "thumbnail",
  "is_public_domain",
  "description",
  "boost_rank",
  "has_not_been_viewed_much",
  "artwork_type_title",
].join(",");

interface AicArtwork {
  id: number;
  title: string;
  artist_title: string | null;
  artist_display: string | null;
  date_display: string | null;
  medium_display: string | null;
  dimensions: string | null;
  dimensions_detail: { width: number | null; height: number | null }[] | null;
  image_id: string | null;
  thumbnail: { width: number; height: number } | null;
  is_public_domain: boolean;
  description: string | null;
  boost_rank: number | null;
  has_not_been_viewed_much: boolean;
  artwork_type_title: string | null;
}

const headers = () => ({ "AIC-User-Agent": apiUserAgent() });

export async function searchAic(query: string, limit = 12): Promise<CatalogueWork[]> {
  "use cache";
  cacheLife("days");
  const params = new URLSearchParams({
    q: query,
    "query[term][is_public_domain]": "true",
    fields: FIELDS,
    limit: String(limit * 2),
  });
  const data = await getJson<{ data: AicArtwork[]; config: { iiif_url: string } }>(
    `${API}/search?${params}`,
    headers(),
  );
  return data.data
    .map((a) => toWork(a, data.config.iiif_url))
    .filter((w): w is CatalogueWork => w !== null)
    .slice(0, limit);
}

export async function getAicWork(id: string): Promise<CatalogueWork | null> {
  "use cache";
  cacheLife("days");
  if (!/^\d+$/.test(id)) return null;
  const data = await getJson<{ data: AicArtwork; config: { iiif_url: string } }>(
    `${API}/${id}?fields=${FIELDS}`,
    headers(),
  );
  return toWork(data.data, data.config.iiif_url);
}

function toWork(a: AicArtwork, iiif: string): CatalogueWork | null {
  if (!a.is_public_domain || !a.image_id || !a.thumbnail) return null;
  if (a.artwork_type_title && !WALL_ART.test(a.artwork_type_title)) return null;
  // "Claude Monet (French, 1840–1926)" → nationality and life dates.
  const display = a.artist_display?.split("\n")[0] ?? "";
  const meta = display.match(/\(([^,()]+),\s*([^()]+)\)/);
  const size = a.dimensions_detail?.[0];
  const image = (width: number) => `${iiif}/${a.image_id}/full/${width},/0/default.jpg`;
  return {
    source: "aic",
    sourceId: String(a.id),
    title: a.title,
    artist: a.artist_title ?? (display.replace(/\s*\(.*$/, "") || "Unknown artist"),
    artistMeta: meta ? { nationality: meta[1].trim(), lifeDates: meta[2].trim() } : {},
    dateText: a.date_display ?? "",
    medium: a.medium_display ?? "",
    dimensionsText:
      size?.height && size.width
        ? `${size.height} × ${size.width} cm`
        : (a.dimensions?.split(";")[0] ?? ""),
    widthCm: size?.width ?? 0,
    heightCm: size?.height ?? 0,
    holder: "The Art Institute of Chicago",
    // 843 and 1686 px wide are the sizes AIC's image server keeps cached.
    imageUrl: image(1686),
    thumbnailUrl: image(843),
    imageWidth: a.thumbnail.width,
    imageHeight: a.thumbnail.height,
    attribution: "Image: The Art Institute of Chicago, CC0",
    sourceUrl: `https://www.artic.edu/artworks/${a.id}`,
    description: plainText(a.description),
    descriptionCredit: a.description ? "Description: The Art Institute of Chicago, CC0" : undefined,
    popularity: a.boost_rank !== null ? 3 : a.has_not_been_viewed_much ? 0 : 1,
  };
}
