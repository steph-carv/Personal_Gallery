import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Where the magic link and Google sign-in come back to. Supabase adds a
 * one-time `code`, which we swap for a session (stored in cookies), then
 * send the visitor home. Errors (like an email not on the allowlist) go
 * back to the login page with a reason.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const failure = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  if (failure) {
    const reason = /database error/i.test(failure) ? "not_invited" : "failed";
    return NextResponse.redirect(new URL(`/login?error=${reason}`, url.origin));
  }
  if (code && isSupabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/", url.origin));
  }
  // Usually an expired link, or one opened in a different browser.
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
