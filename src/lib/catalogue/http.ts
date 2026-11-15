import "server-only";
import { apiUserAgent } from "@/lib/env.server";

/**
 * GET a JSON API, introducing ourselves (User-Agent, plus any extra headers a
 * museum asks for) and giving up after a few seconds so one slow museum
 * can't hold up a search.
 */
export async function getJson<T>(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = 9000,
): Promise<T> {
  const response = await fetch(url, {
    headers: { "User-Agent": apiUserAgent(), Accept: "application/json", ...headers },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`${new URL(url).host} answered ${response.status}`);
  return (await response.json()) as T;
}
