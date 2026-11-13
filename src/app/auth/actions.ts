"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export interface AuthFormState {
  status: "idle" | "sent" | "error";
  message?: string;
}

/** The site's own origin, for links in emails and OAuth redirects. */
async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return h.get("origin") ?? `${protocol}://${host}`;
}

const emailSchema = z.email("Enter a valid email address.");

/** Email a one-time sign-in link. New, allowlisted emails get an account. */
export async function sendMagicLink(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) {
    return { status: "error", message: "Sign-in isn't set up yet." };
  }
  const parsed = emailSchema.safeParse(
    String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
  );
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: `${await origin()}/auth/callback` },
  });
  if (error) return { status: "error", message: friendlyAuthError(error.message) };
  return { status: "sent", message: `Check ${parsed.data} for a sign-in link.` };
}

/** Start "Continue with Google": Supabase sends us to Google and back. */
export async function signInWithGoogle() {
  if (!isSupabaseConfigured()) redirect("/login?error=not_configured");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/callback` },
  });
  if (error || !data.url)
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "google")}`);
  redirect(data.url);
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

/**
 * Supabase's messages are written for developers. The sign-up trigger
 * refuses emails that aren't on the allowlist, which Supabase reports as a
 * database error.
 */
function friendlyAuthError(message: string) {
  if (/database error|invite-only|not_allowlisted/i.test(message)) {
    return "Salon is invite-only for now, and that email isn't on the guest list.";
  }
  if (/rate limit|too many/i.test(message)) {
    return "Too many sign-in emails just now. Please wait a minute and try again.";
  }
  return "Something went wrong signing you in. Please try again.";
}
