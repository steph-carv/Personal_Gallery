import "server-only";
import { apiUserAgent } from "@/lib/env.server";

/**
 * GET a JSON API, introducing ourselves (User-Agent, plus any extra headers a
 * museum asks for) and giving up after a few seconds so one slow museum
 * can't hold up a search. A "too many requests" or server error gets one
 * polite retry, after the wait the server asks for (at most 3 seconds).
 */
export async function getJson<T>(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = 9000,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, {
      headers: { "User-Agent": apiUserAgent(), Accept: "application/json", ...headers },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.ok) return (await response.json()) as T;
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt > 0) {
      throw new Error(`${new URL(url).host} answered ${response.status}`);
    }
    const wait = Math.min(3, Number(response.headers.get("retry-after")) || 1.5);
    await new Promise((resolve) => setTimeout(resolve, wait * 1000));
  }
}
