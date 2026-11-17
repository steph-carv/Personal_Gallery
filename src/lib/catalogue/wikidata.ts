import "server-only";
import { createHash } from "node:crypto";
import { cacheLife } from "next/cache";
import { getJson } from "./http";
import { outOfCopyright, type CatalogueWork } from "./types";

/**
 * Wikidata (facts) + Wikimedia Commons (images). Covers famous works in
 * museums without open APIs: the Louvre, the National Gallery, MoMA...
 *
 * Copyright is checked twice: search results only include works whose
 * artist died more than 70 years ago (or, for unknown artists, made before
 * 1850). Before a work is hung, getWikidataWork() also checks the image file
 * on Commons is public domain or under a Creative Commons licence, and keeps
 * its credit. (Searches don't call Commons at all, which keeps us well
 * within its rate limits.)
 */

const SPARQL = "https://query.wikidata.org/sparql";
const COMMONS = "https://commons.wikimedia.org/w/api.php";

type Binding = Record<string, { value: string } | undefined>;

/** Facts for works, grouped by item (the query returns one row per combination). */
function worksQuery(selector: string) {
  return `SELECT ?item ?itemLabel ?creatorLabel ?death ?inception ?image ?collectionLabel
       ?height ?width ?materialLabel ?links WHERE {
  ${selector}
  ?item wdt:P18 ?image; wikibase:sitelinks ?links.
  OPTIONAL { ?item wdt:P170 ?creator. OPTIONAL { ?creator wdt:P570 ?death } }
  OPTIONAL { ?item wdt:P571 ?inception }
  OPTIONAL { ?item wdt:P195 ?collection }
  OPTIONAL { ?item wdt:P186 ?material }
  OPTIONAL { ?item p:P2048/psv:P2048 [ wikibase:quantityAmount ?height; wikibase:quantityUnit wd:Q174728 ] }
  OPTIONAL { ?item p:P2049/psv:P2049 [ wikibase:quantityAmount ?width; wikibase:quantityUnit wd:Q174728 ] }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 400`;
}

export async function searchWikidata(query: string, limit = 12): Promise<CatalogueWork[]> {
  "use cache";
  cacheLife("days");
  // Full-text search, limited to paintings (Q3305213), via the search API.
  const search = query.replace(/["\\]/g, " ").trim();
  const selector = `SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:endpoint "www.wikidata.org"; wikibase:api "Search";
      mwapi:srsearch "${search} haswbstatement:P31=Q3305213"; mwapi:srlimit "40".
    ?item wikibase:apiOutputItem mwapi:title.
  }`;
  const works = await worksFromQuery(worksQuery(selector));
  return works.sort((a, b) => b.popularity - a.popularity).slice(0, limit);
}

/** One work, with its image's real size and licence checked on Commons. */
export async function getWikidataWork(id: string): Promise<CatalogueWork | null> {
  "use cache";
  cacheLife("days");
  if (!/^Q\d+$/.test(id)) return null;
  const [work] = await worksFromQuery(worksQuery(`VALUES ?item { wd:${id} }`));
  if (!work) return null;
  const file = commonsFileOf(work.thumbnailUrl);
  const info = (await commonsInfo([file])).get(file.replace(/_/g, " "));
  if (!info) return null; // No open licence: can't be shown.
  return {
    ...work,
    imageUrl: commonsImage(file, info.width, 1920),
    thumbnailUrl: commonsImage(file, info.width, 500),
    imageWidth: info.width,
    imageHeight: info.height,
    attribution: info.attribution,
  };
}

async function worksFromQuery(sparql: string): Promise<CatalogueWork[]> {
  const data = await getJson<{ results: { bindings: Binding[] } }>(
    `${SPARQL}?query=${encodeURIComponent(sparql)}`,
    { Accept: "application/sparql-results+json" },
    20_000,
  );

  // Group the rows by work.
  const items = new Map<string, Binding[]>();
  for (const row of data.results.bindings) {
    const id = row.item!.value.split("/").pop()!;
    items.set(id, [...(items.get(id) ?? []), row]);
  }

  const candidates = [...items].flatMap(([id, rows]) => {
    const first = (key: string) => rows.find((r) => r[key])?.[key]?.value;
    const all = (key: string) =>
      [...new Set(rows.map((r) => r[key]?.value).filter(Boolean))] as string[];
    const year = (iso?: string) => (iso ? Number(iso.match(/^-?\d+/)?.[0]) : null);
    const deathYear = year(first("death"));
    const madeYear = year(first("inception"));
    if (!outOfCopyright(deathYear, madeYear)) return [];
    const file = decodeURIComponent(first("image")!.split("/Special:FilePath/")[1] ?? "");
    if (!/\.(jpe?g|png)$/i.test(file)) return [];
    const materials = all("materialLabel").filter((m) => !/^Q\d+$/.test(m));
    const width = Number(first("width") ?? 0);
    const height = Number(first("height") ?? 0);
    return [
      {
        id,
        file,
        title: first("itemLabel") ?? id,
        artist: named(first("creatorLabel")) ?? "Unknown artist",
        madeYear,
        holder: museumName(all("collectionLabel")),
        medium: materials.length ? capitalise(materials.join(", ")) : "",
        width,
        height,
        popularity: Number(first("links") ?? 0),
      },
    ];
  });
  return candidates.map((c) => {
    // Until the real image size is checked (when hanging), use the
    // painting's own shape, or a typical portrait shape if that's unknown.
    const aspect = c.width && c.height ? c.width / c.height : 0.8;
    return {
      source: "wikidata" as const,
      sourceId: c.id,
      title: c.title,
      artist: c.artist,
      artistMeta: {},
      dateText: c.madeYear ? String(c.madeYear) : "",
      medium: c.medium,
      dimensionsText: c.width && c.height ? `${round(c.height)} × ${round(c.width)} cm` : "",
      widthCm: c.width,
      heightCm: c.height,
      holder: c.holder,
      imageUrl: commonsImage(c.file, Infinity, 1920),
      thumbnailUrl: commonsImage(c.file, Infinity, 500),
      imageWidth: Math.round(1000 * aspect),
      imageHeight: 1000,
      attribution: "Image: Wikimedia Commons",
      sourceUrl: `https://www.wikidata.org/wiki/${c.id}`,
      popularity: c.popularity,
    };
  });
}

/** The Commons file name inside one of our Commons image URLs. */
function commonsFileOf(url: string) {
  const name = url.includes("/thumb/") ? url.split("/").slice(-2, -1)[0] : url.split("/").pop()!;
  return decodeURIComponent(name);
}

interface FileInfo {
  width: number;
  height: number;
  attribution: string;
}

/** Size and licence of Commons files; files without an open licence are left out. */
async function commonsInfo(files: string[]): Promise<Map<string, FileInfo>> {
  const result = new Map<string, FileInfo>();
  for (let i = 0; i < files.length; i += 50) {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      prop: "imageinfo",
      iiprop: "size|extmetadata",
      iiextmetadatafilter: "LicenseShortName|Artist",
      titles: files
        .slice(i, i + 50)
        .map((f) => `File:${f}`)
        .join("|"),
    });
    const data = await getJson<{
      query?: {
        pages: Record<
          string,
          {
            title: string;
            imageinfo?: {
              width: number;
              height: number;
              extmetadata?: Record<string, { value: string } | undefined>;
            }[];
          }
        >;
      };
    }>(`${COMMONS}?${params}`);
    for (const page of Object.values(data.query?.pages ?? {})) {
      const info = page.imageinfo?.[0];
      const licence = info?.extmetadata?.LicenseShortName?.value ?? "";
      if (!info) continue;
      const name = page.title.replace(/^File:/, "");
      if (/^(public domain|pd\b|cc0)/i.test(licence)) {
        result.set(name, {
          width: info.width,
          height: info.height,
          attribution: "Image: Wikimedia Commons, public domain",
        });
      } else if (/^cc[ -]by/i.test(licence)) {
        const author = info.extmetadata?.Artist?.value.replace(/<[^>]+>/g, "").trim();
        result.set(name, {
          width: info.width,
          height: info.height,
          attribution: `Image: ${author ? `${author}, ` : ""}${licence}, via Wikimedia Commons`,
        });
      }
      // Anything else (no licence, or a non-free one) is skipped.
    }
  }
  return result;
}

/**
 * Direct link to a Commons image, scaled to `width` px if the original is
 * bigger. Commons stores files under folders named from the MD5 of the file
 * name, so the URL can be worked out without another request.
 */
function commonsImage(file: string, originalWidth: number, width: number) {
  const name = file.replace(/ /g, "_");
  const hash = createHash("md5").update(name).digest("hex");
  const path = `${hash[0]}/${hash.slice(0, 2)}/${encodeURIComponent(name)}`;
  if (originalWidth <= width) return `https://upload.wikimedia.org/wikipedia/commons/${path}`;
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}/${width}px-${encodeURIComponent(name)}`;
}

/**
 * Wikidata gives an item's id or address as its "label" when it has no
 * English name; treat those as unknown.
 */
function named(label: string | undefined) {
  return label && !/^(Q\d+|https?:\/\/)/.test(label) ? label : undefined;
}

/**
 * Works often list several collections, and the Louvre's are departments
 * ("Department of Paintings of the Louvre"). Prefer a museum's own name.
 */
function museumName(labels: string[]) {
  const names = labels.map(named).filter((l): l is string => Boolean(l));
  const museum = names.find((l) => !/^department of/i.test(l)) ?? names[0];
  if (!museum) return "";
  return museum
    .replace(/^department of .+? of (the )?/i, "")
    .replace(/^louvre$/i, "Musée du Louvre");
}

const round = (n: number) => Math.round(n * 10) / 10;
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
