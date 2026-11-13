import { z } from "zod";

/**
 * Public environment variables, validated once at start-up.
 *
 * Next.js only inlines `NEXT_PUBLIC_*` values into browser code when they are
 * written out in full (`process.env.NEXT_PUBLIC_X`), so each one is listed by
 * name below rather than passing `process.env` in directly.
 *
 * Supabase values are optional until Phase 5 (auth + data model). Until then
 * the app runs without a Supabase project; `getSupabaseEnv()` throws a clear
 * error if something tries to use Supabase before it's configured.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_MODE: z.enum(["personal", "public"]).default("personal"),
  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
});

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_APP_MODE: process.env.NEXT_PUBLIC_APP_MODE || undefined,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || undefined,
});

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables. Check .env.local against .env.example.\n${z.prettifyError(parsed.error)}`,
  );
}

export const env = parsed.data;

export function isSupabaseConfigured(): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function getSupabaseEnv(): { url: string; publishableKey: string } {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "Supabase isn't configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local (see README).",
    );
  }
  return { url, publishableKey };
}
