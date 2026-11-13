import "server-only";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export interface Viewer {
  id: string;
  email: string | null;
  username: string;
  onboarded: boolean;
}

/**
 * The signed-in visitor, or null. Cached for the length of one request, so
 * calling it from several components costs one lookup. It reads cookies, so
 * (with Cache Components) callers must be inside <Suspense>.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  // getClaims() verifies the session token's signature, unlike getSession().
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, onboarded")
    .eq("id", claims.sub)
    .maybeSingle();
  if (!profile) return null;

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    username: profile.username as string,
    onboarded: Boolean(profile.onboarded),
  };
});

/** Where a signed-in visitor belongs: their gallery, or the welcome step first. */
export function homeFor(viewer: Viewer) {
  return viewer.onboarded ? `/g/${viewer.username}` : "/welcome";
}
