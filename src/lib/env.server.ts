import "server-only";
import { z } from "zod";

/**
 * Server-only settings. Unlike the NEXT_PUBLIC_ ones in env.ts, these are
 * never sent to the browser.
 *
 * - SUPABASE_SECRET_KEY: lets the server add works to the shared catalogue
 *   (Phase 6). It skips row-level security, so it must stay secret.
 * - SALON_CONTACT_EMAIL: sent with requests to museum APIs that ask
 *   automated clients to say who they are (Wikimedia, the Art Institute).
 */
const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  SALON_CONTACT_EMAIL: z.email().optional(),
});

const clean = (value: string | undefined) =>
  value
    ?.trim()
    .replace(/^(["'])(.*)\1$/, "$2")
    .trim() || undefined;

const parsed = serverEnvSchema.safeParse({
  SUPABASE_SECRET_KEY: clean(process.env.SUPABASE_SECRET_KEY),
  SALON_CONTACT_EMAIL: clean(process.env.SALON_CONTACT_EMAIL),
});
if (!parsed.success) {
  throw new Error(`Invalid server environment variables.\n${z.prettifyError(parsed.error)}`);
}

export const serverEnv = parsed.data;

/**
 * How Salon introduces itself to museum APIs. Wikimedia's policy asks for a
 * way to get in touch, so problems can be raised before anything is blocked.
 */
export function apiUserAgent() {
  const contact = serverEnv.SALON_CONTACT_EMAIL ? `; ${serverEnv.SALON_CONTACT_EMAIL}` : "";
  return `Salon/0.1 (personal gallery; https://github.com/steph-carv/Personal_Gallery${contact})`;
}
