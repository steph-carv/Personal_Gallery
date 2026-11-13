"use client";

import { useActionState } from "react";
import { sendMagicLink, signInWithGoogle, type AuthFormState } from "@/app/auth/actions";

const initial: AuthFormState = { status: "idle" };

/** Email magic link, or Google. */
export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, send, sending] = useActionState(sendMagicLink, initial);
  const error =
    state.status === "error" ? state.message : state.status === "idle" ? initialError : undefined;

  return (
    <div className="mt-8 flex flex-col gap-6">
      {error && (
        <p
          role="alert"
          className="rounded-sm border border-[#d98a7a]/50 bg-[#5e1d20]/40 p-3 text-sm"
        >
          {error}
        </p>
      )}

      {state.status === "sent" ? (
        <p role="status" className="border-gilt/40 bg-gilt/10 rounded-sm border p-4 text-sm">
          {state.message} Open it in this browser to finish signing in.
        </p>
      ) : (
        <form action={send} className="flex flex-col gap-3">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="border-cream/30 text-cream placeholder:text-cream/40 focus-visible:border-gilt min-h-11 rounded-sm border bg-transparent px-3 focus-visible:outline-none"
            placeholder="you@example.com"
          />
          <button
            type="submit"
            disabled={sending}
            className="bg-gilt text-ink focus-visible:outline-cream min-h-11 rounded-sm px-4 text-sm font-semibold transition hover:bg-[#e6c47a] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
          >
            {sending ? "Sending…" : "Email me a sign-in link"}
          </button>
        </form>
      )}

      <div className="text-cream/50 flex items-center gap-3 text-xs" aria-hidden>
        <span className="bg-cream/20 h-px flex-1" />
        or
        <span className="bg-cream/20 h-px flex-1" />
      </div>

      <form action={signInWithGoogle}>
        <button
          type="submit"
          className="border-cream/30 hover:border-cream focus-visible:outline-gilt min-h-11 w-full rounded-sm border px-4 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Continue with Google
        </button>
      </form>
    </div>
  );
}
