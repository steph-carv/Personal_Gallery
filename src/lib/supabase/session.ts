import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env, isSupabaseConfigured } from "@/lib/env";

/**
 * Keeps the visitor's Supabase session fresh. Called by src/proxy.ts on
 * every page request: if the access token has expired, this swaps the
 * refresh token for a new one and writes the new cookies onto both the
 * request (so the page being rendered sees them) and the response (so the
 * browser keeps them).
 */
export async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          // Cache headers from Supabase stop a CDN caching a page with
          // someone's fresh session cookie on it.
          Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Checks (and if needed refreshes) the session. Don't put code between
  // creating the client and this call.
  await supabase.auth.getClaims();
  return response;
}
