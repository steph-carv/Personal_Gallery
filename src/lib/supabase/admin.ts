import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

/**
 * A Supabase client with the secret key. It skips row-level security, so
 * it's only for writes no user may make themselves, like adding a work to
 * the shared catalogue after the server has checked it at the museum.
 * Never use it for anything a request could steer to someone else's data.
 */
export function createAdminClient() {
  const key = serverEnv.SUPABASE_SECRET_KEY;
  if (!key) return null;
  const { url } = getSupabaseEnv();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
