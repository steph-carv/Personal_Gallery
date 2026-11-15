import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { searchCatalogue } from "@/lib/catalogue";
import { CATALOGUE_SOURCES, type CatalogueSource } from "@/lib/catalogue/types";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * GET /api/catalogue/search?q=water+lilies[&source=aic]
 *
 * Searches the museum sources and returns normalised works. Signed-in users
 * only (when accounts are set up), so the museums' APIs can't be hammered
 * through us by strangers.
 */
export async function GET(request: NextRequest) {
  if (isSupabaseConfigured() && !(await getViewer())) {
    return NextResponse.json({ error: "Sign in to search the collections." }, { status: 401 });
  }
  const params = request.nextUrl.searchParams;
  const query = (params.get("q") ?? "").trim().slice(0, 100);
  if (query.length < 2) {
    return NextResponse.json({ error: "Type at least two letters." }, { status: 400 });
  }
  const source = params.get("source");
  const sources: readonly CatalogueSource[] =
    source && (CATALOGUE_SOURCES as readonly string[]).includes(source)
      ? [source as CatalogueSource]
      : CATALOGUE_SOURCES;

  const { results, failed } = await searchCatalogue(query, sources);
  return NextResponse.json({ results, failed });
}
