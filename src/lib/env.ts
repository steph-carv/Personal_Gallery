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

/**
 * Tidy a raw value from a dashboard or .env file: trim spaces and newlines and
 * strip one pair of surrounding quotes, so `"personal" ` still counts. Empty
 * values become undefined, so the schema's default or `.optional()` applies.
 */
function clean(value: string | undefined): string | undefined {
  const trimmed = value
    ?.trim()
    .replace(/^(["'])(.*)\1$/, "$2")
    .trim();
  return trimmed ? trimmed : undefined;
}

const raw = {
  NEXT_PUBLIC_APP_MODE: clean(process.env.NEXT_PUBLIC_APP_MODE)?.toLowerCase(),
  NEXT_PUBLIC_SUPABASE_URL: clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
};

const parsed = publicEnvSchema.safeParse(raw);

if (!parsed.success) {
  // Only the non-secret values are echoed back, to make typos easy to spot.
  // (The publishable key is never printed.)
  const received = {
    NEXT_PUBLIC_APP_MODE: raw.NEXT_PUBLIC_APP_MODE,
    NEXT_PUBLIC_SUPABASE_URL: raw.NEXT_PUBLIC_SUPABASE_URL,
  };
  throw new Error(
    `Invalid environment variables. Check .env.local (or your Vercel project's Environment Variables) against .env.example.\n` +
      `${z.prettifyError(parsed.error)}\n` +
      `Received: ${JSON.stringify(received)}`,
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
