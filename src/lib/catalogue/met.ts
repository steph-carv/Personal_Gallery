import "server-only";
import { cacheLife } from "next/cache";
import { getJson } from "./http";
import { WALL_ART, type CatalogueWork } from "./types";

/**
 * The Metropolitan Museum of Art's Collection API (no key). The old search
 * endpoint was retired in October 2026; v1.1 search is paginated. Its
 * `isPublicDomain` filter is ignored, so each object is fetched and checked:
 * only works the Met marks public domain, with an image, are used.
 */

const API = "https://collectionapi.metmuseum.org/public/collection";

interface MetObject {
  objectID: number;
  isPublicDomain: boolean;
  isHighlight: boolean;
  primaryImage: string;
  primaryImageSmall: string;
  title: string;
  artistDisplayName: string;
  artistNationality: string;
  artistBeginDate: string;
  artistEndDate: string;
  culture: string;
  objectDate: string;
  medium: string;
  dimensions: string;
  measurements:
    { elementName: string; elementMeasurements: { Height?: number; Width?: number } }[] | null;
  objectURL: string;
  classification: string;
}

export async function searchMet(query: string, limit = 12): Promise<CatalogueWork[]> {
  "use cache";
  cacheLife("days");
  const params = new URLSearchParams({ q: query, hasImages: "true", limit: "36" });
  const { objectIDs } = await getJson<{ objectIDs: number[] | null }>(
    `${API}/v1.1/search?${params}`,
  );
  const works = await Promise.all(
    (objectIDs ?? []).slice(0, 36).map((id) => getMetWork(String(id)).catch(() => null)),
  );
  return works.filter((w): w is CatalogueWork => w !== null).slice(0, limit);
}

export async function getMetWork(id: string): Promise<CatalogueWork | null> {
  "use cache";
  cacheLife("days");
  if (!/^\d+$/.test(id)) return null;
  const o = await getJson<MetObject>(`${API}/v1/objects/${id}`);
  if (!o.isPublicDomain || !o.primaryImage) return null;
  if (o.classification && !WALL_ART.test(o.classification)) return null;

  const overall =
    o.measurements?.find((m) => m.elementName === "Overall")?.elementMeasurements ??
    o.measurements?.[0]?.elementMeasurements;
  const width = overall?.Width ?? 0;
  const height = overall?.Height ?? 0;
  // The API doesn't give the image's pixel size. Use the object's shape
  // until the real size is read from the image when it's hung.
  const aspect = width && height ? width / height : 0.8;
  const lifeDates =
    o.artistBeginDate && o.artistEndDate ? `${o.artistBeginDate}–${o.artistEndDate}` : undefined;
  return {
    source: "met",
    sourceId: String(o.objectID),
    title: o.title,
    artist: o.artistDisplayName || o.culture || "Unknown artist",
    artistMeta: { nationality: o.artistNationality || undefined, lifeDates },
    dateText: o.objectDate,
    medium: o.medium,
    dimensionsText: o.dimensions.split(/\r?\n/)[0] ?? "",
    widthCm: width,
    heightCm: height,
    holder: "The Metropolitan Museum of Art, New York",
    imageUrl: o.primaryImage,
    thumbnailUrl: o.primaryImageSmall || o.primaryImage,
    imageWidth: Math.round(1000 * aspect),
    imageHeight: 1000,
    attribution: "Image: The Metropolitan Museum of Art, CC0",
    sourceUrl: o.objectURL,
    popularity: o.isHighlight ? 3 : 1,
  };
}
