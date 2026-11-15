import "server-only";
import { getAicWork, searchAic } from "./aic";
import { getMetWork, searchMet } from "./met";
import { CATALOGUE_SOURCES, fold, type CatalogueSource, type CatalogueWork } from "./types";
import { getWikidataWork, searchWikidata } from "./wikidata";

/**
 * One search across every museum source (HANDOVER.md §8, phase A). Each
 * source's results are cached for a day, a source that fails doesn't sink
 * the others, and the same work found twice is shown once.
 */
export async function searchCatalogue(
  query: string,
  sources: readonly CatalogueSource[] = CATALOGUE_SOURCES,
): Promise<{ results: CatalogueWork[]; failed: CatalogueSource[] }> {
  const search = { aic: searchAic, met: searchMet, wikidata: searchWikidata };
  const settled = await Promise.allSettled(sources.map((s) => search[s](query)));
  const failed: CatalogueSource[] = [];
  const lists = settled.map((outcome, i) => {
    if (outcome.status === "fulfilled") return outcome.value;
    console.error(`Catalogue search failed for ${sources[i]}`, outcome.reason);
    failed.push(sources[i]);
    return [];
  });

  // Interleave the sources so equally good results show a mix, then drop repeats.
  const seen = new Set<string>();
  const mixed: CatalogueWork[] = [];
  for (let i = 0; i < Math.max(0, ...lists.map((l) => l.length)); i++) {
    for (const list of lists) {
      const work = list[i];
      if (!work) continue;
      const key = [work.title, work.artist, work.holder].map(normalise).join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      mixed.push(work);
    }
  }

  // Museums also match words in long descriptions, so put works whose artist
  // or title contains the search words first (then the better-known ones).
  const words = normalise(query)
    .split(" ")
    .filter((w) => w.length > 1);
  const relevance = (w: CatalogueWork) => {
    const artist = normalise(w.artist);
    const title = normalise(w.title);
    return words.reduce(
      (score, word) => score + (artist.includes(word) ? 3 : 0) + (title.includes(word) ? 2 : 0),
      0,
    );
  };
  const results = mixed
    .map((work, order) => ({ work, order, score: relevance(work) }))
    .sort((a, b) => b.score - a.score || b.work.popularity - a.work.popularity || a.order - b.order)
    .map(({ work }) => work);
  return { results, failed };
}

/** Look one work up again at its source (used before hanging it). */
export async function getCatalogueWork(
  source: string,
  sourceId: string,
): Promise<CatalogueWork | null> {
  switch (source) {
    case "aic":
      return getAicWork(sourceId);
    case "met":
      return getMetWork(sourceId);
    case "wikidata":
      return getWikidataWork(sourceId);
    default:
      return null;
  }
}

const normalise = (s: string) =>
  fold(s)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an)\b/g, "")
    .trim();
