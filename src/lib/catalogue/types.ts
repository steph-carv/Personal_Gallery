import type { Artwork, ArtworkSource } from "@/lib/gallery/types";

/** The museum sources searched in Phase 6 (§8, phase A). */
export const CATALOGUE_SOURCES = ["aic", "met", "wikidata"] as const;
export type CatalogueSource = (typeof CATALOGUE_SOURCES)[number] & ArtworkSource;

export const SOURCE_LABELS: Record<CatalogueSource, string> = {
  aic: "Art Institute of Chicago",
  met: "The Met",
  wikidata: "Wikidata",
};

/**
 * A work found in a museum's open collection, in the same shape as a stored
 * Artwork (minus the database id), plus what the search page needs.
 */
export interface CatalogueWork extends Omit<Artwork, "id"> {
  source: CatalogueSource;
  /** A smaller image for search results. */
  thumbnailUrl: string;
  /**
   * Rough fame: Wikidata sitelinks (how many Wikipedias have a page on it),
   * or a museum's own "highlight" flag. Used for ordering and, in Phase 7,
   * the famous / lesser-known filter.
   */
  popularity: number;
}

/** True if a creator who died in `deathYear` is out of copyright in the UK/EU (life + 70). */
export function outOfCopyright(deathYear: number | null, madeYear: number | null) {
  const cutoff = new Date().getFullYear() - 71;
  if (deathYear !== null) return deathYear <= cutoff;
  // Unknown or anonymous artist: only clearly old works.
  return madeYear !== null && madeYear <= 1850;
}

/** Kinds of work that hang on a wall. Vessels, furniture and so on are left out. */
export const WALL_ART =
  /painting|drawing|print|photograph|watercolou?r|pastel|gouache|etching|engraving|lithograph|woodblock/i;

/** Lower-case, accents and special letters folded (ø → o, æ → ae), for matching. */
export function fold(text: string) {
  return text
    .toLowerCase()
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Strip HTML tags and tidy whitespace (museum descriptions come as HTML). */
export function plainText(html: string | null | undefined): string | undefined {
  if (!html) return undefined;
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  return text || undefined;
}
